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
 * Thing Module
 * handle thing and service
 * @module entity/thing
 */

var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/thing");
var check = B.check;
var fs = require("fs");
var Spec = require("./spec");


function prepare_update_thing(thing) {
  delete thing.path;
  delete thing.type;
  delete thing.is_connect;
  delete thing.services;
  delete thing.hub;
}
/**
 * add hope_thing into both store and harddisk.
 * make sure the thing not exist befor.
 * the dir name is thingbundle_path/new_things_by_user/thing.name
 * it will alse change the item "things" in hub_object
 * @param {Object} thing            
 * @param {String} thingbundle_path 
 * @param {Object} em               
 * @param {Array} changed_list 
 * @return {Promise}     
 */
exports.add_hope_thing$ = function(thing, thingbundle_path, em, changed_list) {
  log("add hope_thing", thing, thingbundle_path);
  return em.hub_store.get$(thing.hub)
  .then(function(hub) {
    check(hub.type !== "builtin", "entity/thing", "builtin hub cannot add thing");
    return em.thing_store.has$(thing.id);
  })
  .then(function(ret) {
    check(!ret, "entity/thing", "thing already exsit", thing.id);
    check(thing.type === "hope_thing", "entity/thing", "not hope_thing", thing);
    var base_path = B.path.join(thingbundle_path, "new_things_by_user");
    if (!B.fs.dir_exists(base_path)) {
      fs.mkdirSync(base_path);
    }
    var thing_path = B.path.join(base_path, thing.name);
    check(!B.fs.path_exists(thing_path), "entity/thing",
     "the thing path already exsit!", thing_path);
    fs.mkdirSync(thing_path);
    var thing_filename = B.path.join(thing_path, "thing.json");
    B.fs.write_json(thing_filename, thing);
    thing = _create_static_thing(thing, thing_path, thing.hub);
    return em.thing_store.set$(thing.id, thing, changed_list);
  })
  .then(function() {
    return add_thing_to_hub$(thing.hub, thing.id, em.hub_store, changed_list);
  });
};

/**
 * update the exsiting hope_thing in both store and hardisk
 * @param {Object} thing   json object of thing         
 * @param {Object} em               
 * @param {Array} changed_list
 * @return {Promise}   
 */
exports.update_hope_thing$ = function(thing, em, changed_list) {
  prepare_update_thing(thing);
  log("update hope_thing", thing);
  return em.thing_store.get_with_lock$(thing.id, function(old_thing) {
    check(!_.isUndefined(old_thing), "entity/thing",
      "the thing not exsit before", thing.id);
    check(!old_thing.is_builtin, "entity/thing",
      "builtin thing cannot update", old_thing);
    check(old_thing.type === "hope_thing", "entity/thing",
      "the updating thing is not hope_thing", old_thing);
    var json_path = B.path.join(old_thing.path, "thing.json");
    B.fs.update_json(json_path, thing);
    var new_thing = _.assign(old_thing, thing);
    return em.thing_store.set$(old_thing.id, new_thing, changed_list);
  });
};

/**
 * remove the hope_thing. including thing, service in both store/harddisk
 * and services' own specs in store.
 * @param  {String} thing_id     
 * @param  {Object} em           
 * @param  {Array} changed_list 
 * @return {Promise}              
 */
exports.remove_hope_thing$ = function(thing_id, em, changed_list) {
  log("remove hope_thing", thing_id);
  var self = this;
  return em.thing_store.get$(thing_id)
  .then(function(thing) {
    check(!_.isUndefined(thing), "entity/thing",
     "the thing not exsit before", thing.id);
    check(!thing.is_builtin, "entity/thing",
      "builtin thing cannot removed", thing);
    check(thing.type === "hope_thing", "entity/thing",
      "the removing thing is not hope_thing", thing);
    B.fs.rm(thing.path);
    return self.remove_thing_in_store$(thing_id, em, changed_list);
  });
};


/**
 * add a hope service from frontend. it will affect the service_store, thing_store,
 * and may be specbundle/spec store
 * @param {Object} service      service object
 * @param {Object} specbundle   {
 *                                id:
 *                                name:
 *                              }, the specbundle to store the service's own spec.
 *                              if it not exist, create new one
 * @param {Object} em           
 * @param {Array} changed_list
 * @return {Promise}
 */
