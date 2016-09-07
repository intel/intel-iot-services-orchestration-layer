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
 * hub Module
 * handle hub
 * @module entity/hub
 */

var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/hub");
var check = B.check;
var fs = require("fs");
var path = require("path");
var Spec = require("./spec");

/**
 * add one hun object to hub_store
 * 1, make sure the hubid not exist before
 * 2, set$
 * @param {object} hub          
 * @param {object} em           
 * @param {array} changed_list 
 */
exports.add_hub$ = function(hub, em, changed_list) {
  log("add hub", hub);
  return Promise.resolve()
  .then(function() {
    return em.hub_store.has$(hub.id);
  })
  .then(function(ret) {
    check(!ret, "entity/hub", "hub already exsit", hub.id);
    return em.hub_store.set$(hub.id, hub, changed_list);
  });
};

/**
 * remove the hub and all entities related to the hub.
 * if the hub is not exist, just delete any way.
 * @param  {String} hubid        
 * @param  {Object} em           
 * @param  {Array} changed_list 
 * @return {Promise}              
 */
exports.remove_hub$ = function(hubid, em, changed_list) {
  log("remove hub", hubid);
  return Promise.resolve()
  .then(function() {
    return em.hub_store.get$(hubid);
  })
  .then(function(hub) {
    if (_.isUndefined(hub)) {
      log("remove non-existing hub", hubid);
      return;
    }
    var thing_id_array = hub.things;
    var tasks = [];
    thing_id_array.forEach(function(id) {
      tasks.push(remove_thing_and_followings$(id, em, changed_list));
    });
    return Promise.all(tasks);
  })
  .then(function() {
    return em.hub_store.delete$(hubid, changed_list);
  });
};

function remove_thing_and_followings$(thingid, em, changed_list) {
  log("remove_thing_and_followings", thingid);
  var service_id_array;
  return Promise.resolve()
  .then(function() {
    return em.thing_store.get$(thingid);
  })
  .then(function(thing) {
    check(!_.isUndefined(thing), "entity/hub", "the thing not exist in the store", thingid);
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
  });
}

