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
 * graph store
 * @module entity-store/graph
 */
var B = require("hope-base");
var CommonStore = require("./common.js");
var _ = require("lodash");
var check = B.check;
module.exports = GraphStore;



var graph_schema = {};

// check whether the graph obj obey the graph schema
// graph: {
//  id: string||number
//  name: string
//  app: string||number
//  path: string
// }
function check_graph_schema (value) {
  try {
    check(_.isString(value.id) || _.isNumber(value.id), "entity-store/graph", "invalid id", value);
    check(_.isString(value.name), "entity-store/graph", "invalid name", value);
    check(_.isString(value.path), "entity-store/graph", "invalid path", value);
    check(_.isString(value.app) || _.isNumber(value.app), "entity-store/graph", "invalid app", value);
    return true;
  } catch (e) {
    return false;
  }
}


//check_graph_func_object has two members
//"one": the check pair function, return boolean
//"batch": the check pair array function, return array of valid pairs
var check_graph_func_object = CommonStore.generate_check_schema(check_graph_schema, graph_schema);
var check_graph_pair =  check_graph_func_object.one;
var check_graph_pair_array = check_graph_func_object.batch;
/**
 * @class graph-store class
 * @extends CommonStore
 * @param {String} type pass to CommonStore
 * @param {Object} config pass to CommonStore
 */
function GraphStore(type, config) {
  this.type = "graph";
  CommonStore.call(this, type, config);
}

B.type.inherit(GraphStore, CommonStore);

GraphStore.prototype.set$ = function(key, value, list) {
  if (check_graph_pair(key, value)) {
    return this._set$(key, value, list);
  }
  else {
    return Promise.reject(CommonStore.CHECK_FAIL);
  }
};

GraphStore.prototype.batch_set$ = function(pair_array, list) {
  var valid_array = check_graph_pair_array(pair_array);
  if (!_.isEqual(pair_array, valid_array)) {
    return Promise.reject(CommonStore.new_batch_error(CommonStore.CHECK_FAIL, pair_array, []));
  }
  else {
    return this._batch_set$(valid_array, list);
  }
};
