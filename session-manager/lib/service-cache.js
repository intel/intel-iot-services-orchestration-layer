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
 * Service-Cache Module
 * it handles the operations of service-cache and service-obj (init, destroy)
 * @module session-manager/service-cache
 */

var _ = require("lodash");
var B = require("hope-base");
var check = B.check;
var sb = require("./sandbox");
var fs = require("fs");
var vm = require("vm");
var log = B.log.for_category("sm/service");

exports.create_service_cache = function(base_store)
{
  return new ServiceCache(base_store);
};

function ServiceCache(base_store) {
  this.type = "ServiceCache";
  this.db = {};
  this.base_store = base_store;
  this.shared = {}; // hub-shared, because a hub usually only have one em/service-cache
}

ServiceCache.prototype.base = function(store) {
  check(store.type === "service-store", "service-cache", "invalid base-store", store);
  this.base_store = store;
};

ServiceCache.prototype.set = function(key, value) {
  this.db[key] = value;
  return this;
};

ServiceCache.prototype.has = function(key) {
  return !_.isUndefined(this.db[key]);
};

ServiceCache.prototype.get_cache = function(key) {
  return this.db[key];
};

ServiceCache.prototype.delete = function(key) {
  delete this.db[key];
  return this;
};
/**
 * get the service_cache_obj from the cache
 * if not in the cache, sync from base store
 * @param  {number||string} key 
 * @return {Promise}     resolve: service_cache_obj
 */
ServiceCache.prototype.get$ = function(key) {
  var self = this;
  if (this.has(key)) {
    return Promise.resolve(this.db[key]);
  }
  return self.sync_from_base$(key);
};
/**
 * get the object in the base_store, and put into the cache.
 * 1, get the original object
 * 2, create service_cache_obj
 * 3, save into the cache.
 * @param  {number||string} key 
 * @return {Promise}       resolve: service_cache_obj
 */
ServiceCache.prototype.sync_from_base$ = function(key) {
  var self = this;
  return this.base_store.get$(key)
  .then(function(service) {
    check(!_.isUndefined(service), "service-cache",
     "cannot find key in servicestore when sync_from_base", key, this.base_store);
    var service_cache_obj = self.create_servcie_cache_obj(service);
    self.set(service_cache_obj.id, service_cache_obj);
    return service_cache_obj;
  });
};

/**
 * sync_from_base with init and destroy
 * 1, destroy if inited
 * 2, sync
 * 3, init
 * @param  {number||string} key 
 * @return {Promise}       resolve: service_cache_obj
 */
ServiceCache.prototype.sync_from_base_with_init_destroy$ = function(key) {
  var self = this;
  function prepare_destroy$(c_obj, k) {
    if (c_obj.has(k) && c_obj.get_cache(k).is_inited) {
      return c_obj.destroy_service$(k);
    }
    else {
      return Promise.resolve("not init yet");
    }
  }

  return prepare_destroy$(self, key)
  .then(function () {
    return self.sync_from_base$(key);
  })
  .then(function (sc_object) {
    return self.init_service$(sc_object)
    .then(function() {
      return sc_object;
    });
  });
};

/**
 * run service's init code.
 * @param  {Object} service_cache_obj 
 * @return {Promise}                   resolve: done value
 *                                     reject: fail value or exception
 */
ServiceCache.prototype.init_service$ = function(service_cache_obj) {
  check(!service_cache_obj.is_inited, "service-cache", "re-init", service_cache_obj);
  log("service_init", service_cache_obj);
  var sandbox = sb.create_service_sandbox(service_cache_obj);
  return new Promise(function(resolve, reject) {
    sandbox.done = function(value)
    {
      log("init done", value);
      sandbox.fail = B.type.func_noop;
      sandbox.done = B.type.func_noop;
      service_cache_obj.is_inited = true;
      resolve(value);
    };

    sandbox.fail = function(value)
    {
      log.warn("init fail", value);
      sandbox.done = B.type.func_noop;
      sandbox.fail = B.type.func_noop;
      reject(value);
    };

    sandbox.throwEXC = function(value)
    {
      log.warn("init exception", value);
      sandbox.fail(value);
    };
    var f = service_cache_obj.service_init_s.runInNewContext(sandbox);
    try {
      f(service_cache_obj.config);
    } catch(e) {
      log.warn("init exception", e);
      sandbox.fail(e);
    }
  });
};

