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
var _       = require("underscore");
var checker = require("../check");
var B = require("hope-base");
var log = B.log.for_category("wfe/WorkFlow");

function ComponentManager() {
  this.registry = {};
}

ComponentManager.prototype.key = function (wid, cid) {
  return wid + "-" + cid;
};

ComponentManager.prototype.get = function (wid, cid) {
  var key = this.key(wid, cid);
  var handler = this.registry[key];

  return handler;
};

ComponentManager.prototype.set = function (wid, cid, handler) {
  var key = this.key(wid, cid);

  this.registry[key] = handler;
};

ComponentManager.prototype.register_cb = function (wid, cid, respondHandler) {
  var handler = this.get(wid, cid);

  checker.check_should_empty("ComponentManager<regist>", handler);

  this.set(wid, cid, respondHandler);
};

ComponentManager.prototype.unregister_cb = function (wid, cid) {
  var handler = this.get(wid, cid);

  checker.check_not_empty("ComponentManager<unregist>", handler);

  this.set(wid, cid, null);
};

ComponentManager.prototype.start = function (wid, cid) {

};

ComponentManager.prototype.stop = function (wid, cid) {

};

ComponentManager.prototype.kernel = function (message) {
  var meta = message.meta;
  checker.check_not_empty("ComponentManager<send>.meta", meta);

  var wid = meta.wid;
  var cid = meta.cid;
  var did = meta.did;

  log("Request from: [" + wid + "] Component " + cid + " <" + did + ">\n");

  var componentProcessor = this.get(wid, cid);
  checker.check_not_empty("ComponentManager<send>.componentProcessor", componentProcessor);

  var respond = {
    meta: meta,
    payload: {
      OUT: {
      }
    }
  };

  _.each(componentProcessor.operator.outports, function(outport) {
    respond.payload.OUT[outport.sid] = {};
     _.extend(respond.payload.OUT[outport.sid], message.payload.IN);
  });
  var random = Math.random(); // a random defer time (0,1)ms
  setTimeout(function(){
    componentProcessor.out_handler(respond);
  }, random);

};

ComponentManager.prototype.get_cb = function (wid, cid) {
  return this.get(wid, cid);
};

ComponentManager.prototype.install = function (wid, cid, did, ccat) {
  this.get(wid, cid).install_handler(true);
  log("install for " + wid + " with component " + cid + " on device " + did);
};

ComponentManager.prototype.uninstall = function (wid, cid, did) {
  this.get(wid, cid).uninstall_handler(true);
};

ComponentManager.prototype.resume = function (wid, cid, did) {
  this.get(wid, cid).resume_handler(true);
};

ComponentManager.prototype.pause = function (wid, cid, did) {
  this.get(wid, cid).pause_handler(true);
};

ComponentManager.prototype.after_resume = function (wid, cid, did) {
  log("after resume for" + wid + " with component " + cid + " on device " + did);
};

module.exports = ComponentManager;
