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
 * Type module
 * @module  base/type
 */


var util = require("util");
var _ = require("lodash");
var C = require("./check");

/**
 * Check whether it is a string representation of a number
 * @param  {String}  s 
 * @return {Boolean}   true if it is a string for a number
 */
exports.is_numeric = function(s) {
  return _.isString(s) && /^-{0,1}\d*\.{0,1}\d+$/.test(s);
};


/**
 * A function does nothing
 * @return {Function} An empty function
 */
exports.func_noop = function() {};



/**
 * A function that throws an not implemented Error.
 * @throws {Error} Always throws an error
 * @return {Function} 
 */
exports.func_not_impl = function() {
  throw new Error("<NOT Implemented>");
};

/**
 * This is to help describe the signature for the function not impl.
 * @example
 * // this hints that the function would take two params
 * // while they have no effect to the func_not_impl returned
 * Clazz.prototype.to_be_impl = hope_base.get_func_not_impl("arg1", "arg2");
 * @return {[type]} [description]
 */
exports.get_func_not_impl = function() {
  return exports.func_not_impl;
};


/**
 * Type inheritance
 * @param  {Function} child  
 * @param  {Function} parent 
 */
exports.inherit = function(child, parent) {
  util.inherits(child, parent);
};

/**
 * Ensure the not implemented functions in parent has been implemented by 
 * its child. It checks the functions in both parent (i.e. class methods) 
 * and parent.prototype (i.e. object methods), and consider it as unimplemented
 * if it equals to func_not_impl
 *
 * An exception would throw if it found at least one function isn't implemented.
 *
 * NOTE that this only checks one level of prototype chain
 *   
 * @param  {Function} child  
 * @param  {Function} parent 
 * @throws {Error} If there is func_not_impl isn't replaced
 */
exports.should_impl = function(child, parent) {
  C.check(_.isFunction(child), "base/should_impl", "child should be a function");
  C.check(_.isFunction(parent), "base/should_impl", "parent should be a function");

  _.forOwn(parent, function(v, k) {
    if (parent[k] === exports.func_not_impl && 
      (!_.isFunction(child[k]) || child[k] === exports.func_not_impl)) {
      throw new Error("<Failed to pass should_impl() for " + k + ">");
    }
  });

  _.forOwn(parent.prototype, function(v, k) {
    if (parent.prototype[k] === exports.func_not_impl && 
      (!_.isFunction(child.prototype[k]) ||
      child.prototype[k] === exports.func_not_impl)) {
      throw new Error("<Failed to pass should_impl() for prototype." + k + ">");
    }
  });
};

/**
 * Use this for bridge design pattern. It would examine the funnctions in 
 * the prototype of clazz. For all functions equal to func_not_impl, it
 * would be all delegated to implementer.
 * 
 * It also add some intrinsic methods to clazz, i.e. $set_impl and $get_impl
 *    which could dynamically change the implementer.
 *
 * @param  {Function} clazz    The function that has func_not_impl in its prototype
 * @param  {Array} additional  Additional name of functions to delegate
 * @param  {Array} exclude     These names won't be delegated
 */
exports.delegate_impl = function(clazz) {
  C.check(_.isFunction(clazz), "base/delegate_impl", "clazz should be a function");

  clazz.prototype.$get_impl = function() {
    return this.$_impl;
  };
  clazz.prototype.$set_impl = function(impl) {
    this.$_impl = impl;
  };

  _.forOwn(clazz.prototype, function(v, k) {
    if (v === exports.func_not_impl) {
      clazz.prototype[k] = function() {
        var impl = this.$get_impl();
        return impl[k].apply(impl, arguments);
      };      
    }
  });

};


/**
 * Similar to delegate_impl, but it directly add a bunch of methods
 * and delegate it to the internal property
 * @param  {Function} clazz         The function that would be added with some methods
 * @param  {String} property_name The internal property as actual implementor
 * @param  {Array} methods       A list of methods to add
 */
exports.delegate = function(clazz, property_name, methods) {
  C.check(_.isFunction(clazz), "base/delegate", "clazz should be a function");
  C.check(_.isArray(methods), "base/delegate", "methods should be an array");
  methods.forEach(function(m) {
    clazz.prototype[m] = function() {
      var impl = this[property_name];
      return impl[m].apply(impl, arguments);
    };
  });
};


/**
 * Check whether child is parent or is util.inherits from parent (in a chain)
 * @param  {Function}  child  
 * @param  {Function}  parent 
 * @return {Boolean}   true if is inherited
 */
exports.is_subclass_of = function(child, parent) {
  if (!_.isFunction(child) || !_.isFunction(parent)) {
    return false;
  }
  var c = child;
  while (c) {
    if (c === parent) {
      return true;
    } 
    c = c.super_;
  }
  return false;
};


var IndexedArray =
/**
 * Combines the array and an associated index. For one key, only one 
 * object is allowed to be in the array
 *
 * One could directly access its internal array and index, but need to
 * be careful to maintain the structure
 *
 * But prefer to use the following methods first:
 *
 * remove, push, pop, shift, unshift - this changes internal array but updates index too
 * get(k) - this is a shortcut for index[k]
 * size() - this is a shortcout for array.length
 * 
 * @param {String} key the field of element (an object) of arr 
 * @param {Array} arr 
 */
exports.IndexedArray = function(key, arr) {
  arr = arr || [];
  C.check(_.isString(key), "base/IndexedArray", "Key should be a string");
  C.check(_.isArray(arr), "base/IndexedArray", "Not an array passed into constructor");
  this.array = [];
  this.key = key;
  this.index = {};
  var self = this, k;
  arr.forEach(function(o) {
    k = o[key];
    if (!C.check_warn(!_.has(self.index, k), "base/IndexedArray", 
      "Two elements have the same key", self.index[k], o)) {
      self.remove(k);
    }
    self.array.push(o);
    self.index[k] = o;
  });
};

IndexedArray.prototype.has = function(k) {
  return _.has(this.index, k);
};

IndexedArray.prototype.get = function(k) {
  return this.index[k];
};

IndexedArray.prototype.size = function() {
  return this.array.length;
};


IndexedArray.prototype.remove = function(k) {
  var self = this;
  if (!_.has(this.index, k)) {
    _.remove(this.array, function(o) {
      return o[self.key] === k;
    });
    delete this.index[k];
  }
};

IndexedArray.prototype.push = function(x) {
  C.check(_.isObject(x), "base/IndexedArray", "Element should be an obejct", x);
  var k = x[this.key];
  this.remove(k);
  this.array.push(x);
  this.index[k] = x;
};

IndexedArray.prototype.unshift = function(x) {
  C.check(_.isObject(x), "base/IndexedArray", "Element should be an obejct", x);
  var k = x[this.key];
  this.remove(k);
  this.array.unshift(x);
  this.index[k] = x;
};

IndexedArray.prototype.pop = function() {
  var x = this.array.pop();
  if (x) {
    delete this.index[x[this.key]];
  }
  return x;
};

IndexedArray.prototype.shift = function() {
  var x = this.array.shift();
  if (x) {
    delete this.index[x[this.key]];
  }
  return x;
};