/**
 * run service's destroy code.
 * @param  {Object} service_cache_obj 
 * @return {Promise}                   resolve: done value
 *                                     reject: fail value or exception
 */
ServiceCache.prototype.destroy_service$ = function(service_cache_obj) {
  check(service_cache_obj.is_inited, "service-cache", "not inited before destroy", service_cache_obj);
  log("service_destroy", service_cache_obj);
  var sandbox = sb.create_service_sandbox(service_cache_obj);
  return new Promise(function(resolve, reject) {
    sandbox.done = function(value)
    {
      log("destroy done", value);
      sandbox.fail = B.type.func_noop;
      sandbox.done = B.type.func_noop;
      service_cache_obj.is_inited = false;
      resolve(value);
    };

    sandbox.fail = function(value)
    {
      log.warn("destroy fail", value);
      sandbox.done = B.type.func_noop;
      sandbox.fail = B.type.func_noop;
      reject(value);
    };

    var f = service_cache_obj.service_destroy_s.runInNewContext(sandbox);
    try {
      f(service_cache_obj.config);
    } catch(e) {
      log.warn("destroy exception", e);
      sandbox.fail(e);
    }
  });
};
/**
 * create a service_cache_obj
 * 1, set the items in service_obj
 * 2, set service shared obj
 * 3, set hub shared obj
 * 4, set methods' scripts
 * 5, set the is_inited as false
 * @param  {Object} service_obj original service object in store
 * @return {Object}             service_cache_obj
 */
ServiceCache.prototype.create_servcie_cache_obj = function(service_obj) {
  var service_cache_obj = {};
  service_cache_obj = _.cloneDeep(service_obj);// set the items in service_obj
  service_cache_obj.shared = {};//2, set the service shared object
  service_cache_obj.hub_shared = this.shared;//3, set the hub shared object
  var scripts = {
    kernel_s: prepare_script(service_cache_obj, "kernel"),
    start_s : prepare_script(service_cache_obj, "start"),
    stop_s : prepare_script(service_cache_obj, "stop"),
    pause_s : prepare_script(service_cache_obj, "pause"),
    resume_s : prepare_script(service_cache_obj, "resume"),
    after_resume_s : prepare_script(service_cache_obj, "after_resume"),
    service_init_s : prepare_script(service_cache_obj, "service_init"),
    service_destroy_s : prepare_script(service_cache_obj, "service_destroy")
  };
  service_cache_obj = _.assign(service_cache_obj, scripts);//4 set the xxxx_s
  service_cache_obj.is_inited = false;//5 not init yet
  return service_cache_obj;
};

//TODO: support different type of service
function prepare_script(service_cache_obj, action) {
  switch (service_cache_obj.type) {
    case "hope_service":
    case "beihai_service":
    case "oic_service":
    case "ui_service":
      var filepath = B.path.join(service_cache_obj.path, action + ".js");
      var context;
      var func_string;
      var func_script;
      //1. read the content of the file
      if (B.fs.file_exists(filepath)) {
        context = fs.readFileSync(filepath);
      }
      else if (action === "kernel" || action === "after_resume") {
        context = "";
      }
      else {
        context = "done()";
      }

      //2 wrap the function
      if (action === "kernel") {
        func_string = "(function(IN, CONFIG){\n" + context + "\n})";
      }
      else {
        func_string = "(function(CONFIG){\n" + context + "\n})"; 
      }

      //3 new vm.Script
      func_script = new vm.Script(func_string, 
        {filename: service_cache_obj.path + "__" + action});
      return func_script;

  default:
    check(false, "sm", "not support the service type:", service_cache_obj.type);
  }
}