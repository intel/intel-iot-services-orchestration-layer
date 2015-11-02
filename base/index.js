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
 * Base Module
 * @module base
 */

//----------------------------------------------------------
// Init Code: Make sure the codes below will be executed 
// before other code during HOPE project
// Other hope packages should require hope-base firstly in their
// index.js
// --------------------------------------------------------

global.$debug = console.log;

// add "done" into Promise (change global variable)
Promise.prototype.done = function(onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected).catch(function(e) {
    setTimeout(function() { throw e; }, 0);
  });
};

//----------------------------------------------------------------
// Top Level helpers: 
// later, log, to_string, to_short_string, check, assert, hash_string
// unique_id etc.
//----------------------------------------------------------------
// don't name it as defer, because in GO defer has stacked behvior, i.e.
// LIFO, but here we are FIFO
exports.later = function(f) {
  setTimeout(f, 0);
};

exports.log = require("./lib/log");

var to_string = require("./lib/to_string");
exports.to_string = to_string.to_string;
exports.to_short_string = to_string.to_short_string;


var check = require("./lib/check");
exports.check = check.check;
exports.check_warn = check.check_warn;
exports.assert = check.assert;


var uuid = require("uuid");

/**
 * hash a string
 * @function hash_string
 * @param {string} str
 * @return {string} hashed string
 */
exports.hash_string = require("MD5");

/**
 * Return a unique string suitable for ID
 * @param  {string} prefix prefixed at the ID
 * @return {string}        an unique ID
 */
exports.unique_id = function(prefix) {
  prefix = prefix || "";
  return prefix + uuid.v1().replace(/\-/g, "_");
};

//----------------------------------------------------------------
// other helpers categorized in sub-namespaces
//----------------------------------------------------------------
exports.type = require("./lib/type");
exports.path = require("./lib/path");
exports.lock = require("./lib/lock");
exports.fs = require("./lib/fs");
exports.test = require("./lib/test");
exports.assemble = require("./lib/assemble");
exports.net = require("./lib/net");
exports.time = require("./lib/time");
