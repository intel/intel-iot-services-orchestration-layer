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
var Q = require("q");
var _ = require("underscore");
var UUID = require("uuid-js");
var B = require("hope-base");
var log = B.log.for_category("wfe/cp");

function ComponentProcessor(workflow) {
  this.workflow = workflow;
  this.operator = null;
  this.bindings = null;
  this.cm       = workflow.cm;

  this.deferredInstall = Q.defer();
  this.deferredUninstall = Q.defer();
  this.deferredEnable = Q.defer();
  this.deferredDisable = Q.defer();
}

function get_binding(bindings, cid) {
  var binding = bindings[cid];
  switch( binding.type ){
    case "fixed" : return {
      hub_id:binding.hub,
      thing_id:binding.thing,
      service_id:binding.service
    };
  }
}
ComponentProcessor.prototype.in_handler = function (request) {
  log("in_handler", this.operator.sid, request);
  var wid = this.workflow.wid;
  var cid = this.operator.sid;

  request.meta = request.meta || {};
  request.meta.wid = wid;
  request.meta.cid = cid;

  var bindings = get_binding(this.bindings, cid);

  request.meta.bindings = bindings;

  this.cm.kernel(request);
};

ComponentProcessor.prototype.registerRespondHandler = function() {
  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var handler = this.cm.get_cb(wid, cid);
  if (handler === null || handler === undefined) {
    this.cm.register_cb(wid, cid, this);
  }
};

ComponentProcessor.prototype.unregisterRespondHandler = function () {
  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var handler = this.cm.get_cb(wid, cid);
  if (handler !== null && handler !== undefined) {
    this.cm.unregister_cb(wid, cid);
  }

  return handler;
};

ComponentProcessor.prototype.install = function() {
  log("install", this.operator.sid);
  this.registerRespondHandler();

  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var bindings = get_binding(this.bindings, cid);

  this.cm.install(wid, cid, bindings);

  return this.deferredInstall.promise;
};

ComponentProcessor.prototype.uninstall = function() {
  log("uninstall", this.operator.sid);
  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var bindings = get_binding(this.bindings, cid);

  this.cm.uninstall(wid, cid, bindings);

  return this.deferredUninstall.promise;
};

ComponentProcessor.prototype.enable = function () {
  log("enable", this.operator.sid);
  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var bindings = get_binding(this.bindings, cid);

  this.cm.resume(wid, cid, bindings);

  return this.deferredEnable.promise;
};

ComponentProcessor.prototype.disable = function () {
  log("disable", this.operator.sid);
  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var bindings = get_binding(this.bindings, cid);

  this.cm.pause(wid, cid, bindings);

  return this.deferredDisable.promise;
};

ComponentProcessor.prototype.kickoff = function () {
  log("kickoff", this.operator.sid);
  var wid = this.workflow.wid;
  var cid = this.operator.sid;
  var bindings = get_binding(this.bindings, cid);

  this.cm.after_resume(wid, cid, bindings);
};

ComponentProcessor.prototype.clone = function () {
  var result = new ComponentProcessor(this.workflow);
  result.operator = this.operator;
  result.bindings = this.bindings;

  return result;
};


/***********************************************************
 * call back functions for cm to invoke
 **********************************************************/

ComponentProcessor.prototype.out_handler = function (respond) {
  log("out_handler", this.operator.sid, respond);
  var operator = this.operator;

  // deal with the tag
  var tags = [];
  respond.meta.tags = respond.meta.tags || {};
  operator.outports.forEach(function(outport){
    _.each(outport.tags, function(tag){
      if( !_.contains( tags, tag ) ){
        tags.push(tag);
      }
    });
    _.each(tags, function(tag){
      var tagID = UUID.create().hex;
      respond.meta.tags[tag.name] = tagID;
    });
  });

  operator.outports.forEach(function (outport) {
    var input = JSON.parse(JSON.stringify(respond));
    outport.publish(input);
  });
};


ComponentProcessor.prototype.err_handler = function (respond) {

};

ComponentProcessor.prototype.install_handler = function (respond) {
  this.deferredInstall.resolve(respond);
};

ComponentProcessor.prototype.uninstall_handler = function (respond) {
  this.unregisterRespondHandler();
  this.deferredUninstall.resolve(respond);
};

ComponentProcessor.prototype.pause_handler = function (respond) {
  this.deferredDisable.resolve(respond);
};

ComponentProcessor.prototype.resume_handler = function (respond) {
  this.deferredEnable.resolve(respond);
};


module.exports = ComponentProcessor;
