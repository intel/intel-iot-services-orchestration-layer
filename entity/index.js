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
 * Entity Module
 * @module entity
 */

var _ = require("lodash");
var B = require("hope-base");
var check = B.check;
var EventEmitter = require("eventemitter3");
var App = require("./lib/app");
var Spec = require("./lib/spec");
var Thing = require("./lib/thing");
var Updater = require("./lib/update");
var Hub = require("./lib/hub");
var User = require("./lib/user");
var log = B.log;

exports.create_entity_manager = function(obj) {
  return new EntityManager(obj);
};

exports.is_entity_manager = function(obj) {
  return obj.type === "EntityManager";
};


exports.$factories = {
  EntityManager: exports.create_entity_manager
};


/**
 * the Entity class, the object contains many store for different hope entities
 * @constructor
 * @param {Object} obj describe the member in the entity object
 */
function EntityManager(obj) {
  check(_.isObject(obj), "entity", "the args in creating entity should be Object", obj);
  this.id = B.unique_id("HOPE_EM_");
  this.type = "EntityManager";
  this.hub_store = obj.hub_store || {};
  this.thing_store = obj.thing_store || {};
  this.service_store = obj.service_store || {};
  this.spec_store = obj.spec_store || {};
  this.specbundle_store = obj.specbundle_store || {};
  this.session_store = obj.session_store || {};
  this.graph_store = obj.graph_store || {};
  this.app_store = obj.app_store || {};
  this.ui_store = obj.ui_store || {};
  this.user_store = obj.user_store || {};
  this.updater = Updater.create_updater(this);
  this.event = new EventEmitter();
  this.timestamp = B.time.hrtime();//hrtime
  this.timestamp_old = this.timestamp;
}

/**
 * All prototype method xxx__list, xxx__get, xxx__list_yyy, 
 * will get the Promise whose resolved value is object or object-array
 */

// --------------------------------------------------------
// event related
// --------------------------------------------------------
function _emit(emitter, topic, data) {
  emitter.emit(topic, data);
}

function _update_get_timestamp(em) {
  em.timestamp_old = em.timestamp;
  em.timestamp = B.time.hrtime();
  var last = em.timestamp_old;
  var now = em.timestamp;
  return {
    last: last,
    now: now
  };
}

/**
 * em changed. it will update the timestamp and emit the change-list
 * @param  {Object} em   
 * @param  {Array} list change-list
 * @return {Array} {
 *                   list: organized_list
 *                   time: {
 *                           last:
 *                           now:
 *                         }
 *                 }
 */
function em_changed(em, list) {
  var optimized_list = em.updater.organize_list(list);
  var updated_time = _update_get_timestamp(em);
  log("entity", "emit changed", optimized_list, updated_time);
  var data = {
    list: optimized_list,
    time: updated_time
  };
  _emit(em.event, "changed", data);
  return data;
}

/**
 * report full em info.
 * it will sendout the em.timestamp and fulllist
 * @param  {Object} em              
 * @param  {Array} list            full info list
 * @param  {String} target_mnode_id the dst mnode id
 */
function em_full_info(em, list, target_mnode_id) {
  var optimized_list = em.updater.organize_list(list);
  var timestamp = {
    last: em.timestamp_old,
    now : em.timestamp
  };
  log("entity", "emit full_info", optimized_list, timestamp, target_mnode_id);
  _emit(em.event, "full_info", {
    list:optimized_list,
    time:timestamp,
    target_mnode_id:target_mnode_id
  });
}

//NOTE1: ALL EntityManager prototype-method which will modifiy the changelist are locked, do not call other prototype-method in one.

/**
 * return a lock with id
 * @param  {String} key part of lock id
 * @return {Object}     lock
 */
EntityManager.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/EM/" + this.id + "/" + 
    (_.isUndefined(key) ? "" : key));
};

// --------------------------------------------------------
// Update related
// --------------------------------------------------------
/**
 * set the priority of updater.
 * @param {Array} priorities 
 */
EntityManager.prototype.set_update_priorities = function(priorities) {
  return this.updater.set_priorities(priorities);
};