exports.add_hope_service$ = function(service, specbundle, em, changed_list) {
  log("add hope service", service);
  var thing_path;
  var specbundle_obj;
  return em.service_store.has$(service.id)
  .then(function(ret) {
    check(!ret, "entity/service", "service already exsit", service);
    check(service.type === "hope_service", "entity/service",
      "must hope_service", service);
    var thing_id = service.thing;
    return em.thing_store.get_with_lock$(thing_id, function(thing) {
      log("add service to thing", thing);
      check(!_.isUndefined(thing), "entity/service",
        "the thing not exsit before", thing_id);
      check(!thing.is_builtin, "entity/service",
        "builtin thing cannot add service", thing);
      check(thing.type === "hope_thing", "entity/service",
        "the thing is not hope_thing", thing);
      if (thing.services.indexOf(service.id) < 0) {
        thing.services.push(service.id);
      }
      thing_path = thing.path;
      return em.thing_store.set$(thing.id, thing, changed_list);
    });
  })
  .then(function() {
    return em.specbundle_store.get$(specbundle.id);
  })
  .then(function(obj) {
    if (_.isUndefined(obj)) {
      specbundle_obj = Spec.create_local_bundle(specbundle, "");
    } else {
      specbundle_obj = obj;
    }
    log("write service json", service);
    var service_path = B.path.join(thing_path, service.name);
    check(!B.fs.path_exists(service_path), "entity/service",
      "the service folder already exsit!", service_path);
    var service_json_path = B.path.join(service_path, "service.json");
    B.fs.write_json(service_json_path, service);
    var tasks = [];
    if (_.isObject(service.spec)) {
      log("load spec from service", service_json_path);
      var spec = Spec.create_local_spec(service.spec, service_json_path,
        specbundle_obj.path, specbundle_obj.id, B.path.dir_base(service_json_path));
      service.spec = spec.id;
      if (specbundle_obj.specs.indexOf(spec.id) < 0) {
        specbundle_obj.specs.push(spec.id);
      }
      service.own_spec = true;
      tasks.push(em.spec_store.set$(spec.id, spec, changed_list));
      tasks.push(em.specbundle_store.set$(specbundle_obj.id, specbundle_obj, changed_list));      
    }
    service = _create_static_service(service, service_path, service.thing);
    tasks.push(em.service_store.set$(service.id, service, changed_list));
    return Promise.all(tasks);
  });
};

function prepare_update_service(service) {
  delete service.path;
  delete service.thing;
  delete service.own_spec;
  delete service.type;
  delete service.is_connect;
}
/**
 * update the exsiting hope_service.
 * It will change the service in both store and harddisk, 
 * and may change the spec/specbundle in store if the service.spec is object
 *   1, if the old_service's spec is own_spec, remove it
 *   2, create new spec and add
 * @param  {Object} service      
 * @param  {Object} specbundle   {
 *                                id:
 *                                name:
 *                                }, the specbundle to store the services's own spec.
 *                                if it not exist, create new one
 * @param {Object} em           
 * @param {Array} changed_list
 * @return {Promise}
 */
exports.update_hope_service$ = function(service, specbundle, em, changed_list) {
  prepare_update_service(service);
  log("update_hope_service", service);
  var old_service;
  var specbundle_obj;
  return em.service_store.get$(service.id)
  .then(function(old) {
    old_service = old;
    check(!_.isUndefined(old_service), "entity/service", "the service not exist before", old_service);
    check(old_service.type === "hope_service", "entity/service",
          "must hope_service", old_service);
    return em.thing_store.get$(old_service.thing);
  })
  .then(function(thing) {
    check(!thing.is_builtin, "entity/service",
      "builtin thing cannot update service", thing);
    if (old_service.own_spec && _.isString(service.spec) && old_service.spec !== service.spec) {
      return Spec.remove_spec_in_store$(old_service.spec, em, changed_list);
    } else if (old_service.own_spec && _.isObject(service.spec) && _.isString(service.spec.id) && service.spec.id !== old_service.spec) {
      return Spec.remove_spec_in_store$(old_service.spec, em, changed_list);
    }
  })
  .then(function() {
     return em.specbundle_store.get$(specbundle.id); 
  })
  .then(function(obj) {
    if (_.isUndefined(obj)) {
      specbundle_obj = Spec.create_local_bundle(specbundle, "");
    } else {
      specbundle_obj = obj;
    }
    var json_path = B.path.join(old_service.path, "service.json");

    B.fs.update_json(json_path, service);
    var tasks = [];
    if (_.isObject(service.spec)) {
      log("update service own spec", json_path);
      var spec = Spec.create_local_spec(service.spec, json_path,
        specbundle_obj.path, specbundle_obj.id, B.path.dir_base(json_path));
      service.spec = spec.id;
      if (specbundle_obj.specs.indexOf(spec.id) < 0) {
        specbundle_obj.specs.push(spec.id);
      }
      service.own_spec = true;
      tasks.push(em.spec_store.set$(spec.id, spec, changed_list));
      tasks.push(em.specbundle_store.set$(specbundle_obj.id, specbundle_obj, changed_list));
    }
    var new_service = _.assign(old_service, service);
    tasks.push(em.service_store.set$(service.id, new_service, changed_list));
    return Promise.all(tasks);
  });
};

