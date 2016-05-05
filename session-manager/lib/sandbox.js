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
 * Sandbox Module
 * @module session-manager/sandbox
 */

var _ = require("lodash");
var B = require("hope-base");
var log = B.log.for_category("sm/sandbox");
//create a sandbox for service_init method
function create_service_sandbox(service_cache_obj)
{
  var sandbox = {
    process: process,
    Buffer: Buffer,
    setTimeout : setTimeout,
    clearTimeout : clearTimeout,
    setInterval : setInterval,
    clearInterval : clearInterval,
    setImmediate : setImmediate,
    clearImmediate : clearImmediate,
    console : console,
    require: generate_require_in_sandbox(service_cache_obj.path),
    __dirname: service_cache_obj.path,
    service_shared: service_cache_obj.shared,
    hub_shared: service_cache_obj.hub_shared
  };
  sandbox.global = sandbox;
  return sandbox;
}

function create_hub_sandbox(hub_shared_object, base_path) {
  var sandbox = {
    process: process,
    Buffer: Buffer,
    setTimeout : setTimeout,
    clearTimeout : clearTimeout,
    setInterval : setInterval,
    clearInterval : clearInterval,
    setImmediate : setImmediate,
    clearImmediate : clearImmediate,
    console : console,
    require: generate_require_in_sandbox(base_path),
    __dirname: base_path,
    hub_shared: hub_shared_object
  };
  sandbox.global = sandbox;
  return sandbox;
}

// return the require used in sandbox
// pay attention to the relative path of the required file
// TODO: may be the path in service_obj is relative path.
function generate_require_in_sandbox(base_path) {
  function require_in_sandbox(p) {
    var ret;
    var g = {};
    save_global_prop(g);
    if (_.isString(p) && p.substr(0, 2) !== "./" && p.substr(0, 3) !== "../") {
      ret = require(p);
    } else {
      ret = require(B.path.abs(p, base_path, true));
    }
    recover_global_prop(g);
    return ret;
  }
  return require_in_sandbox;//return a function
}

//create a sandbox for session method (exclude service_init)
function create_session_sandbox(service_cache_obj, session_cache_obj) {
  var sandbox = create_service_sandbox(service_cache_obj);
  sandbox.shared = session_cache_obj.shared;
  return sandbox;
}


exports.create_service_sandbox = create_service_sandbox;
exports.create_session_sandbox = create_session_sandbox;
exports.create_hub_sandbox = create_hub_sandbox;
//work around
var global_prop_list = ["Promise"];
function save_global_prop(g) {
  global_prop_list.forEach(function(prop) {
    g[prop] = global[prop];
  });
}

function recover_global_prop(g) {
  global_prop_list.forEach(function(prop) {
    if (g[prop] !== global[prop]) {
      log.warn("the global prop changes:", prop);
      global[prop] = g[prop];
    }
  });
}
