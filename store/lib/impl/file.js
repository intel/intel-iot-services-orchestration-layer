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
 * store in file
 * @module store/file
 */

var B = require("hope-base");
var Store = require("../store");
var _ = require("lodash");
var check_warn = B.check_warn;
var log = B.log.for_category("store/file");


module.exports = StoreFile;

function is_valid_key(k) {
  return _.isNumber(k) || _.isString(k);
}


/**
 * @class store in file, 
 * @extends {Store}
 */
function StoreFile(config) {
  Store.call(this, "file", config);

  B.check(this.config.path && _.isString(this.config.path), "store/file", "file path required");
}

B.type.inherit(StoreFile, Store);

/**
 * Init the store.
 * @return {Promise} 
 */
StoreFile.prototype.init$ = function() {
  log("init");

  var p = this.config.path;
  if (!B.fs.file_exists(p)) {
    B.fs.mkdirp_for_file(p);
    B.fs.write_json(p, {});
  }
  return Promise.resolve();
};

/**
 * async set a key-value pair in the store.
 * 
 * @param  {number|string} key   
 * @param  {any} value 
 * @return {Promise}       resolve: value
 *                         reject: Store.INVALID_KEY
 */
StoreFile.prototype.set$ = function(key, value) {
  log("set", key, value);
  if (check_warn(is_valid_key(key), "store/file", "invalid key:", key)) {
    var json = B.fs.read_json(this.config.path);
    json[key] = value;
    B.fs.write_json(this.config.path, json);
    this.announce_changed({
      type: "set",
      data: [[key, value]]
    });
    return Promise.resolve(value);
  }
  return Promise.reject(Store.INVALID_KEY);
};



/**
 * async get a value by giving the key.
 * 
 * @param  {number|string} key 
 * @return {Promise(any)}     resolve: pair's value
 *                            reject: Store.INVALID_KEY
 */
StoreFile.prototype.get$ = function(key) {
  log("get", key);
  if (check_warn(is_valid_key(key), "store/file", "invalid key:", key)) {
    var json = B.fs.read_json(this.config.path);
    return Promise.resolve(_.cloneDeep(json[key]));
  }
  else {
    return Promise.reject(Store.INVALID_KEY);
  }
};


/**
 * async check whether the store has the key.
 * 
 * @param  {number|string} key 
 * @return {Promise}              resolve: true - the key exsit
 *                                         false - the key not exsit
 *                                reject:  Store.INVALID_KEY
 */
StoreFile.prototype.has$ = function(key) {
  log("has", key);
  var ret;
  if (check_warn(is_valid_key(key), "store/file", "invalid key:", key)) {
    var json = B.fs.read_json(this.config.path);
    if (_.isUndefined(json[key])) {
      ret = false;
    }
    else {
      ret = true;
    }
    return Promise.resolve(ret);
  }
  else {
    return Promise.reject(Store.INVALID_KEY);
  }
  
};

/**
 * async delete the key-value pair in the store.
 * 
 * @param  {number|string} key  
 * @return {Promise}       resolve: key
 *                         reject: Store.INVALID_KEY
 */
StoreFile.prototype.delete$ = function(key) {
  log("delete", key);
  if (check_warn(is_valid_key(key), "store/file", "invalid key:", key)) {
      var json = B.fs.read_json(this.config.path);
      delete json[key];
      B.fs.write_json(this.config.path, json);
      this.announce_changed({
        type: "delete",
        data: [key]
      });      
      return Promise.resolve(key);
  }
  return Promise.reject(Store.INVALID_KEY);
 
};

/**
 * async set a batch of key-value pairs.
 * @param {Array} pair_array array of pairs, and each pair
 *                                        is [key, value]
 * @example
 * batch_set$([[key1, value1], [key2, value2], ...])
 * @return {Promise(Array)}       resolve: the pair_array
 *                                reject: the batch_error_object
 */
StoreFile.prototype.batch_set$ = function(pair_array) {
  log("batch_set", pair_array);
  var json = B.fs.read_json(this.config.path);
  var finished = [];
  _.forEach(pair_array, function(pair, index) {
    if (check_warn(is_valid_key(pair[0]), "store/file",
      "invalid key", pair[0], pair, index, pair_array)) {
      json[pair[0]] = _.cloneDeep(pair[1]);
      finished.push(pair);
    }
    else {
      return false;
    }
  });
  this.announce_changed({
    type: "set",
    data: finished
  });

  if (_.isEqual(finished, pair_array)) {
    B.fs.write_json(this.config.path, json);
    return Promise.resolve(finished);
  }
  else {
    return Promise.reject(Store.new_batch_error(Store.INVALID_KEY, pair_array, finished));
  }
  
};




