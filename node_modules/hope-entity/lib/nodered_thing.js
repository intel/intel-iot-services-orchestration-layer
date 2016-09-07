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
 * NodeRed Thing Module
 * handle nodered/wio-link thing and service
 * @module entity/nodered_thing
 */

var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/nodered_thing");
//var log = console.log;
var check = B.check;
var T = require("./thing");
var Spec = require("./spec");
var path = require("path");
var fs = require("fs");

function read_locale(name, p) {
  if (!global.nodered_assets) {
    return;
  }
  for (var i = 2; i < arguments.length; i++) {
    p = path.join(p, arguments[i]);
  }
  if (B.fs.file_exists(p)) {
    try {
      var json = B.fs.read_json(p);
      global.nodered_assets.locales[name] = json;
    } catch(e) {
      console.log(e);
    }
  }
}

/**
 * 0, create the specbundle_obj
 * 1, create thing_obj
 * 2, find all xxx.js in the bundle TODO: the search policy should change later
 * 3, find the corresponding xxx.html
 * 4, call process_nodered_service, which will add spec into specbundle, and add
 * service into thing
 * 5, store the whole specbundle with specs
 * 6, store the whole thing with services
 * @param  {String} bundle_path the nodered bundle path
 * @param  {Object} specbundle  the specbundle id and name
 * @param  {String} hub_id
 * @param  {Object} em
 * @param  {Array} changed_list record of the changed items in the entity store
 * @return {Promise}
 */
exports.load_nodered_service$ = function(bundle_path, specbundle, hub_id, em, changed_list)
{
  log("load nodered_service", bundle_path, "with specbundle", specbundle);
  var specbundle_obj = {
    id: specbundle.id,
    name: specbundle.name,
    specs: [],
    path: bundle_path
  };
  var thing_obj =  {
    name: "nodered",
    id: "nodered@" + hub_id,
    services: [],
    path: bundle_path,
    hub: hub_id,
    type: "nodered_thing",
    is_builtin : true,
    is_connect : true
  };
  var nr_js = B.fs.find_files_no_recur(bundle_path, "*.js");// a/b/c.js
  nr_js.forEach(function(item) {
    var name = B.path.base_without_ext(item); // a/b/c.js -> c
    var nr_html =  path.join(path.dirname(item), name + ".html"); // a/b/c.html
    check(B.fs.file_exists(nr_html), "load_nodered_service", "lack of .html", nr_html);
    process_nodered_service(item, nr_html, thing_obj, specbundle_obj);
  });

  read_locale("editor", bundle_path, "locales", "editor.json");
  read_locale("node-red", bundle_path, "locales", "messages.json");

  var noderednpms = B.fs.ls(bundle_path).dirs();
  noderednpms.items.forEach(function(item) {
    if (B.fs.file_exists(B.path.join(item.path, "package.json"))) {
      var json = require(B.path.join(item.path, "package.json"));
      if (!_.isUndefined(json["node-red"]) && !_.isUndefined(json["node-red"]["nodes"])) {
        log("find a npm nodered module", B.path.join(item.path, "package.json"));
        _.forEach(json["node-red"]["nodes"], function(v, k) {
          var jspath = B.path.resolve(item.path, v);
          var name = B.path.base_without_ext(jspath);
          var htmlpath =  path.join(path.dirname(jspath), name + ".html"); // a/b/c.html
          check(B.fs.file_exists(htmlpath), "load_nodered_service", "lack of .html", htmlpath);
          process_nodered_service(jspath, htmlpath, thing_obj, specbundle_obj, k);

          read_locale(k, path.dirname(jspath), "locales", "en-US", name + ".json");
        });
      }
    }
  });
  return Spec.add_specbundle_with_specs$(specbundle_obj, em, changed_list)
  .then(function() {
    return T.add_thing_with_services$(thing_obj, em, changed_list);
  });
};


/**
 * one pair of xxx.js/html may contains multiple services, ther can be distinguished
 * by the typename in the RED.nodes.registerType in html.
 */
function process_nodered_service(nr_js, nr_html, thing_obj, specbundle_obj, ns) {
  log("create nodered service:", nr_js, " ", nr_html);
  var specs = create_spec_from_nr_html(nr_html, ns);
  log("it contains ", specs.length, " service/spec in the file");
  specs.forEach(function(spec) {
    spec.specbundle = specbundle_obj.id;
    log("nodered spec:", spec);
    specbundle_obj.specs.push(spec);
    var service = {
      name: spec.name,
      id: spec.id.replace("_noderedspec", "_noderedservice"),
      path: nr_js,
      is_connect : true,
      own_spec : false,
      type : "nodered_service",
      thing : thing_obj.id,
      spec : spec.id
    };
    log("nodered thing:", service);
    thing_obj.services.push(service);
  });
}


function create_spec_from_nr_html(nr_html, ns) {
  var cheerio = require("cheerio");

  var specs = [];
  var h = fs.readFileSync(nr_html, {encoding:"utf8"});
  var $ = cheerio.load(h);
  var jscode = $('script[type="text/javascript"]').text();
  var RED = {
    nodes:{}
  };

  if (global.nodered_assets) {
    var ce = h.indexOf("-->"); // remove copyright comment
    global.nodered_assets.nodes.push(ce > 0 ? h.substr(ce + 3) : h);
  }

  RED.validators = {
    number: function(){return function(v) { return v!=='' && !isNaN(v);}},
    regex: function(re){return function(v) { return re.test(v);}}
  };
  RED.nodes.registerType = function(name, obj) {
    var spec = {
      in:{
        ports:[]
      },
      out:{
        ports:[]
      },
      config:[]
    };
    spec.path = nr_html;
    spec.name = name;
    spec.id = name + "_noderedspec";
    //the nodered specific property in the spec: type and category
    //we can find the config node if it category = "config"
    spec.nr = {
      type: name,
      category: obj.category
    };

    if (ns && global.nodered_assets) {
      global.nodered_assets.ns[name] = ns;
    }

    if(obj.inputs == 1) {
      spec.in.ports = [{name:"in1"}];
    }
    var i = 0;
    for (i = 0; i < obj.outputs; i++) {
      spec.out.ports.push({name:"out" + (i + 1)});
    }
    _.forEach(obj.defaults, function(v, k) {
      var config = {};
      config.name = k;
      config.default = v.value;
      config.required = !!v.required;
      if(v.type) { // it point to a config node id
        config.ref_config_node = true;
      }
      if (k == "outputs") { //the output can be added
        spec.out.allow_to_add = true;
      } else {
        spec.config.push(config);
      }
    });

    // put the spec.nr into CONFIG as "_nr"
    // so that when the service is running, we can fetch the nr peoperty by CONFIG._nr
    // in the xxx.js (start, resume, kernel, ...)
    var config_nr = {};
    config_nr.name = "_nr";
    config_nr.default = spec.nr;
    config_nr.type = "Object";
    config_nr.required = true;
    spec.config.push(config_nr);

    specs.push(spec);
  };
  eval(jscode);
  return specs;
}