/**
 * remove hope service, including the own_spec, service(store/harddisk),
 * and chang the thing.services
 * @param  {String} service_id   
 * @param  {Object} em           
 * @param  {Array} changed_list 
 * @return {Promise}              
 */
exports.remove_hope_service$ = function(service_id, em, changed_list) {
  log("remove hope service", service_id);
  var service;
  return em.service_store.get$(service_id)
  .then(function(obj) {
    service = obj;
    check(!_.isUndefined(service), "entity/service", "the service not exist before", service);
    check(service.type === "hope_service", "entity/service",
      "must hope_service", service);
    return em.thing_store.get_with_lock$(service.thing, function(thing) {
      check(!thing.is_builtin, "entity/service",
        "builtin thing cannot remove service", thing);
      _.remove(thing.services, function(id) {
        return id === service.id;
      });
      return em.thing_store.set$(thing.id, thing);
    });
  })
  .then(function() {
    var tasks = [];
    if (service.own_spec) {
      tasks.push(Spec.remove_spec_in_store$(service.spec, em, changed_list));
    }
    B.fs.rm(service.path);
    tasks.push(em.service_store.delete$(service.id, changed_list));
    return Promise.all(tasks);
  });
};


/**
 * Add a fully described thing into stores
 * Fully described means that the services of the bundle are real objects
 * instead of ids. However, the spec of the services should be id instead of
 * objects
 * @param {Object} thing
 * @param {Object} em           
 * @param {Array} changed_list 
 */
exports.add_thing_with_services$ = function(thing, em, changed_list) {
  log("add thing with services", thing);
  B.check(thing.id, "entity/thing", "Thing should have id", thing);
  return Promise.resolve()
  .then(function() {
    return em.thing_store.has$(thing.id);
  })
  .then(function(ret) {
    check(!ret, "entity/thing", "thing already exsit", thing.id);
    var services = thing.services, to_set = [];
    thing.services = [];
    services.forEach(function(service) {
      B.check(_.isObject(service) && _.isString(service.id), "entity/thing", 
        "service should be an Object with a id of String", service, "in thing", thing);
      B.check(!_.isObject(service.spec), "entity/thing",
        "The spec in the service should already been converted to a id", service,
        "in thing", thing);
      thing.services.push(service.id);
      service.thing = thing.id;
      to_set.push([service.id, service]);
    });
    return Promise.resolve().then(function() {
      if (to_set.length > 0) {
        return em.service_store.batch_set$(to_set, changed_list);
      }
    }).then(function() {
      return em.thing_store.set$(thing.id, thing, changed_list);
    });
  }).then(function() {
    return add_thing_to_hub$(thing.hub, thing.id, em.hub_store, changed_list);
  });
};

/**
 * load static things from harddisk.
 * 0, get the specbundle. if not exsit, create a bundle object
 * 1, find all "thing.json" in bundle, and load each thing
 * 2, in _load_static_thing$
 *    2.1, create thing obj from json
 *    2.2, the services folde should be the sub-folder of thing folder.
 *    2.3, load each service json
 *         2.3.1: if has spec object, create spec and store
 *         2.3.2: create service object, and store
 *    2.4, store the thing obj
 *    2.5, add thing id to hub.things
 *3, store the specbundle
 *
 * @param  {String} bundle_path the bundle contains the things
 * @param  {Object} specbundle  the specs in services will be added into the sepcbundle.
 *                              {
 *                                id:
 *                                name:
 *                              }
 *                              and path and specs will be set automaticlly.
 * @param  {String} hubid       the hub own the things
 * @param  {object} em
 * @param {Array} changed_list  record of changed items     
 * @return {Promise}   
 */
