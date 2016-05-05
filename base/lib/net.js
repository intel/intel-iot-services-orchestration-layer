/******************************************************************************
Copyright (c) 2015, Intel Corporation

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
 * @module  base/net
 */

var check = require("./check").check;
var check_warn = require("./check").check_warn;
var _ = require("lodash");

var log = require("./log").for_category("base/net");
var to_string = require("./to_string").to_string;

// path should start with / and not end with /
function _normalize_path(p) {
  if (p[0] !== "/") {
    p = "/" + p;
  }
  if (p.length > 0 && p[p.length - 1] === "/") {
    p = p.slice(0, -1);
  }
  return p;
}

function Restler(web_app, root_path, config) {
  check(_.isObject(web_app), "base/net/reslter", "web_app should be a web app");
  this.app = web_app;
  if (root_path) {
    root_path = _normalize_path(root_path);
  }
  this.root_path = root_path || "";
  this.config = config || {};
}

function _create_handler(method, p, f) {
  return function(req, res) {
    log("restler", method, p, req.body);
    Promise.resolve(f(req.body)).then(function(r) {
      res.send(r);
    }).catch(function(err) {
      log.error("restler_handler", "Failed to handle", req.body, "due to", err);
      res.status(500).send(to_string(err));
    }).catch(function(err) {
      log.error("restler_handler", "Failed to handle", req.body, "due to", err);
    });
  };
}

Restler.prototype.get = function(p, func) {
  p = _normalize_path(p);
  this.app.get(this.root_path + p, _create_handler("GET", p, func));
  return this;
};

Restler.prototype.post = function(p, func) {
  p = _normalize_path(p);
  this.app.post(this.root_path + p, _create_handler("POST", p, func));
  return this;
};

Restler.prototype.put = function(p, func) {
  p = _normalize_path(p);
  this.app.put(this.root_path + p, _create_handler("PUT", p, func));
  return this;
};

Restler.prototype.delete = function(p, func) {
  p = _normalize_path(p);
  this.app.delete(this.root_path + p, _create_handler("DELETE", p, func));
  return this;
};

/**
 * Expose Restful Apis for an object, e.g. restify_obj("post", "my_obj", obj, ["f1", "f2"])
 * would result in post("my_obj/f1", obj.f1.bind(obj) ) etc.
 * @param  {String} op      get/post/put/delete
 * @param  {String} p      the starting path
 * @param  {Object} obj     an object
 * @param  {Array} methods methods of the object to expose
 */
Restler.prototype.restify_obj = function(op, p, obj, methods) {
  var op_f = this[op];
  check(_.isFunction(op_f), "base/net/restler", "Cannot find op to restify", op);
  op_f = op_f.bind(this);
  p = _normalize_path(p);
  methods.forEach(function(k) {
    var f = obj[k];
    check(_.isFunction(f), "base/net/restler", "Not a func in obj", k, obj);
    op_f(p + "/" + k, f.bind(obj));
  });
  return this;
};

/**
 * Create a helper to define Restful APIs
 * @param  {Express} web_app   an web app from express with get/post etc.
 * @param  {String} root_path the root path for urls
 * @param  {Object} config    
 * @return {Object}           A Restler
 */
exports.create_restler = function(web_app, root_path, config) {
  return new Restler(web_app, root_path, config);
};



function APIHandler(web_app, url_path, config) {
  check(_.isObject(web_app), "base/net/APIHandler", "web_app should be a web app");
  this.app = web_app;
  if (url_path) {
    url_path = _normalize_path(url_path);
  }
  this.url_path = url_path || "/";
  this.config = config || {};
  
  this.methods = {};
  var self = this;
  web_app.post(this.url_path, function(req, res) {
    var data = req.body || {};
    var f = self.methods[data.api];
    if (!_.isFunction(f)) {
      log.error("api invoked", "No handler for", data, "in", self.methods);
      res.status(500).send("Failed to find handler for " + to_string(data));
      return;
    }
    log("api invoked", data);
    var params = data.params || [];
    if (!_.isArray(params)) {
      log.error("api invoked", "Error caught: params aren't an array");
      res.status(500).send("Error caught: params aren't an array");
      return;
    }
    params.push(req, res);
    Promise.resolve(f.apply({}, params)).then(function(r) {
      if (_.isUndefined(r)) {
        r = {};
      }
      res.send(r);
    }).catch(function(err) {
      log.error("api invoked", "Error caught:", err);
      res.status(500).send(to_string(err));
    }).catch(function(err) {
      log.error("api_handler", "Failed to handle", data, "due to", err);
    });
  });
}

APIHandler.prototype.define_api = function(name, func) {
  check_warn(!this.methods[name], "base/net/api_handler", "API", name, "already defined");
  check(_.isFunction(func), "base/net/api_handler", "api isn't a function", func);
  log("define api", name);
  this.methods[name] = func;
  return this;
};

/**
 * Expose Apis for an object, e.g. define_apis_for_obj("my_obj", obj, ["f1", "f2"])
 * would result in define_api("my_obj.f1", obj.f1.bind(obj) ) etc.
 * @param  {String} name   to form name.func
 * @param  {Object} obj     an object
 * @param  {Array} methods methods of the object to expose
 */
 APIHandler.prototype.define_apis_for_obj = function(name, obj, methods) {
  var self = this;
  methods.forEach(function(k) {
    var f = obj[k];
    check(_.isFunction(f), "base/net/api_handler", "Not a func in obj", k, obj);
    self.define_api(name + "." + k, f.bind(obj));
  });
  return this;
};


/**
 * APIHandler is another way of Restful. While restler employs a url for
 * each method. The APIHandler only uses one url, and the method to be 
 * invoked it directly encoded in req.body of a POST. The POST message
 * has the format of {
 *   api: the api to invoke
 *   params: ... the paramters
 * }
 * 
 * @param {Express} web_app
 * @param {String} url_path 
 * @param {Object} config   
 */
exports.create_api_handler = function(web_app, url_path, config) {
  return new APIHandler(web_app, url_path, config);
};

