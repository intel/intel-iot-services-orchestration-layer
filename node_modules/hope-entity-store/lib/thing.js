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
 * thing store
 * @module entity-store/thing
 */
var B = require("hope-base");
var CommonStore = require("./common.js");
var _ = require("lodash");
var check = B.check;
module.exports = ThingStore;



var thing_schema = {};

// check whether the thing obj obey the thing schema
// thing: {
//  id: string||number
//  name: string
//  services: [id1, id2, ...]
//  hub: string||number
//  is_connect: boolean
//  is_builtin: boolean
//  type: string
// }
function check_thing_schema (value) {
  try {
    check(_.isString(value.id) || _.isNumber(value.id), "entity-store/thing", "invalid id", value);
    check(_.isString(value.hub) || _.isNumber(value.hub), "entity-store/thing", "invalid hub", value);
    check(_.isString(value.name), "entity-store/thing", "invalid name", value);
    check(_.isString(value.type), "entity-store/thing", "invalid type", value);
    check(_.isArray(value.services), "entity-store/thing", "invalid services", value);
    check(_.isBoolean(value.is_connect), "entity-store/thing", "invalid is_connect", value);
    check(_.isBoolean(value.is_builtin), "entity-store/thing", "invalid is_builtin", value);
    value.services.forEach(function(service) {
      check(_.isString(service) || _.isNumber(service), "entity-store/thing", "invalid service id", value);
    });
    return true;
  } catch (e) {
    return false;
  }
}


//check_thing_func_object has two members
//"one": the check pair function, return boolean
//"batch": the check pair array function, return array of valid pairs
var check_thing_func_object = CommonStore.generate_check_schema(check_thing_schema, thing_schema);
var check_thing_pair =  check_thing_func_object.one;
var check_thing_pair_array = check_thing_func_object.batch;
/**
 * @class thing-store class
 * @extends CommonStore
 * @param {String} type pass to CommonStore
 * @param {Object} config pass to CommonStore
 */
function ThingStore(type, config) {
  this.type = "thing";
  CommonStore.call(this, type, config);

}

B.type.inherit(ThingStore, CommonStore);

ThingStore.prototype.set$ = function(key, value, list) {
  if (check_thing_pair(key, value)) {
    return this._set$(key, value, list);
  }
  else {
    return Promise.reject(new Error(CommonStore.CHECK_FAIL));
  }
};

ThingStore.prototype.batch_set$ = function(pair_array, list) {
  var valid_array = check_thing_pair_array(pair_array);
  if (!_.isEqual(pair_array, valid_array)) {
    return Promise.reject(CommonStore.new_batch_error(CommonStore.CHECK_FAIL, pair_array, []));
  }
  else {
    return this._batch_set$(valid_array, list);
  }
};