exports.load_static_things$ = function(bundle_path, specbundle, hubid, em, changed_list)
{ 
  log("load static things", bundle_path, "with specbundle", specbundle);
  var specbundle_obj;
  return Promise.resolve()
  .then(function() {
    return em.specbundle_store.get_with_lock$(specbundle.id,
      function(ret) {
        return Promise.resolve()
        .then(function() {
          if (_.isUndefined(ret)) {  
            specbundle_obj = Spec.create_local_bundle(specbundle, bundle_path);
            log("create new specbundle", specbundle_obj);
          }
          else {
            specbundle_obj = ret;
          }
          var thing_json_path_array = B.fs.find_files(bundle_path, "thing.json");
          var tasks = [];
          thing_json_path_array.forEach(function(p) {
            var thing_path = B.path.dir(p);
            tasks.push(_load_static_thing$(thing_path, specbundle_obj, hubid, em, changed_list));
          });
          return Promise.all(tasks);          
        })
        .then(function() {
          return em.specbundle_store.set$(specbundle_obj.id, specbundle_obj, changed_list);
        });
    });
  });
};

function _load_static_thing$(thing_path, specbundle, hubid, em, changed_list) {
  log("load static thing", thing_path);
  var thingid;
  return Promise.resolve()
  .then(function create_thing_from_json() {
    var thing_json_path = B.path.join(thing_path, "thing.json");
    var thing_json = B.fs.read_json(thing_json_path);
    var i18n = B.fs.load_i18n_files(thing_path);
    var thing = _create_static_thing(thing_json, thing_path, hubid, i18n);
    thingid = thing.id;
    return thing;
  })
  .then(function load_services(thing) {
    var service_path_array = [];
    fs.readdirSync(thing.path).forEach(function(p) {
      if (B.fs.file_exists(B.path.join(thing.path, p, "service.json"))) {
        service_path_array.push(B.path.join(thing.path, p));
      }
    });
    var tasks = [];
    service_path_array.forEach(function(p) {
      log("load_static_service", p);
      var service_json_path = B.path.join(p, "service.json");
      var service_i18n = B.fs.load_i18n_files(p);
      try {
        var service_json = B.fs.read_json(service_json_path);
      }
      catch(e) {
        check(false, "read_json", e, p);
      }
      if (_.isObject(service_json.spec)) {
        log("load spec from service", service_json_path);
        if (!service_json.spec.id) {
          service_json.spec.id = B.unique_id("__HOPE_SPEC__");
          try {
            B.fs.write_json(service_json_path, service_json);
            log.warn("add spec_id to service.json under", p);
          }
          catch(e) {
            check(false, "write_json", e, p);
          }
        }
        var spec = Spec.create_local_spec(service_json.spec, service_json_path,
          specbundle.path, specbundle.id, B.path.dir_base(service_json_path));
        service_json.spec = spec.id;
        specbundle.specs.push(spec.id);
        service_json.own_spec = true;
        tasks.push(em.spec_store.set$(spec.id, spec, changed_list));

      }
      var service = _create_static_service(service_json, p, thing.id, service_i18n);
      thing.services.push(service.id);
      tasks.push(em.service_store.set$(service.id, service, changed_list));
    });
    tasks.push(em.thing_store.set$(thing.id, thing, changed_list));
    return Promise.all(tasks);
  })
  .then(function() {
    return add_thing_to_hub$(hubid, thingid, em.hub_store, changed_list);
  });
}

/**
 * create a static thing obj from a json file.
 * a, if name is missing, default name.
 *    if the id is missing, it will generate a default id (baseid + path).
 * b, the path/hub are generated based on the env
 * c, the thing is connect
 * @param  {Object} json       json file which describe the thing
 * @param  {String} thing_path the path of the thing dir
 * @param  {String} hubid      the hub which own the thing
 * @return {Object}            the thing object
 */