/**
 * get the priority of updater.
 * @return {Array} the priority
 */
EntityManager.prototype.get_update_priorities = function() {
  return this.updater.get_priorities();
};

/**
 * update the em according the item in list. 
 * update in list's order.
 * it triggers the em_changed
 * @param  {Array} list each item is an obj
 *                      {
 *                        type: must be in the priorities
 *                        cmd: set or delete
 *                        id: id or id array
 *                        obj: obj or obj array. it is only needed in set cmd.
 *                      }
 * @return {Promise} 
 */
EntityManager.prototype.update$ = function(list) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return self.updater.update$(list, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * get full info list in the em.
 * it reiggers the em_fullinfo
 * @param  {String} target_mnode_id the dst of the fullinfo message
 * @return {Promise}                 
 */
EntityManager.prototype.get_full_info$ = function(target_mnode_id) {
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Updater.get_full_info$(self)
    .then(function(list) {
      em_full_info(self, list, target_mnode_id);
      return list;
    });
  }, 10000, false);
};

//----------------------------------------------------------------
// Helpers
//----------------------------------------------------------------

/**
 * Example: raw_add_children$("thing", "thing_1", "service", "services", [{...}, {...}])
 * It would add a bunch of services to service store, and 
 * add ids to services field of "thing_1" of thing_store
 * @param {String} parent_store_name   e.g. thing, hub, ...
 * @param {String} parent_id           id of the entity in parent store
 * @param {String} child_store_name e.g. thing, hub, ...
 * @param {String} child_filed_name field name in parent entity, and this field stores an array of ids
 * @param {Objects} items              childrens to add
 */
EntityManager.prototype.raw_add_children$ = function(parent_store_name, parent_id,
 child_store_name, child_filed_name, items) {
  var tag = "entity_manager/add_children";
  var changed_list = [];
  var parent_store = B.check(this[parent_store_name + "_store"],
    tag, "Unknown store", parent_store_name);
  var child_store = B.check(this[child_store_name + "_store"],
    tag, "Unknown store", child_store_name);
  B.check(_.isArray(items), tag, "items should be an array");
  items.forEach(function(item) {
    B.check(item.id, tag, "item should have an id", item);
  });
  var l = this.make_lock();
  var self = this;
  return l.lock_as_promise$(function() {
    return parent_store.get$(parent_id).then(function(parent) {
      B.check(_.isObject(parent), tag, "entity not exist", parent_store_name, parent_id);
      var idx = {};
      var parent_items = parent[child_filed_name] || [];
      parent_items.forEach(function(item) {
        idx[item] = true;
      });
      var to_set = [];
      items.forEach(function(item) {
        if (!idx[item.id]) {
          parent_items.push(item.id);
        }
        to_set.push([item.id, item]);
      });
      parent[child_filed_name] = parent_items;
      return child_store.batch_set$(to_set, changed_list).then(function() {
        return parent_store.set$(parent_id, parent, changed_list);
      }).then(function() {
        return em_changed(self, changed_list);
      });
    });
  }, 10000, false);
};

/**
 * Similar to raw_add_children$ except that this is to remove items
 * @param {String} parent_store_name   e.g. thing, hub, ...
 * @param {String} parent_id           id of the entity in parent store
 * @param {String} child_store_name e.g. thing, hub, ...
 * @param {String} child_filed_name field name in parent entity, and this field stores an array of ids
 * @param {Objects} items              ids of items to remove
 */
EntityManager.prototype.raw_remove_children$ = function(parent_store_name, parent_id,
 child_store_name, child_filed_name, items) {
  var tag = "entity_manager/remove_children";
  var changed_list = [];
  var parent_store = B.check(this[parent_store_name + "_store"],
    tag, "Unknown store", parent_store_name);
  var child_store = B.check(this[child_store_name + "_store"],
    tag, "Unknown store", child_store_name);
  B.check(_.isArray(items), tag, "items should be an array");
  var l = this.make_lock();
  var self = this;
  return l.lock_as_promise$(function() {
    return parent_store.get$(parent_id).then(function(parent) {
      B.check(_.isObject(parent), tag, "entity not exist", parent_store_name, parent_id);
      var parent_items = parent[child_filed_name] || [];
      _.remove(parent_items, function(x) {
        return _.includes(items, x);
      });
      parent[child_filed_name] = parent_items;
      return parent_store.set$(parent_id, parent, changed_list).then(function() {
        return child_store.batch_delete$(items, changed_list);
      }).then(function() {
        return em_changed(self, changed_list);
      });
    });
  }, 10000, false);
};


