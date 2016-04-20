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
 * Message Module
 * @module hub
 */

var B = require("hope-base");
var M = require("hope-message");
var Store = require("hope-store");
var EntityStore = require("hope-entity-store");
var Entity = require("hope-entity");
var SessionManager = require("hope-session-manager");

var asm = B.assemble.create(M.$factories);
asm.add_factories(Store.$factories);
asm.add_factories(EntityStore.$factories);
asm.add_factories(Entity.$factories);
asm.add_factories(SessionManager.$factories);

asm.add_factories({
  Hub: require("./lib/hub").create$
});


var objs = {};


exports.start$ = function(config) {
  return asm.assemble$(config.assemble || {}, {
    id: config.id,
    config_path: config.config_path
  }).then(function(items) {
    objs = items;
    global.$hub_assets = objs;// put it into global so that debug shell may reference it
    return objs;
  });
};


exports.stop$ = function() {
  if (objs.hub) {
    return objs.hub.leave$();
  } else {
    return Promise.resolve();
  }
};