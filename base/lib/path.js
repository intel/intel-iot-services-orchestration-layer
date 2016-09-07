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
 * @module  base/path
 */

var path = require("path");
var _ = require("lodash");


/**
 * a/b/c.js => c.js
 * @param  {String} p 
 * @return {String}   
 */
exports.base = function(p, ext) {
  return path.basename(p, ext);
};

/**
 * a/b/c.js => .js
 * @param  {String} p 
 * @return {String}   
 */
exports.ext = function(p) {
  return path.extname(p);
};

/**
 * a/b/c.js => c
 * @param  {String} p 
 * @return {String}   
 */
exports.base_without_ext = function(p) {
  return path.basename(p, path.extname(p));
};

/**
 * /a/b/c => /a/b
 * @param  {String} p 
 * @return {String}   
 */
exports.dir = function(p) {
  return path.dirname(p);
};

/**
 * a/b/c.js => b
 * @param  {String} p 
 * @return {String}   
 */
exports.dir_base = function(p) {
  return path.basename(path.dirname(p));
};

/**
 * Normalize and replace \ to /
 * @param  {String} p 
 * @return {String}   
 */
exports.normalize = function(p) {
  // we always use / instead of \
  return path.normalize(p).replace(/\\/g, "/");
};

/**
 * resolve to current dir of process
 * @return {String} 
 */
exports.resolve = function() {
  return exports.normalize(path.resolve.apply(path, arguments));
};

exports.join = function() {
  return exports.normalize(path.join.apply(path, arguments));
};

/**
 * get the abs path relative to a base_path
 * base could be a file or dir, determined by base_is_dir, by default is file
 */
/**
 * get the abs path relative to a base_path
 * base could be a file or dir, determined by base_is_dir, by default is file
 * @param  {String} relative_path The relative path to convert
 * @param  {String} base_path     The base for the relative to start with
 * @param  {Boolean} base_is_dir  true if the base_path is a dir, otherwise file
 * @return {String}               The absolute path resolved with base_path
 */
exports.abs = function(relative_path, base_path, base_is_dir) {
  var base_dir;
  if (base_is_dir) {
    base_dir = base_path;
  } else {
    base_dir = path.dirname(base_path);
  }
  return exports.resolve(base_dir, relative_path);
};


/**
 * Check whether the given string could be used as a valid name for file/directory
 * Current rules:
 *   - should be a string
 *   - shouldn't be too long
 *   - shouldn't contain any special characters
 *   - shouldn't contain / or \ 
 * @param  {String} s The string to check
 * @return {String | null}   return null if it is valid, otherwise the error reason
 */
exports.validate_name = function(s) {
  if (!_.isString(s)) {
    return "should be a string";
  }
  if (s.length === 0) {
    return "cannot be empty string";
  }
  if (s.length > 80) {
    return "the length should be less than 80";
  }
  if (s[0] === " " || s[s.length - 1] === " ") {
    return "cannot start or end with space";
  }
  if (s[0] === "-") {
    return "cannot start with -";
  }
  if (!/^[a-zA-Z0-9\-_ \.]+$/.test(s)) {
    return "cannot contain characters beyond a-z, A-Z, 0-9, -, _, or space";
  }
  return null;
};

/**
 * Similar to validate_name, but directly return true if valid
 * @param  {[type]}  s [description]
 * @return {Boolean}   [description]
 */
exports.is_name_valid = function(s) {
  return !exports.validate_name(s);
};


/**
 * Check whether child is part of parent
 * users need to make these paths abs() first
 * 
 * @param  {String}  child  
 * @param  {String}  parent 
 * @return {Boolean}        
 */
exports.is_descendent_of = function(child, parent) {
  return child.indexOf(parent) === 0;
};

