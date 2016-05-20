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
 * This is a node implementation based on service
 *
 * So all workflow semantics would be fulfilled by services, and under the hood
 * using APIs of session manager
 *
 */

var _ = require("lodash");
var B = require("hope-base");
var log = B.log.for_category("workflow/service");

var SessionManager = require("hope-session-manager");

// params: src_mnode, dst_mnode_id, session_id, action_name, action_params
var send_invoke_cmd$ = SessionManager.send_invoke_cmd$;

function NodeImplService(engine, em, mnode) {
  this.engine = engine;
  this.em = em;
  this.mnode = mnode;

  // schema of each invocation {
  //   invocation_id: ...
  //   resolve: ...
  //   reject: ...
  //   invoked_at: timestamp ...
  // }
  this.invocation_promises = {};
}

NodeImplService.prototype._invoke$ = function(hub_id, session_id, action_name, action_params) {
  var self = this;
  var invocation_id = B.unique_id("HOPE_SESSION_INVOCATION_");
  var promise = new Promise(function(resolve, reject) {
    self.invocation_promises[invocation_id] = {
      invocation_id: invocation_id,
      resolve: resolve,
      reject: reject,
      invoked_at: new Date()
    };
    self.em.hub__get$(hub_id).then(function(hub) {
      return send_invoke_cmd$(self.mnode, hub.mnode, session_id, invocation_id, 
        action_name, action_params);
    }).catch(function(err) {
      delete self.invocation_promises[invocation_id];
      reject(err);
    }).done();
  });
  return promise;
};

NodeImplService.prototype.init$ = function() {
  var self = this;
  
  // messages from session invocation / send are in format of
  // {
  //   session_id:
  //   meta:
  //   value:
  //   action:
  //   is_error:
  // }
  var tasks = [];
  tasks.push(this.mnode.accept$("session_invoke_ret", function(msg, topic, from_mnode_id) {
    var promise = self.invocation_promises[msg.invocation_id];
    if (!promise) {
      log.warn("Session Invocation NOT Found", msg, from_mnode_id);
      return;
    }
    if (msg.is_error) {
      promise.reject(msg);
    } else {
      promise.resolve(msg);
    }
    delete self.invocation_promises[msg.invocation_id];
  }));


  tasks.push(this.mnode.accept$("session_send", function(msg, topic, from_mnode_id) {
    var node = self.engine.nodes[msg.session_id];
    if (!node) {
      log.error("node not found for message need to send", msg);
      return;
    }
    if (msg.is_error) {
      node.send({
        error: msg.value
      }, msg.meta || {});
    } else {
      node.send(msg.value, msg.meta || {});
    }
  }));

  return Promise.all(tasks);
};


NodeImplService.create$ = function(engine, em, mnode) {
  var n = new NodeImplService(engine, em, mnode);
  return n.init$().then(function() {
    return n;
  });
};

/**
 * It would analyze the binding and map it to hub_id, session_id
 * @param  {Object} node The node in workflow
 * @return {Object}      contains hub_id and session_id so we know where
 *                       to send the command
 */
NodeImplService.prototype.get_binding$ = function(node) {
  var bindings = node.bindings || {};
  return new Promise(function(resolve, reject) {
    if (bindings.type !== "fixed") {
      reject("workflow/service: Unsupported bindings" + B.to_string(bindings));
      return;
    }
    resolve({
      hub_id: bindings.hub,
      thing_id: bindings.thing,
      service_id: bindings.service,
      session_id: node.id
    });
  });
};

NodeImplService.prototype.kernel$ = function(node, data) {
  log("kernel", node.id, data);
  var self = this;
  return this.get_binding$(node).then(function(info) {
    return self._invoke$(info.hub_id, info.session_id,
      "kernel", data);
  });
};


NodeImplService.prototype.install$ = function(node) {
  log("install", node.id);
  var self = this;
  return this.get_binding$(node).then(function(info) {
    return self._invoke$(info.hub_id, info.session_id, "start", {
      service_id: info.service_id,
      config: node.config
    });
  });
};

NodeImplService.prototype.uninstall$ = function(node) {
  log("uninstall", node.id);
  var self = this;
  return this.get_binding$(node).then(function(info) {
    return self._invoke$(info.hub_id, info.session_id, "stop");
  });
};

NodeImplService.prototype.enable$ = function(node) {
  log("enable", node.id);
  var self = this;
  return this.get_binding$(node).then(function(info) {
    return self._invoke$(info.hub_id, info.session_id, "resume");
  });
};

NodeImplService.prototype.disable$ = function(node) {
  log("disable", node.id);
  var self = this;
  return this.get_binding$(node).then(function(info) {
    return self._invoke$(info.hub_id, info.session_id, "pause");
  });
};


NodeImplService.prototype.kickoff$ = function(node) {
  log("kickoff", node.id);
  var self = this;
  return this.get_binding$(node).then(function(info) {
    return self._invoke$(info.hub_id, info.session_id, "after_resume");
  });
};


module.exports = NodeImplService;