/**
 * async get a batch of values by giving a batch of keys.
 * @param {Array} key_array the array of keys
 * @return {Promise(Array)} the promise whose resolved value is array of values 
 * @example
 * batch_get$([key1, key2, key3]).then(function([value1, value2, value3]))
 */
StoreFile.prototype.batch_get$ = function(key_array) {
  log("batch_get", key_array);
  var ret = [];
  var json = B.fs.read_json(this.config.path);
  _.forEach(key_array, function(key, index) {
    if (check_warn(is_valid_key(key), "store/file", "invalid key in argument",
                  key, index, key_array))
    {
      ret.push(_.cloneDeep(json[key]));
    }
    else {
      ret.push(undefined);
    }
  });
  return Promise.resolve(ret);
};

/**
 * async check whether a batch of keys are in the store.
 * @param {Array} key_array the array of keys
 * @return {Promise(Array(boolean))} Promise whose resolve value is array of booleans
 *                                   if the key is invalid, the corresponding 
 *                                   result is undefiend.  
 * @example
 * batch_has$([key1, key2, key3, ...])
 */
StoreFile.prototype.batch_has$ = function(key_array) {
  log("batch_has", key_array);
  var ret = [];
  var json = B.fs.read_json(this.config.path);
  _.forEach(key_array, function(key, index) {
    if (check_warn(is_valid_key(key), "store/file", "invalid key in argument",
              key, index, key_array))
    {
      if (_.isUndefined(json[key])) {
        ret.push(false);
      }else {
        ret.push(true);
      }
    }
    else {
      ret.push(undefined);
    }
  });
  return Promise.resolve(ret);
};

/**
 * async delete a batch of key-value pairs in store.
 *
 * @param {Array} key_array the array of keys
 * @return {Promise(Array)}       Promise whose resolved value is 
 *                                the array of finished keys
 * @example
 * delete$([key1, key2, key3, ...])
 */
StoreFile.prototype.batch_delete$ = function(key_array) {
  log("batch_delete", key_array);
  var json = B.fs.read_json(this.config.path);
  var finished = [];
  _.forEach(key_array, function(key, index) {
    if (check_warn(is_valid_key(key), "store/file", "invalid key in argument",
                  key, index, key_array))
    {
      delete json[key];
      finished.push(key);
    }
  });
  this.announce_changed({
    type: "set",
    data: finished
  });
  if (finished.length > 0) {
    B.fs.write_json(this.config.path, json);
  }
  return Promise.resolve(finished);
};

/**
 * async get the size of the store: the number of pairs
 * @return {Number} the size
 */
StoreFile.prototype.size$ = function() {
  log("size");
  var json = B.fs.read_json(this.config.path);
  var size = Object.keys(json).length;
  return Promise.resolve(size);
};

/**
 * async query keys based on filter function
 * @param  {Function} filter if filter(value) returns true, 
 *                           then the key will be returned
 * @param {Object} options   other options for query (TODO)
 * @return {Array}           array of keys
 */
/*
StoreFile.prototype.query$ = function(filter, options) {
  var ret = [];
  if (check_warn(_.isFunction(filter), "store/file", 
    "in query$, filter is not a function", filter)) {
    var json = B.fs.read_json(this.config.path);
    _.forEach(json, function(value, key) {
      try {
        if (filter(value) === true) {
          ret.push(key);
        }
      } catch (e) {
        log.warn("store/file", "filter exception in query", e);
      }
    });
  }
  return Promise.resolve(ret);
};
*/

/**
 * async list keys 
 * @param {Number} max_length   the max number of keys will be listed
 * @return {Array}           array of keys
 */
StoreFile.prototype.list$ = function(max_length) {
  log("list", max_length);
  var json = B.fs.read_json(this.config.path);
  var ret = Object.keys(json);
  if (_.isNumber(max_length) && max_length >= 0) {
    ret = ret.slice(0, max_length);
  }
  return Promise.resolve(ret);
};




