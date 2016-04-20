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
 * ui store
 * @module entity-store/ui
 */
var B = require("hope-base");
var CommonStore = require("./common.js");
var _ = require("lodash");
var check = B.check;
module.exports = UiStore;



var ui_schema = {};

// check whether the ui obj obey the ui schema
// ui: {
//  id: string||number
//  name: string
//  path: string
//  app: string
// }
function check_ui_schema (value) {
  try {
    check(_.isString(value.id) || _.isNumber(value.id), "entity-store/ui", "invalid id", value);
    check(_.isString(value.name), "entity-store/ui", "invalid name", value);
    check(_.isString(value.app), "entity-store/ui", "invalid app", value);
    check(_.isString(value.path), "entity-store/ui", "invalid path", value);
    return true;
  } catch (e) {
    return false;
  }
}


//check_ui_func_object has two members
//"one": the check pair function, return boolean
//"batch": the check pair array function, return array of valid pairs
var check_ui_func_object = CommonStore.generate_check_schema(check_ui_schema, ui_schema);
var check_ui_pair =  check_ui_func_object.one;
var check_ui_pair_array = check_ui_func_object.batch;
/**
 * @class ui-store class
 * @extends CommonStore
 * @param {String} type pass to CommonStore
 * @param {Object} config pass to CommonStore
 */
function UiStore(type, config) {
  this.type = "ui";
  CommonStore.call(this, type, config);

}

B.type.inherit(UiStore, CommonStore);

UiStore.prototype.set$ = function(key, value, list) {
  if (check_ui_pair(key, value)) {
    return this._set$(key, value, list);
  }
  else {
    return Promise.reject(CommonStore.CHECK_FAIL);
  }
};

UiStore.prototype.batch_set$ = function(pair_array, list) {
  var valid_array = check_ui_pair_array(pair_array);
  if (!_.isEqual(pair_array, valid_array)) {
    return Promise.reject(CommonStore.new_batch_error(CommonStore.CHECK_FAIL, pair_array, []));
  }
  else {
    return this._batch_set$(valid_array, list);
  }
};