// ----------------------------------------------------------------------
// Hub related
// ----------------------------------------------------------------------

/**
 * add a new hub into the store.
 * make sure the hubid nt exist before.
 * it triggers the em_changed.
 * @param  {Object} hub_obj 
 * @return {Promise}  resolve: {
 *                               list: orgnaized list
 *                               time: {
 *                                      last:
 *                                      now:
 *                                     }
 *                             }      
 */
EntityManager.prototype.hub__add$ = function(hub_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Hub.add_hub$(hub_obj, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);

};

/**
 * remove the hub and all entities related to the hub.
 * if the hub is not exist, just delete any way.
 * it triggers the em_changed.
 * @param  {String} hubid        
 * @return {Promise}   resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }            
 */
EntityManager.prototype.hub__remove$ = function(hub_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Hub.remove_hub$(hub_id, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};


EntityManager.prototype.hub__get$ = function(hub_ids) {
  if (!_.isArray(hub_ids)) {
    return this.hub_store.get$(hub_ids);
  } else {
    return this.hub_store.batch_get$(hub_ids);
  }
};


EntityManager.prototype.hub__list$ = function(max_length) {
  var self = this;
  return self.hub_store.list$(max_length)
  .then(function(ids) {
    return self.hub_store.batch_get$(ids);
  });
};

EntityManager.prototype.hub__list_things$ = function(hub_id) {
  var self = this;
  return self.hub_store.get$(hub_id)
  .then(function(hub_obj) {
    return self.thing_store.batch_get$(hub_obj.things);
  });
};

// ----------------------------------------------------------------------
// Thing/Service related
// ----------------------------------------------------------------------

/**
 * add hope_thing into both store and harddisk.
 * make sure the thing not exist befor.
 * the dir name is thingbundle_path/new_things_by_user/thing.name
 * it will alse change the item "things" in hub_object
 * @param {Object} thing_obj            
 * @param {String} thingbundle_path 
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }       
 */
EntityManager.prototype.thing__add_hope_thing$ = function(thing_obj, thingbundle_path) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.add_hope_thing$(thing_obj, thingbundle_path, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * update the exsiting hope_thing in both store and hardisk
 * @param {Object} thing_obj   json object of thing         
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }    
 */
EntityManager.prototype.thing__update_hope_thing$ = function(thing_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.update_hope_thing$(thing_obj, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * remove the hope_thing. including thing, service in both store/harddisk
 * and services' own specs in store.
 * @param  {String} thing_id     
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }                
 */
EntityManager.prototype.thing__remove_hope_thing$ = function(thing_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.remove_hope_thing$(thing_id, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * add a hope service from frontend. it will affect the service_store, thing_store,
 * and may be specbundle/spec store
 * @param {Object} service_obj     service object
 * @param {Object} specbundle   {
 *                                id:
 *                                name:
 *                              }, the specbundle to store the service's own spec.
 *                              if it not exist, create new one
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }  
 */
EntityManager.prototype.service__add_hope_service$ = function(service_obj, specbundle) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.add_hope_service$(service_obj, specbundle, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};


/**
 * update the exsiting hope_service.
 * It will change the service in both store and harddisk, 
 * and may change the spec/specbundle in store if the service.spec is object
 *   1, if the old_service's spec is own_spec, remove it
 *   2, create new spec and add
 * @param  {Object} service_obj      
 * @param  {Object} specbundle   {
 *                                id:
 *                                name:
 *                                }, the specbundle to store the services's own spec.
 *                                if it not exist, create new one
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }  
 */
EntityManager.prototype.service__update_hope_service$ = function(service_obj, specbundle) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.update_hope_service$(service_obj, specbundle, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};


/**
 * remove hope service, including the own_spec, service(store/harddisk),
 * and chang the thing.services
 * @param  {String} service_id   
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }               
 */
EntityManager.prototype.service__remove_hope_service$ = function(service_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.remove_hope_service$(service_id, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.thing__add_with_services$ = function(thing_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.add_thing_with_services$(thing_obj, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
}; 


/**
 * load static thing/services from the local bundle.
 * it will set the thing, service and service_own_spec
 * it triggers the em_changed.
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
 * @param  {String} bundle_path path of the thing bundle
 * @param  {Object} specbundle  the specs in services will be added into the sepcbundle.
 *                              {
 *                                id:
 *                                name:
 *                              }
 * @param  {String} hubid       the hub own the things
 * @return {Promise}          resolve:{
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                }
 */
EntityManager.prototype.thing__load_from_bundle$ = function(bundle_path, specbundle, hub_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.load_static_things$(bundle_path, specbundle, hub_id, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * set thing connect status.
 * 1, the thing itself is set
 * 2, the services belong to the thing are set
 * it triggers the em_changed.
 * @param  {String}  thing_id    
 * @param  {Boolean} connect_status     
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }         
 */
EntityManager.prototype.thing__set_connect$ = function(thing_id, connect_status) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.set_connect$(thing_id, connect_status, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * remove thing in store, not in disk.
 * 1, batch delete the services belong to the thing, and their own_specs, (including store and bundle.specs)
 * 2, delete the thing in thing_store.
 * 3, delete the thing from hub.things.
 * it triggers the em_changed.
 * @param  {String} thingid   
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.thing__remove_in_store$ = function(thing_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Thing.remove_thing_in_store$(thing_id, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};


EntityManager.prototype.thing__get$ = function(thing_ids) {
  if (!_.isArray(thing_ids)) {
    return this.thing_store.get$(thing_ids);
  } else {
    return this.thing_store.batch_get$(thing_ids);
  }
};


EntityManager.prototype.thing__list$ = function(max_length) {
  return this.thing_store.list$(max_length);
};

EntityManager.prototype.thing__list_services$ = function(thing_id) {
  var self = this;
  return self.thing_store.get$(thing_id)
  .then(function(thing_obj) {
    return self.service_store.batch_get$(thing_obj.services);
  });
};

EntityManager.prototype.thing__get_hub$ = function(thing_id) {
  var self = this;
  return self.thing_store.get$(thing_id)
  .then(function(thing_obj) {
    return self.hub_store.get$(thing_obj.hub);
  });
};


EntityManager.prototype.service__get$ = function(service_ids) {
  if (!_.isArray(service_ids)) {
    return this.service_store.get$(service_ids);
  } else {
    return this.service_store.batch_get$(service_ids);
  }
};

EntityManager.prototype.service__list$ = function(max_length) {
  return this.service_store.list$(max_length);
};


EntityManager.prototype.service__get_spec$ = function(service_id) {
  var self = this;
  return self.service_store.get$(service_id)
  .then(function(service_obj) {
    return self.spec_store.get$(service_obj.spec);
  });
};

EntityManager.prototype.service__get_thing$ = function(service_id) {
  var self = this;
  return self.service_store.get$(service_id)
  .then(function(service_obj) {
    return self.thing_store.get$(service_obj.thing);
  });
};

EntityManager.prototype.service__get_hub$ = function(service_id) {
  var self = this;
  return self.service_store.get$(service_id)
  .then(function(service) {
    return self.thing_store.get$(service.thing);
  })
  .then(function(thing) {
    return self.hub_store.get$(thing.hub);
  });
};

/**
 * list service's files
 * @param  {String} service_id        
 * @return {Promise}            resolve: {
 *                                         expected: string array. the expected files, init.js, start.js ...
 *                                         exsiting: string array. all exsiting files in the service folder,
 *                                                                 expect for the "service.json"
 *                                       }
 *                                       all path are relative path to service.path, and unix format
 */
EntityManager.prototype.service__list_files$ = function(service_id) {
  return Thing.list_service_files$(service_id, this);
};

/**
 * read the content of the target service file
 * @param  {String} service_id 
 * @param  {String} file_path  the relative path to serive folder      
 * @return {Promise}            resolve: the content of the target file
 */
EntityManager.prototype.service__read_file$ = function(service_id, file_path) {
  return Thing.read_service_file$(service_id, file_path, this);
};

/**
 * write the service file.
 * @param  {String} service_id 
 * @param  {String} file_path  the relative path to serive folder
 * @param  {String} content           
 * @return {Promise}           
 */
EntityManager.prototype.service__write_file$ = function(service_id, file_path, content) {
  var self = this;
  return this.make_lock().lock_as_promise$(function() {
    return Thing.write_service_file$(service_id, file_path, content, self);
  });
};

/**
 * remove the service file
 * @param  {String} service_id 
 * @param  {String} file_path  the relative path to serive folder
 * @return {Promise}           
 */
EntityManager.prototype.service__remove_file$ = function(service_id, file_path) {
   var self = this;
  return this.make_lock().lock_as_promise$(function() {
    return Thing.remove_service_file$(service_id, file_path, self);
  });
};

// ----------------------------------------------------------------------
// Spec/SpecBundle related
// ----------------------------------------------------------------------
/**
 * load specs from spec_bundle in harddisk
 * @param  {string} specbundle_path the path of spec_bundle
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.spec__load_from_localbundle$ = function(specbundle_path) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Spec.load_from_localbundle$(specbundle_path, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * remove the spec in store. (excluding the harddisk)
 * 1, get the corresponding bundle
 * 2, remove the spec id from bundle.specs
 * 3, re-store the bundle
 * 4, delete the spec in store.
 * @param  {String} spec_id 
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.spec__remove_in_store$ = function(spec_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Spec.remove_spec_in_store$(spec_id, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.spec__get$ = function(spec_ids) {
  if (!_.isArray(spec_ids)) {
    return this.spec_store.get$(spec_ids);
  } else {
    return this.spec_store.batch_get$(spec_ids);
  }
};

EntityManager.prototype.spec__list$ = function(max_length) {
  return this.spec_store.list$(max_length);
};

EntityManager.prototype.spec__get_specbundle$ = function(spec_id) {
  var self = this;
  return self.spec_store.get$(spec_id)
  .then(function(spec_obj) {
    return self.specbundle_store.get$(spec_obj.specbundle);
  });
};



EntityManager.prototype.specbundle__add_with_specs$ = function(specbundle_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return Spec.add_specbundle_with_specs$(specbundle_obj, self, changed_list)
   .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);

};

EntityManager.prototype.specbundle__get$ = function(specbundle_ids) {
  if (!_.isArray(specbundle_ids)) {
    return this.specbundle_store.get$(specbundle_ids);
  } else {
    return this.specbundle_store.batch_get$(specbundle_ids);
  }
};

EntityManager.prototype.specbundle__list$ = function(max_length) {
  var self = this;
  return self.specbundle_store.list$(max_length)
  .then(function(ids) {
    return self.specbundle_store.batch_get$(ids);
  });
};

EntityManager.prototype.specbundle__list_specs$ = function(specbundle_id) {
  var self = this;
  return self.specbundle_store.get$(specbundle_id)
  .then(function(specbundle_obj) {
    return self.spec_store.batch_get$(specbundle_obj.specs);
  });
};

// ----------------------------------------------------------------------
// App/Graph related
// ----------------------------------------------------------------------
/**
 * load apps from the appbundle in harddisk
 * 1, readdir the bundle and do _load_app for each app path
 * 2, in _load_app
 *    2.1: read app.json, create app object based on the json
 *    2.2: load each graph.json, create graph object and push the graph_id into app.graphs.
 *    2.3: set ap_obj, graph_obj, ui_obj into store. 
 * @param  {String} appbundle_path the bundle full path
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }           
 */
EntityManager.prototype.app__load_from_bundle$ = function(appbundle_path) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.load_apps$(appbundle_path, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * add an app to backend, including harddisk and appstore.
 * 1, make sure the app_id not exsit before, and it is not builtin.
 * 2, create a app dir, The dirname is app_id.
 * 3, create "graphs" and "ui" as sub-folders under app dir
 * 4, write app.json.
 * 5, appstore.set$.
 * @param {Object} app_obj    app plainobject from frontend 
 * @param {String} appbundle_path the path of app bundle
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.app__add$ = function(app_obj, appbundle_path) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.add_app$(app_obj, appbundle_path, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * update an exsiting app, incliding app.json and appstore.
 * 1, get the old app from appstore, make sure it is exsiting and not bultin
 * 2, get the path from old_app, then re-write the app.json.
 * 3, appstore.set$.
 * @param {Object} app_obj    app plainobject from frontend 
 * @return {Promise}  resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.app__update$ = function(app_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.update_app$(app_obj, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};


EntityManager.prototype.app__get$ = function(app_ids) {
  if (!_.isArray(app_ids)) {
    return this.app_store.get$(app_ids);
  } else {
    return this.app_store.batch_get$(app_ids);
  }
};

/**
 * remove tha app.
 * Note that it includes the app and its all graphs/uis, in both harddisk and store
 * 1, get the old app from appstore, make sure it is exsiting and not builtin
 * 2, delete the app dir in hardisk
 * 3, graphstore.batch_delete all its graphs
 * 4, uistore.batch_delete all its uis
 * 5, appstore.delete
 * @param  {id} app_id     
 * @return {Promise}   resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }         
 */
EntityManager.prototype.app__remove$ = function(app_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.remove_app$(app_id, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.app__list$ = function(max_length) {
  var self = this;
  return self.app_store.list$(max_length)
  .then(function(ids) {
    return self.app_store.batch_get$(ids);
  });
};

EntityManager.prototype.app__list_graphs$ = function(app_id) {
  var self = this;
  return self.app_store.get$(app_id)
  .then(function(app_obj) {
    return self.graph_store.batch_get$(app_obj.graphs);
  });
};

EntityManager.prototype.app__list_uis$ = function(app_id) {
  var self = this;
  return self.app_store.get$(app_id)
  .then(function(app_obj) {
    return self.ui_store.batch_get$(app_obj.uis);
  });
};

/**
 * Add a new graph in the backend. It will be stored in the graph_store and json_file.
 * 1, make sure the graph_id not exsit in the store
 * 2, get the app_id from graph, get the app_obj
 * 3, check whether it is builtin_app. push graph_id into app.graphs, and set the modified app
 * 4, write the graph json file. the filename is graph_id.
 * 5, set the graph in graphstore.
 * @param {Object} graph_obj      the graph object from frontend
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.graph__add$ = function(graph_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.add_graph$(graph_obj, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * Update the exsiting graph, including graphstore and graph_json.
 * 1, get the app_obj from app_store.
 *    make sure it is not builtin, and the graph belongs to the app
 * 2, get the old graph, find the graph path, rewrite the graph_json.
 * 3, graphstore.set new graph.
 * @param {Object} graph_obj      the graph object from frontend
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.graph__update$ = function(graph_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.update_graph$(graph_obj, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.graph__get$ = function(graph_ids) {
  if (!_.isArray(graph_ids)) {
    return this.graph_store.get$(graph_ids);
  } else {
    return this.graph_store.batch_get$(graph_ids);
  }
};

/**
 * remove the graph, including graphstore and graph_json.
 * 1, get rhe graph_obj from graphstore
 * 2, get the corresponding app_obj from appstore, and makesure it is not builtin
 * 3, remove the graph_id from app.graphs, and re-store the app
 * 4, remove the graph json file, and delete the graph from graphstore.
 * @param  {id} graph_id   
 * @return {Promise}    resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }        
 */
EntityManager.prototype.graph__remove$ = function(graph_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.remove_graph$(graph_id, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.graph__list$ = function(max_length) {
  var self = this;
  return self.graph_store.list$(max_length)
  .then(function(ids) {
    return self.graph_store.batch_get$(ids);
  });
};

EntityManager.prototype.graph__get_app$ = function(graph_id) {
  var self = this;
  return self.graph_store.get$(graph_id)
  .then(function(graph_obj) {
    return self.app_store.get$(graph_obj.app);
  });
};

/**
 * Add a new ui in the backend. It will be stored in the ui_store and json_file.
 * 1, make sure the ui_id not exsit in the store
 * 2, get the app_id from ui, get the app_obj
 * 3, check whether it is builtin_app. push ui_id into app.uis, and set the modified app
 * 4, write the ui json file. the filename is ui_id.
 * 5, set the ui in uistore.
 * @param {Object} ui_obj      the ui object from frontend
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.ui__add$ = function(ui_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.add_ui$(ui_obj, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

/**
 * Update the exsiting ui, including uistore and ui_json.
 * 1, get the app_obj from app_store.
 *    make sure it is not builtin, and the ui belongs to the app
 * 2, get the old ui, find the ui path, rewrite the ui_json.
 * 3, uistore.set new ui.
 * @param {Object} ui_obj      the ui object from frontend
 * @return {Promise} resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }
 */
EntityManager.prototype.ui__update$ = function(ui_obj) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.update_ui$(ui_obj, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.ui__get$ = function(ui_ids) {
  if (!_.isArray(ui_ids)) {
    return this.ui_store.get$(ui_ids);
  } else {
    return this.ui_store.batch_get$(ui_ids);
  }
};

/**
 * remove the ui, including uistore and ui_json.
 * 1, get rhe ui_obj from uistore
 * 2, get the corresponding app_obj from appstore, and makesure it is not builtin
 * 3, remove the ui_id from app.uis, and re-store the app
 * 4, remove the ui json file, and delete the ui from uistore.
 * @param  {id} ui_id    
 * @return {Promise}    resolve: {
 *                             list: orgnaized list
 *                             time: {
 *                                   last:
 *                                   now:
 *                                   }
 *                                 }        
 */
EntityManager.prototype.ui__remove$ = function(ui_id) {
  var changed_list = [];
  var self = this;
  var l = this.make_lock();
  return l.lock_as_promise$(function() {
    return App.remove_ui$(ui_id, self, changed_list)
    .then(function() {
      return em_changed(self, changed_list);
    });
  }, 10000, false);
};

EntityManager.prototype.ui__list$ = function(max_length) {
  var self = this;
  return self.ui_store.list$(max_length)
  .then(function(ids) {
    return self.ui_store.batch_get$(ids);
  });
};

EntityManager.prototype.ui__get_app$ = function(ui_id) {
  var self = this;
  return self.ui_store.get$(ui_id)
  .then(function(ui_obj) {
    return self.app_store.get$(ui_obj.app);
  });
};




/**
 * add a user to the user store
 * @param  {Object} user_obj 
 * @return {Promise}     resolved: user_obj  
 */
EntityManager.prototype.user__add$ = function(user_obj) {
  var self = this;
  return User.add_user$(user_obj, self);
};

/**
 * update the user. 
 * @param  {Object} user_obj some updated prop of user, must contain 'id'
 * @return {Promise}     resolved: the updated user
 */
EntityManager.prototype.user__update$ = function(user_obj) {
  var self = this;
  return User.update_user$(user_obj, self);
};

/**
 * get the user obj
 * @param  {string or array} user_ids 
 * @return {Promise}          resolve: the user obj for obj array
 */
EntityManager.prototype.user__get$ = function(user_ids) {
  var self = this;
  return User.get_user$(user_ids, self);
};

/**
 * remove the user
 * @param  {string} user_id id of the user
 * @return {Promise}         resolve: the user id
 */
EntityManager.prototype.user__remove$ = function(user_id) {
  var self = this;
  return User.remove_user$(user_id, self);
};

/**
 * list all the user info
 * @param  {Number} max_length the length of the list
 * @return {Promise}            resolve: Array of the user object
 */
EntityManager.prototype.user__list$ = function(max_length) {
  var self = this;
  return self.user_store.list$(max_length)
  .then(function(ids) {
    return self.user_store.batch_get$(ids);
  });
};
