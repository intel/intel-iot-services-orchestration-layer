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
 * Store base module
 * @module store/store
 */

var B = require("hope-base");
var _ = require("lodash");

var EventEmitter = require("eventemitter3");
var log = B.log.for_category("store");
/**
 * @class base store
 */
function Store(type, config) {
  this.type = type;
  this.config = config || {};
  this.id = this.config.id || B.unique_id("HOPE_STORE_");
  this.timestamp = new Date();
  this.timestamp_old = 0;
  this.event = new EventEmitter();
}

/**
 * This would update the timestamp (i.e. indiction of the state of Store)
 * and generate related events
 * 
 * Format of changed_data is {
 *   type: "set" or "delete",
 *   data: ...
 * }
 * If type is set, data would be [[key1, value1], [key2, value2], ...]
 * If type is delete, data would be [key1, key2, ...]
 * @param  {Object} changed_data 
 */
Store.prototype.announce_changed = function(changed_data) {
  this.timestamp_old = this.timestamp;
  this.timestamp = new Date();
  this.event.emit("changed", {
    id: this.id,
    timestamp: this.timestamp,
    timestamp_old: this.timestamp_old,
    changed: changed_data
  });
};

Store.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/STORE/" + this.id + "/" + 
    (_.isUndefined(key) ? "" : key)); 
};

//async/virtual methods. the specific store class will implement them.
Store.prototype.init$ = B.type.get_func_not_impl();

Store.prototype.set$ = B.type.get_func_not_impl("key", "value");

Store.prototype.get$ = B.type.get_func_not_impl("key");

Store.prototype.has$ = B.type.get_func_not_impl("key");

Store.prototype.delete$ = B.type.get_func_not_impl("key");

Store.prototype.batch_set$ = B.type.get_func_not_impl([["key1", "value1"], ["key2", "value2"], "..."]);

Store.prototype.batch_get$ = B.type.get_func_not_impl(["key1", "key2", "..."]);

Store.prototype.batch_has$ = B.type.get_func_not_impl(["key1", "key2", "..."]);

Store.prototype.batch_delete$ = B.type.get_func_not_impl(["key1", "key2", "..."]);

Store.prototype.size$ = B.type.get_func_not_impl();

Store.prototype.list$ = B.type.get_func_not_impl("maxlength");


/**
 * get and the process the value. wit lock protection
 * 1, lock, id is store_id + key;
 * 2, get(key)
 * 3, var ret = process_func(value)
 * 4, release
 * 5, resolve(ret's resolved value)
 * @param  {Number||String}   key 
 * @param  {Function} process_func  the process function after get the value
 * @return {Promise}       resolve: the process_func(value)'s resolved value
 */
Store.prototype.get_with_lock$ = function(key, process_func) {
  log("get_with_lock", key);
  var self = this;
  return new Promise(function(resolve, reject) {
    var l = self.make_lock(key);
    l.lock(function() {
      self.get$(key)
      .then(function(value) {
        return process_func(value);
      })
      .then(function(x) {
        l.release();
        resolve(x);
      }).catch(function(e) {
        reject(e);
      }).done();
    }, 10000, false, 
    function giveup() {
      log.warn("lock_giveup in get_with_lock", key);
      reject(Store.LOCK_GIVEUP);
    }, true);
  });
};

/**
 * batch get and process the values, with lock protection
 * 1, lock each key
 * 2, Promise.all all values
 * 3, process_func(values)
 * 4, release each locker
 * @param  {Array}   key_array 
 * @param  {Function} process_func        process function for values
 * @return {Promise}            the resolved value of process_func(values)
 */
Store.prototype.batch_get_with_lock$ = function(key_array, process_func) {
  log("batch_get_with_lock", key_array);
  var self = this;
  var l_array = [];
  return new Promise(function(resolve, reject) {
    key_array.forEach(function(key) {
      l_array.push(self.make_lock(key));
    });
    var tasks = [];
    _.forEach(l_array, function(l, index) {
      l.lock(function() {
        tasks.push(self.get$(key_array[index]));
        if (tasks.length === key_array.length) {
          Promise.all(tasks).then(function(values) {
            return process_func(values);
          })
          .then(function(x) {
            l_array.forEach(function(l) {
              l.release();
            });
            resolve(x);
          })
          .catch(function(e) {
            reject(e);
          }).done();
        }
      }, 10000, false,
      function giveup() {
        log.warn("lock_giveup in batch_get_with_lock", key_array[index]);
        reject(Store.LOCK_GIVEUP);
      }, true);
    });
  });
};

Store.prototype.query$ = B.type.get_func_not_impl("filter_function", "options");

/**
 * store's invalid key error message
 * @type {String}
 * @constant
 */
Store.INVALID_KEY = "invalid key";

Store.LOCK_GIVEUP = "lock give up";
/**
 * 
 * Return an error object which has origianl_args and finished_args
 * it will happen when we using batch_xxx methods
 * @param  {String} message       error message
 * @param  {Array} original_args 
 * @param  {Array} finished_args 
 * @return {Object}               Promise reject error object
 */
Store.new_batch_error = function(message, original_args, finished_args) {
  var err = new Error(message);
  err.original_args = original_args;
  err.finished_args = finished_args;
  return err;
};

module.exports = Store;