function _create_static_thing(json, thing_path, hubid, i18n) {
  json.name = json.name || B.path.base(thing_path);
  json.id = json.id || (thing_path + "@" + hubid);// default id, because hubid is unique in whole system
  json.services = [];
  json.path = thing_path;
  json.is_connect = true;
  json.hub = hubid;
  json.type = "hope_thing";
  json.is_builtin = !!json.is_builtin;
  if (i18n) {
    json.i18n = i18n;
  }
  return json;
}

/**
 * create a static service object from json file.
 * a, the default id is thing_id + path.
 * b, path and thing are set based on the env.
 * c, service is conenct.
 * @param  {Object} json         
 * @param  {Steing} service_path service dir
 * @param  {String} thing_id     the thing which own the service
 * @return {Object}              the service object
 */
function _create_static_service(json, service_path, thing_id, i18n) {
  check(_.isString(json.spec), "entity/thing",
    "the json must have spec id", json.spec, service_path);
  json.name = json.name || B.path.base(service_path);
  json.id = json.id || (B.path.base(service_path) + "@" + thing_id);
  json.path = service_path;
  json.thing = thing_id;
  json.is_connect = true;
  json.own_spec = !!json.own_spec;
  json.type = "hope_service";
  if (i18n) {
    json.i18n = i18n;
  }
  return json;
}

/**
 * set thing connect status.
 * 1, the thing itself is set
 * 2, the services belong to the thing are set
 * @param  {String}  thingid    
 * @param  {Boolean} is_connect the status
 * @param  {Object}  em
 * @param {Array} changed_list  record of changed items          
 * @return {Promise}             
 */
exports.set_connect$ = function(thingid, is_connect, em, changed_list) {
  log("set_connect", thingid, is_connect);
  var service_id_array = [];
  return Promise.resolve()
  .then(function() {
    return em.thing_store.get_with_lock$(thingid, function(thing) {
      thing.is_connect = is_connect;
      service_id_array = thing.services;
      log("set thing connect", thingid, is_connect);
      return em.thing_store.set$(thing.id, thing, changed_list);
    });
  })
  .then(function() {
    log("set services connect", service_id_array, is_connect);
    return em.service_store.batch_get_with_lock$(service_id_array,
      function(service_array) {
        var args = [];
        _.forEach(service_array, function(service, index) {
          service.is_connect = is_connect;
          args.push([service_id_array[index], service]);
        });
        return em.service_store.batch_set$(args, changed_list);        
      });
  });
};

/**
 * remove thing.
 * 1, batch delete the services belong to the thing, and their own_specs, (including store and bundle.specs)
 * 2, delete the thing in thing_store.
 * 3, delete the thing from hub.things.
 * @param  {String} thingid 
 * @param  {Object} em  
 * @param {Array} changed_list  record of changed items     
 * @return {Promise}
 */
exports.remove_thing_in_store$ = function(thingid, em, changed_list) {
  log("remove_thing_in_store", thingid);
  var hubid;
  var service_id_array;
  return Promise.resolve()
  .then(function() {
    return em.thing_store.get$(thingid);
  })
  .then(function(thing) {
    check(!_.isUndefined(thing), "entity/thing", "the thing not exist in the store", thingid);
    hubid = thing.hub;
    service_id_array = thing.services;
    return em.service_store.batch_get$(service_id_array);
  })
  .then(function(services) {
    var tasks = [];
    services.forEach(function(service) {
      if (service.own_spec) {
        tasks.push(Spec.remove_spec_in_store$(service.spec, em, changed_list));
      }
    });
    return Promise.all(tasks);
  })
  .then(function() {
    log("remove related services in store", service_id_array);
    return em.service_store.batch_delete$(service_id_array, changed_list);
  })
  .then(function() {
    log("remove thing in store", thingid);
    return em.thing_store.delete$(thingid, changed_list);
  })
  .then(function() {
    return remove_thing_from_hub$(hubid, thingid, em.hub_store, changed_list);
  });
};


/**
 * add thing_id into hub.things
 */
function add_thing_to_hub$(hub_id, thing_id, hub_store, changed_list) {
  log("add thing to hub", hub_id, thing_id);
  return Promise.resolve()
  .then(function() {
    return hub_store.get_with_lock$(hub_id, function(hub) {
      check(hub.things.indexOf(thing_id) === -1, "entity/thing", "thing already exsits in hub", thing_id, hub);
      hub.things.push(thing_id);
      return hub_store.set$(hub_id, hub, changed_list);
    });
  });
}

