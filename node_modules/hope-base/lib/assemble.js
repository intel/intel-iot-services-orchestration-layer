/******************************************************************************
Copyright (c) 2016, Intel Corporation

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Intel Corporation nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*****************************************************************************/
/**
 * Assemble 
 *
 * Given a JSON like plain object and it would go through it and handle these 
 * started with $. NOTE: all fields start with "$" os reserved, so they are 
 * either be replaced or be ignored in assembled output
 * 
 * e.g.
 * Create corresponding MyClazz object
 * {
 *   $type: "MyClazz",
 *   $params: [...] // if only one non-array item, e.g. "x", it would be converted
 *                  // to ["x"]
 * }
 *
 * MyClazz should already be registered by add_factory("MyClazz", the_factory_func)
 * the_factory_func is normally MyClazz.create but could be others as well, and
 * it has the signature create.apply({}, params) 
 *
 * The create function could be async, i.e. returns a promise. If so, 
 * it would wait for it to be fulfilled.
 *
 * In addtion to above, it can also reference to any object in preceding to it
 * e.g. 
 * {
 *   p1: {
 *     $type: "MyClazz",
 *     $params: [...],
 *     additional_field: 123
 *   },
 *   p2: "property 2",
 *   p3: {
 *     c1: {
 *       $type: "MyClazz",
 *       $params: {
 *         ref: "$p1"     // This points to p1
 *       }
 *     },
 *     c2: ["property 3", "$c3"],  // 2nd element points to c3
 *     p1: "inner p1",
 *     c3: "$c1",         // This points to the c1 
 *     c6: {
 *       pp: "$p1"          // This points to inner p1
 *     }
 *   },
 *   p8: "$external_obj"  // this tries to ref the obj in 2nd arg of assemble$()
 * }
 *
 * To use the assemble, one needs to create an assembler first by invoking 
 * create({initial factories}), and then may add_factory / remove_factory,
 * and invoke assemble$({the_plain_json}, {the_global_objects}) to get the object
 *
 * By default, there is an assembler already created, and could be refereced
 * as require("hope-base").assemble.default
 * 
 * @module  base/assemble
 */

var log = require("./log").for_category("base/assemble");
var check = require("./check").check;
var check_warn = require("./check").check_warn;
var _ = require("lodash");

function Assembler(factories) {
  this.factories = _.cloneDeep(factories) || {};
  _.forOwn(factories, function(v, k) {
    check(_.isFunction(v), "base/assemble", "Factory of", k, "should be a function", v);
  });
}

Assembler.prototype.add_factory = function(name, factory) {
  check(_.isFunction(factory), "base/assemble", "Factory of", name, "should be a function", factory);
  check_warn(!this.factories[name], "base/assemble", "Factory of", name, "will be overwritten");
  this.factories[name] = factory;
  return this;
};

Assembler.prototype.add_factories = function(factories) {
  var self = this;
  _.forOwn(factories, function(v, k) {
    self.add_factory(k, v);
  });
  return this;
};


Assembler.prototype.remove_factory = function(name) {
  delete this.factories[name];
  return this;
};



// It adds the $_order for an object based on $_deps of its direct children.
// the $_order specifies which child should be created first because other 
// children may depend on it. It throws an error if the $_deps has loop thus
// failed to get to an order
// 
// It uses Kahn algorithm 
function topological_sort(o) {
  var L = [],   // result
      S = [],   // nodes with no incoming edges
      N = {},   // all nodes, and it records to (this as target) and from (this as source)
      count = 0;// number of edges
  // setup the n first
  _.forOwn(o, function(v, k) {
    if (k[0] === "$") {
      return;
    }
    N[k] = {from: {}, to: {}};
  });
  _.forOwn(o, function(v, k) {
    if (k[0] === "$" || !v.$_deps) {
      return;
    }
    _.forOwn(v.$_deps, function(_v, d) {    // edge: k --> d
      N[k].to[d] = true;
      N[d].from[k] = true;
      count++;
    });
  });
  // init s
  _.forOwn(N, function(v, k) {
    if (!_.size(v.from)) {
      S.push(k);
    }
  });

  // run
  var n;
  while (S.length) {
    n = S.shift();
    L.unshift(n);
    _.forOwn(N[n].to, function(_v, m) {   // eslint-disable-line
      delete N[n].to[m];
      delete N[m].from[n];
      count--;
      if (!_.size(N[m].from)) {
        S.push(m);
      }
    });
  } 

  // return
  check(!count, "base/assemble", "references have at least one cycle", o);
  o.$_order = L;
}

