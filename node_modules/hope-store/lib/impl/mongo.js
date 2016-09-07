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
 * store in mongodb
 * @module store/mongo
 */

var B = require("hope-base");
var Store = require("../store");
var _ = require("lodash");
var check_warn = B.check_warn;
var log = B.log.for_category("store/memory");
var MongoClient = require('mongodb').MongoClient;

module.exports = StoreMongo;

function is_valid_key(k) {
  return _.isNumber(k) || _.isString(k);
}

function StoreMongo(config) {
  Store.call(this, "mongo", config);
}


B.type.inherit(StoreMongo, Store);

StoreMongo.prototype.init$ = function() {
  var url = this.config.url;
  log("init", "connect", url);
  var self = this;
  return MongoClient.connect(url).then(function(db) {
    return db.createCollection(self.config.collection_name);
  }).then(function(collection) {
    self.collection = collection;
    return collection.deleteMany({});//TODO: now we clean the collection when bootup
  }).then(function() {
    return self.collection;
  });
};

StoreMongo.prototype.set$ = function(key, value) {
  log("set", key, value);
  if (check_warn(is_valid_key(key), "store/mongo", "invalid key:", key)) {
    return this.collection.findOneAndUpdate(
      {k:key},
      {$set: {v:value}},
      {upsert:true, returnOriginal: false})
    .then(function(result) {
      return result.value.v;
    });
  }
  return Promise.reject(new Error(Store.INVALID_KEY));
};



StoreMongo.prototype.get$ = function(key) {
  log("get", key);
  if (check_warn(is_valid_key(key), "store/mongo", "invalid key:", key)) {
    return this.collection.findOne({k:key})
    .then(function(doc) {
      if (doc) {
        return doc.v;
      }
      else {
        return undefined;
      }
    });
  }
  else {
    return Promise.reject(new Error(Store.INVALID_KEY));
  }
};

StoreMongo.prototype.has$ = function(key) {
  log("has", key);
  if (check_warn(is_valid_key(key), "store/mongo", "invalid key:", key)) {
    return this.collection.findOne({k:key})
    .then(function(doc) {
      return !!doc;
    });
  }
  else {
    return Promise.reject(new Error(Store.INVALID_KEY));
  } 
};

StoreMongo.prototype.delete$ = function(key) {
  log("delete", key);
  if (check_warn(is_valid_key(key), "store/mongo", "invalid key:", key)) {
    return this.collection.deleteOne({k:key})
    .then(function() {
      return key;
    });
  }
  return Promise.reject(new Error(Store.INVALID_KEY));
};

StoreMongo.prototype.batch_set$ = function(pair_array) {
  log("batch_set", pair_array);
  var self = this;
  var tasks = [];
  _.forEach(pair_array, function(pair, index) {
    if (check_warn(is_valid_key(pair[0]), "store/mongo",
      "invalid key", pair[0], pair, index, pair_array)) {
      tasks.push(self.collection.findOneAndUpdate(
        {k:pair[0]},
        {$set: {v:pair[1]}},
        {upsert:true, returnOriginal: false})
        .then(function() {
          return pair;
        }));
    }
    else {
      return false;
    }
  });
  return Promise.all(tasks).then(function(ret) {
    if (_.isEqual(ret, pair_array)) {
      return ret;
    } else {
      throw Store.new_batch_error(Store.INVALID_KEY, pair_array, ret);
    }
  });
};

StoreMongo.prototype.batch_get$ = function(key_array) {
  log("batch_get", key_array);
  var self = this;
  var tasks = [];
  _.forEach(key_array, function(key, index) {
    if (check_warn(is_valid_key(key), "store/mongo", "invalid key in argument",
                  key, index, key_array))
    {
      tasks.push(self.collection.findOne({k:key})
        .then(function(doc) {
          if (doc) {
            return doc.v;
          }
          else {
            return undefined;
          }
        }));
    }
    else {
      tasks.push(Promise.resolve(undefined));
    }
  });
  return Promise.all(tasks);
};

StoreMongo.prototype.batch_has$ = function(key_array) {
  log("batch_has", key_array);
  var self = this;
  var tasks = [];
  _.forEach(key_array, function(key, index) {
    if (check_warn(is_valid_key(key), "store/mongo", "invalid key in argument",
                  key, index, key_array))
    {
      tasks.push(self.collection.findOne({k:key})
        .then(function(doc) {
          return !!doc;
        }));
    }
    else {
      tasks.push(Promise.resolve(undefined));
    }
  });
  return Promise.all(tasks);
};

StoreMongo.prototype.batch_delete$ = function(key_array) {
  log("batch_delete", key_array);
  var self = this;
  var tasks = [];
  _.forEach(key_array, function(key, index) {
    if (check_warn(is_valid_key(key), "store/mongo", "invalid key in argument",
                  key, index, key_array))
    {
      tasks.push(self.collection.deleteOne({k:key})
        .then(function() {
          return key;
        }));
    }
  });
  return Promise.all(tasks);
};

StoreMongo.prototype.size$ = function() {
  log("size");
  return this.collection.count({});
};

StoreMongo.prototype.list$ = function(max_length) {
  log("list", max_length);
  var self = this;
  if (_.isNumber(max_length) && max_length >= 0) {
    return new Promise(function(resolve, reject) {
        self.collection.find().limit(max_length).toArray(function(e, items) {
        if (e) {
          reject(e);
        }
        var ret = [];
        items.forEach(function(item) {
          ret.push(item.k);
        });
        resolve(ret);
      });
    });
  }
  return new Promise(function(resolve, reject) {
    self.collection.find().toArray(function(e, items) {
      if (e) {
        reject(e);
      }
      var ret = [];
      items.forEach(function(item) {
        ret.push(item.k);
      });
      resolve(ret);
    });
  });
};