/**
 * remove thing_id from hub.things
 */
function remove_thing_from_hub$(hub_id, thing_id, hub_store, changed_list) {
  log("remove thing from hub", hub_id, thing_id);
  return Promise.resolve()
  .then(function() {
    return hub_store.get_with_lock$(hub_id, function(hub) {
      check(hub.things.indexOf(thing_id) !== -1, "entity/thing", "thing not exsits in hub", thing_id, hub);
      _.remove(hub.things, function(id) {
        return id === thing_id;
      });
      return hub_store.set$(hub_id, hub, changed_list);
    });
  });
}


// -------------------------------------
// service file related
// --------------------------------------
/**
 * list service's files
 * @param  {String} service_id 
 * @param  {Object} em         
 * @return {Promise}            resolve: {
 *                                         expected: string array. the expected files, init.js, start.js ...
 *                                         exsiting: string array. all exsiting files in the service folder,
 *                                                                 expect for the "service.json"
 *                                       }
 *                                       all path are relative path to service.path, and unix format
 */
exports.list_service_files$ = function(service_id, em) {
  log("list_service_files", service_id);
  var expected_files = [
    "init.js",
    "start.js",
    "resume.js",
    "after_resume.js",
    "kernel.js",
    "pause.js",
    "stop.js",
    "destroy.js"]; 
  return em.service_store.get$(service_id)
  .then(function(service) {
    check(!_.isUndefined(service), "entity/service",
      "service not exist in list_service_files", service_id);
    var glob = require("glob");
    var basepath = service.path;
    var baselen = basepath.length + 1;
    var file_array = glob.sync(B.path.join(basepath, "**/*"), {ignore: B.path.join(basepath, "service.json")});
    var exsiting_files = [];
    file_array.forEach(function(file) {
      exsiting_files.push(file.slice(baselen));
    });
    return {
      expected: expected_files,
      exsiting: exsiting_files
    };
  });
};

/**
 * read the content of the target service file
 * @param  {String} service_id 
 * @param  {String} file_path  the relative path to serive folder
 * @param  {Object} em       
 * @return {Promise}            resolve: the content of the target file
 */
exports.read_service_file$ = function(service_id, file_path, em) {
  log("read_service_file", service_id, file_path);
  return em.service_store.get$(service_id)
  .then(function(service) {
    check(!_.isUndefined(service), "entity/service",
      "service not exist in read_service_file", service_id);
    var fullpath = B.path.resolve(service.path, file_path);
    check(_.startsWith(fullpath, service.path), "entity/service", "Invalid path in read_service_file", fullpath);
    check(B.fs.file_exists(fullpath), "entity/service", "the path not exsit!", fullpath);
    return {
      content: B.fs.read_file(fullpath, {encoding: "utf8"})
    };
  });
};

/**
 * write the service file.
 * @param  {String} service_id 
 * @param  {String} file_path  the relative path to serive folder
 * @param  {String} content    
 * @param  {Object} em         
 * @return {Promise}           
 */
exports.write_service_file$ = function(service_id, file_path, content, em) {
  log("write_service_file", service_id, file_path);
  return em.service_store.get$(service_id)
  .then(function(service) {
    check(!_.isUndefined(service), "entity/service",
      "service not exist in write_service_file", service_id);
    var fullpath = B.path.resolve(service.path, file_path);
    check(_.startsWith(fullpath, service.path), "entity/service", "Invalid path in write_service_file", fullpath);
    return B.fs.write_file(fullpath, content);
  }); 
};

/**
 * remove the service file
 * @param  {String} service_id 
 * @param  {String} file_path  the relative path to serive folder
 * @param  {Object} em  
 * @return {Promise}           
 */
exports.remove_service_file$ = function(service_id, file_path, em) {
  log("remove_service_file", service_id, file_path);
  return em.service_store.get$(service_id)
  .then(function(service) {
    check(!_.isUndefined(service), "entity/service",
      "service not exist in remove_service_file", service_id);
    var fullpath = B.path.resolve(service.path, file_path);
    check(_.startsWith(fullpath, service.path), "entity/service", "Invalid path in remove_service_file", fullpath);
    return B.fs.rm(fullpath);
  });
};



exports.is_service_path = function(service_path) {
  return B.fs.dir_exists(service_path) && 
  B.fs.file_exists(B.path.join(service_path, "service.json"));
};