// for each object, add a $_parent to reference its parent
// and a $_deps (an hash) to indicate which *siblings* it depends
// and a $_order (an array) to indicate the order to assemble its fields 
// (deduced from children's $_deps)
// and replace string $xxx to an object {$_ref: xxx} (itself has $_deps etc.)
// 
// It would throw an Error if cannot get the correct order (i.e. circular ref)
// 
// json should be an object
function build_dependency(json) {
  json.$_deps = json.$_deps || {};

  var p, c;
  // NOTE: this overwrites array as well, i.e. k as 0, 1, ...
  _.forOwn(json, function(v, k) {
    if (k[0] === "$" && k !== "$params") {
      return;
    }
    c = v;
    if (_.isString(v)) {
      if (v[0] === "$") {
        v = _.trimStart(v, "$");
        p = json;
        c = json[k] = {
          $_ref: v,
          $_parent: json
        };
        // v === k for scenario like { test: "$test" } which actually tries to
        // reference the test at parent rather than itself
        if (v === k) {
          c = p;
          p = p.$_parent;
        }
        while (p && !p[v]) {
          c = p;
          p = p.$_parent;
        }
        // c & p[v] are siblings
        // if cannot find, it would refer to external objects
        if (p && p[v]) {
          c.$_deps = c.$_deps || {};
          c.$_deps[v] = true;
        }
      }
      return;
    }
    if (_.isObject(v)) {
      v.$_parent = json;
      build_dependency(v);
    }
  });

  topological_sort(json);
}

// for debug purpose
function dump_dependency(json, field_name, indent) {
  indent = indent || "";
  field_name = field_name || "<ROOT>";
  console.log(indent, field_name, "  -->  ", Object.keys(json.$_deps || {}),
    json.$_order ? "\t <ORDER> " + json.$_order : "");

  indent += "    ";
  var i;
  if (_.isArray(json)) {
    for (i = 0; i < json.length; i++) {
      dump_dependency(json[i], "[" + i + "]", indent);
    }
    return;
  }
  _.forOwn(json, function(v, k) {
    if (_.isString(k) && k[0] === "$" && k !== "$params") {
      return;
    }
    if (_.isObject(v)) {
      dump_dependency(v, k, indent);
    }
  });
}



// create objects based on the $_order
function assemble$(factories, value, parent_chain, external_objs) {
  parent_chain = parent_chain || [];
  // $_ref string has been converted to object already
  if (!_.isObject(value)) {
    return Promise.resolve(value);
  }
  var o, ret_p = Promise.resolve({});
  if (_.isArray(value)) {
    o = [];
    value.forEach(function(v) {
      ret_p = ret_p.then(function() {
        return assemble$(factories, v, parent_chain, external_objs);
      }).then(function(_o) {
        o.push(_o);
        return o;
      });
    });
    return ret_p;
  }


  var ref = value.$_ref, p, i;
  if (ref) {
    for (i = 0; i < parent_chain.length; i++) {
      p = parent_chain[i];
      if (p[ref]) {
        break;
      }
    }
    if (p && p[ref]) {
      return Promise.resolve(p[ref]);
    } else if (external_objs[ref]) {
      return Promise.resolve(external_objs[ref]);
    } else {
      check(false, "base/assemble", "Cannot find the refence: $" + ref);
    }
  }

  var create;
  if (value.$type) {
    create = check(factories[value.$type], "base/assemble", 
      "Factory for", value.$type, "hasn't been added into assembler");
    // NOTE that $params itself may need assemble
    ret_p = assemble$(factories, value.$params, parent_chain, external_objs)
      .then(function(params) {
        if (_.isUndefined(params)) {
          params = [];
        }
        if (!_.isArray(params)) {
          params = [params];
        }
        return create.apply({}, params);
      });
  }

  return ret_p.then(function(obj) {
    parent_chain.unshift(obj);
    var _interal_p = Promise.resolve();
    value.$_order.forEach(function(k) {
      _interal_p = _interal_p.then(function() {
        return assemble$(factories, value[k], parent_chain, external_objs);
      }).then(function(_o) {
        obj[k] = _o;
      });
    });
    return _interal_p.then(function() {
      parent_chain.shift();

      return obj;
    });
  });

}


/**
 * Async function to perform the assemble
 * @param  {Object} json          
 * @param  {Object} external_objs A hash table for referencing names not defined in json
 * @return {Object}               
 */
Assembler.prototype.assemble$ = function(json, external_objs) {
  json = _.cloneDeep(json);
  external_objs = external_objs || {};
  check(_.isObject(json), "base/assemble", "It should be a plain object for assemble");
  check(_.isObject(external_objs), "base/assemble", 
    "It should be a object for external_objs");
  build_dependency(json);
  //dump_dependency(json);
  return assemble$(this.factories, json, [], external_objs);
};


exports.create = function(factories) {
  return new Assembler(factories);
};

exports.default = new Assembler();