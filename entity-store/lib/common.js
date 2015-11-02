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
 * common store
 * @module entiry-store/common
 */
var B = require("hope-base");
var S = require("hope-store");
var _ = require("lodash");
var check = B.check;
var check_warn = B.check_warn;

module.exports = CommonStore;

/**
 * the common part of different entity-stores
 * @class the common store, used as base class
 * @param {String} type the type of store
 * @param {Object} config the config for store creation
 */
function CommonStore(type, config)
{
  this.store_type = type;
  this.store_config = config;
  if (type === "mongo") {
    this.store_config.collection_name = this.type;
  }
}

// the common check of all type of pairs
function check_common_pair(key, value) {
  return key === value.id;
}

/**
 * generate the schema-check functions for hope entities
 * @param  {Function} check_schema the function provided to check schema
 * @param  {Object} schema       the schema object, may be used by check_schema
 * @return {Object}             obj.one: function(key, value), return boolean;
 *                              obj.batch: function(pair_array), return array of valid pairs
 */
CommonStore.generate_check_schema = function(check_schema, schema) {
  check(_.isFunction(check_schema), "entity-stores/common", 
    "check_schema is not function", check_schema);

  //return boolean
  function customed_check_pair(key, value) {
    return check_warn(check_schema(value, schema) && check_common_pair(key, value),
      "entity-stores/common", "check_schema_fail", key, value);
  }

  //return new array of valid pairs
  function customed_check_pair_array(pair_array) {
    var valid_pair_array = [];
    _.forEach(pair_array, function(pair) {
      if (customed_check_pair(pair[0], pair[1])) {
        valid_pair_array.push(pair);
      }
    });
    return valid_pair_array;
  }

  return {
    one: customed_check_pair,
    batch: customed_check_pair_array
  };
};

/**
 * the schema check fail 
 * @constant
 */
CommonStore.CHECK_FAIL = "schema_check_fail";

/**
 * 
 * Return an error object which has origianl_args and finished_args
 * @param  {String} message       error message
 * @param  {Array} original_args 
 * @param  {Array} finished_args 
 * @return {Object}               Promise reject error object
 */
CommonStore.new_batch_error = S.new_batch_error;

/**
 * init the base store
 * @return {Promise} 
 */
CommonStore.prototype.init$ = function() {
  var self = this;
  return S.create_store$(this.store_type, this.store_config)
  .then(function(obj) {
    self.store = obj;
    return;
  });
};

/**
 * get store's type
 * @return {String} Store's type
 */
CommonStore.prototype.get_store_type = function() {
  return this.store.type;
};

CommonStore.prototype._set$ = function(key, value, list) {
  var self = this;
  return this.store.set$(key, value)
  .then(function(x) {
    if (_.isArray(list)) {
      list.push({
        type: self.type,
        cmd: "set",
        id: key,
        obj: value
      });
    }
    return x;
  });
};


CommonStore.prototype.get$ = function(key) {
  return this.store.get$(key);
};

CommonStore.prototype.get_with_lock$ = function(key, cb) {
  return this.store.get_with_lock$(key, cb);
};

CommonStore.prototype.has$ = function(key) {
  return this.store.has$(key);
};


CommonStore.prototype.delete$ = function(key, list) {
  var self = this;
  return this.store.delete$(key)
  .then(function(ret) {
    if (ret && _.isArray(list)) {
      list.push({
        type: self.type,
        cmd: "delete",
        id: key
      });
    }
    return ret;
  });
};


CommonStore.prototype._batch_set$ = function(pair_array, list) {
  if (_.isEmpty(pair_array)) {
    return Promise.resolve([]);
  }
  var self = this;
  return this.store.batch_set$(pair_array)
  .then(function(finished_pairs) {
    if (_.isArray(list)) {
      var unziped = _.unzip(pair_array);
      list.push({
        type: self.type,
        cmd: "set",
        id: unziped[0],
        obj: unziped[1]
      });
    }
    return finished_pairs;
  }, function fail(e) {
    if (_.isArray(list)) {
      var unziped = _.unzip(e.finished_args);
      list.push({
        type: self.type,
        cmd: "set",
        id: unziped[0],
        obj: unziped[1]
      });
    }
    throw e;
  });
};

CommonStore.prototype.batch_get_with_lock$ = function(key_array, cb) {
  return this.store.batch_get_with_lock$(key_array, cb);
};

CommonStore.prototype.batch_get$ = function(key_array) {
  return this.store.batch_get$(key_array);
};


CommonStore.prototype.batch_has$ = function(key_array) {
  return this.store.batch_has$(key_array);
};


CommonStore.prototype.batch_delete$ = function(key_array, list) {
  var self = this;
  return this.store.batch_delete$(key_array)
  .then(function(rets) {
    if (_.isArray(list)) {
      var array = _.clone(key_array);
      _.forEach(rets, function(ret, index) {
        if (!ret) {
          delete array[index];
        }
      });
      list.push({
        type: self.type,
        cmd: "delete",
        id: array
      });
    }
    return rets;
  });
};


CommonStore.prototype.size$ = function() {
  return this.store.size$();
};

/*
CommonStore.prototype.query$ = function(filter, options) {
  return this.store.query$(filter, options);
};
*/
CommonStore.prototype.list$ = function(max_length) {
  return this.store.list$(max_length);
};

