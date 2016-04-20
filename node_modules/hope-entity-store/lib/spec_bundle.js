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
 * specbundle store
 * @module entity-store/specbundle
 */
var B = require("hope-base");
var CommonStore = require("./common.js");
var _ = require("lodash");
var check = B.check;
module.exports = SpecBundleStore;
var log = B.log.for_category("entity-store/spec_bundle");



var specbundle_schema = {};

// check whether the specbundle obj obey the specbundle schema
// specbundle: {
//  id: string||number
//  name: string
//  specs: [id1, id2, ...]
//  path: string (optional)
// }
function check_specbundle_schema (value) {
  try {
    check(_.isString(value.id) || _.isNumber(value.id), "entity-store/specbundle", "invalid id", value);
    check(_.isString(value.name), "entity-store/specbundle", "invalid name", value);
    check(_.isArray(value.specs), "entity-store/specbundle", "invalid specs", value);
    value.specs.forEach(function(spec) {
      check(_.isString(spec) || _.isNumber(spec), "entity-store/specbundle", "invalid spec id", value);
    });
    return true;
  } catch (e) {
    log.error("check_schema", e);
    return false;
  }
}


//check_specbundle_func_object has two members
//"one": the check pair function, return boolean
//"batch": the check pair array function, return array of valid pairs
var check_specbundle_func_object = CommonStore.generate_check_schema(check_specbundle_schema, specbundle_schema);
var check_specbundle_pair =  check_specbundle_func_object.one;
var check_specbundle_pair_array = check_specbundle_func_object.batch;
/**
 * @class specbundle-store class
 * @extends CommonStore
 * @param {String} type pass to CommonStore
 * @param {Object} config pass to CommonStore
 */
function SpecBundleStore(type, config) {
  this.type = "specbundle";
  CommonStore.call(this, type, config);

}

B.type.inherit(SpecBundleStore, CommonStore);

SpecBundleStore.prototype.set$ = function(key, value, list) {
  if (check_specbundle_pair(key, value)) {
    return this._set$(key, value, list);
  }
  else {
    return Promise.reject(CommonStore.CHECK_FAIL);
  }
};

SpecBundleStore.prototype.batch_set$ = function(pair_array, list) {
  var valid_array = check_specbundle_pair_array(pair_array);
  if (!_.isEqual(pair_array, valid_array)) {
    return Promise.reject(CommonStore.new_batch_error(CommonStore.CHECK_FAIL, pair_array, []));
  }
  else {
    return this._batch_set$(valid_array, list);
  }
};
