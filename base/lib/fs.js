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
 * @module base/fs
 */


var _ = require("lodash");
var fs = require("fs");
var fse = require("fs.extra");
var fsf = require("fs-finder");
var path = require("./path");
var check = require("./check").check;

/**
 * Whether a path exists
 * @param  {String} p 
 * @return {Boolean}   
 */
exports.path_exists = function(p) {
  return fs.existsSync(p);
};

/**
 * Whether a file at given path exists
 * @param  {String} p 
 * @return {Boolean}   
 */
exports.file_exists = function(p) {
  return fs.existsSync(p) && fs.statSync(p).isFile();
};

/**
 * Whether a dir at given path exists
 * @param  {String} p 
 * @return {Boolean}   
 */
exports.dir_exists = function(p) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
};


/**
 * mkdirp
 * @param  {String} dir 
 */
exports.mkdirp = function(dir) {
  if (!exports.dir_exists(dir)) {
    fse.mkdirRecursiveSync(dir);
    if (!exports.dir_exists(dir)) {
      throw new Error("Created dir but got nothing: " + dir);
    }
  }
};

/**
 * Ensure the dir for the path (intend to be a file) are created
 * @param  {String} p 
 */
exports.mkdirp_for_file = function(p) {
  exports.mkdirp(path.dir(p));
};


function FSItemList() {
  this.items = [];
}

FSItemList.prototype.files = function(ext) {
  this.items = _.filter(this.items, function(item) {
    return item.is_file && (!ext || item.ext === ext);
  });
  return this;
};

FSItemList.prototype.dirs = function() {
  this.items = _.filter(this.items, function(item) {
    return !item.is_file;
  });
  return this;
};

// f takes (name, path, base, ext, is_file)
// base is name but without extension
FSItemList.prototype.each = function(f) {
  this.items.forEach(function(item) {
    f(item.name, item.path, item.base, item.ext, item.is_file);
  });
  return this;
};

// f takes item
FSItemList.prototype.filter = function(f) {
  this.items = _.filter(this.items, function(item) {
    return f(item.name, item.path, item.base, item.ext, item.is_file);
  });
  return this;
};

/**
 * list items under a directory
 *
 * It returns an object with chainable methods including:
 *   - each(cb)  : iterate with cb(name, path, base, ext, is_file), base is name without ext
 *   - files(ext): leave files in the list, may filter with ext
 *   - dirs()    : leave directories in the list
 *   - filter(cb): filter the list with cb(name, path, base, ext, is_file)
 * @param  {String} p 
 * @return {Object} The chainable object
 */
exports.ls = function(p) {
  check(exports.dir_exists(p), "base/fs/ls", p, "to ls isn't an exisint dir!");
  var items = fs.readdirSync(p);
  var list = new FSItemList();
  items.forEach(function(f) {
    var abs_p = path.abs(f, p, true);
    list.items.push({
      base: path.base_without_ext(f),
      name: f,
      ext: path.ext(f),
      path: abs_p,
      is_file: exports.file_exists(abs_p)
    });
  });
  return list;
};




/**
 * read json file
 * @param  {String} filename full path of the json file
 * @return {Object}          plain_object
 */
exports.read_json = function(filename) {
  return fse.readJsonSync(filename);
};

/**
 * write plain_object to a json file 
 * @param  {String} filename full path of the json file
 * @param  {Object} plain_obj 
 */
exports.write_json = function(filename, plain_obj) {
  return fse.outputJsonSync(filename, plain_obj);
};

exports.update_json = function(filename, patch_obj) {
  return fse.writeJsonSync(filename, _.assign(fse.readJsonSync(filename), patch_obj));
};

exports.read_file = function(filename, config) {
  return fs.readFileSync(filename, config);
};

/**
 * write file, and if the parent path does not exsits, create it!
 * @param  {String } filename the path of the target file
 * @param  {String } data     file content
 */
exports.write_file = function(filename, data) {
  return fse.outputFileSync(filename, data);
};

/**
 * remove a file/dir. Similar with rm -rf
 * @param  {String} dir path of the target file/dir
 * @return {[type]}          [description]
 */
exports.rm = function(dir) {
  return fse.removeSync(dir);
};

/**
 * find files recursively in dir
 * @param  {string} dir      path of the dir
 * @param  {string} filename the filename or some pattern
 *                           "abc.js", "*.js", "/<regexp>.js"
 *                           note that the regexp should be enclosed by <>
 * @return {Array}          array of file paths
 */
exports.find_files = function(dir, filename) {
  return fsf.from(dir).findFiles(filename);
};