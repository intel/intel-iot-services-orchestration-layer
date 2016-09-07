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
 * Store Module
 * @module store
 */

var fs = require("fs");
var _ = require("lodash");
var B = require("hope-base");
var Store = require("./lib/store.js");
var check = B.check;

// search the js file in lib/impl,
// and return them as a type array
function get_store_type_list() {
  var ret = [];
  var p = B.path.join(__dirname, "lib/impl");
  var files = fs.readdirSync(p);
  files.forEach(function(file) {
    if (B.path.ext(file) === ".js") {
      ret.push(B.path.base(file, ".js"));
    }
  });
  return ret;
}

var store_type_list = get_store_type_list();

// check if the type is in the store_type_list
function is_supported_type(type)
{
  return (_.indexOf(store_type_list, type) !== -1);
}

/**
 * Create a store based on type
 * @param  {String} type  the type of store
 * @param {Object} config other config infos of store
 * @return {Promise}       resolve: the store object
 */
exports.create_store$ = function(type, config)
{
  var s;//derived store
  return Promise.resolve()
  .then(function() {
    check(is_supported_type(type), "store", "the type is not supported", type, store_type_list);
    var S_derived = require("./lib/impl/" + type + ".js"); // the specific class of store
    B.type.should_impl(S_derived, Store);
    s = new S_derived(config);
    return s.init$();
  }).then(function() {
    return s;
  });
};

/**
 * show the suported type
 * @return {Array}   array of types
 */
exports.list_supported_type = function() {
  return store_type_list;
};

/**
 * one exception reason
 * @constant
 * @type {String}
 */
exports.EXC_INVALID_KEY = Store.INVALID_KEY;

/**
 * 
 * Return an error object which has origianl_args and finished_args
 * it will happen when we using batch_xxx methods
 * @param  {String} message       error message
 * @param  {Array} original_args 
 * @param  {Array} finished_args 
 * @return {Object}               Promise reject error object
 */
exports.new_batch_error = Store.new_batch_error;

/**
 * Factories for assemble
 * @type {Object}
 */
exports.$factories = {
  Store: exports.create_store$
};
