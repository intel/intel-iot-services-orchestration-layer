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
 * Sandbox Module
 * @module session-manager/sandbox
 */

var _ = require("lodash");
var B = require("hope-base");
var log = B.log.for_category("sm/sandbox");
var NodeRedSandnox = require("./nodered-sandbox/index.js");
var path = require("path");
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
    require: service_cache_obj.require_in_sandbox,
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
    require: prepare_require(base_path),
    __dirname: base_path,
    hub_shared: hub_shared_object
  };
  sandbox.global = sandbox;
  return sandbox;
}


function prepare_require(base_path) {
  var fs = require("fs");
  var fp = B.path.join(base_path, "__temp.js");
  var code = "exports.myrequire = require;";
  fs.writeFileSync(fp, code);
  var ret = require(fp);
  fs.unlinkSync(fp);
  function require_in_sandbox(p) {
    var g = {};
    save_global_prop(g);
    var r = ret.myrequire(p);
    recover_global_prop(g);
    return r;
  }
  return require_in_sandbox;
}



//create a sandbox for session method (exclude service_init)
function create_session_sandbox(service_cache_obj, session_cache_obj) {
  var sandbox = create_service_sandbox(service_cache_obj);
  sandbox.shared = session_cache_obj.shared;
  if (service_cache_obj.type === "nodered_service") {
    sandbox.__nodered = session_cache_obj.__nodered; //shared by session, store node instance, node type function and RED object
    NodeRedSandnox.prepare_nodered_sandbox(sandbox);
  }
  return sandbox;
}



exports.prepare_require = prepare_require;
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
