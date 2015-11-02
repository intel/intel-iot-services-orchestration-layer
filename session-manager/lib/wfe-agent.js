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
 * WFE Agent Module.
 * WFE will use it as CM.
 * @module session_manager/wfe-agent
 */

//TODO: the agent hace to store all sessions' register-functions.
//Maybe we should change the exchange-data way with WFE. 
//
//TODO: we need to store the session's status




var _ = require("lodash");
var B = require("hope-base");
var log = B.log.for_category("sm/wfe");
var check = B.check;

exports.WfeAgent = WfeAgent;

// ----------------------------------
// helper
// ----------------------------------
/**
 * generate handler msg for "session_send"
 * @param  {object} wa  wfe_agent object
 * @param  {object} msg received msg
 *                      {
 *                        session_id:
 *                        tags:
 *                        value:
 *                        action:
 *                        is_error:
 *                      }
 * @return {object}     {
 *                        meta:{
 *                          cid:
 *                          wid:
 *                          tags
 *                        }
 *                        payload:{
 *                          ERR/OUT:
 *                        }
 *                      }
 */
function generate_send_msg(wa, msg) {
  var message = {};
  message.meta = {};
  message.meta.wid = wa.cb_dicts[msg.session_id].workflow_id;
  message.meta.cid = msg.session_id;
  message.meta.tags = msg.tags;
  if (msg.is_error) {
    message.payload = {ERR: msg.value};
  }
  else {
    message.payload = {OUT: msg.value};
  }
  return message;
}

/**
 * generate handler msg for "session_invoke_ret"
 * @param  {object} wa  wfe_agent object
 * @param  {object} msg received msg
 *                      {
 *                        session_id:
 *                        tags:
 *                        value:
 *                        action:
 *                        is_error:
 *                      }
 * @return {object}     {
 *                        meta:{
 *                          cid:
 *                          wid:
 *                        }
 *                        payload:{
 *                          result: boolean
 *                          value/reason:
 *                        }
 *                      }
 */
function generate_ret_msg(wa, msg) {
  var message = {};
  message.meta = {};
  message.meta.wid = wa.cb_dicts[msg.session_id].workflow_id;
  message.meta.cid = msg.session_id;
  if (msg.is_error) {
    message.payload = {
      result: false,
      reason: msg.value
    };
  }
  else {
    message.payload = {
      result: true,
      value: msg.value
    };
  }
  return message;
}


var send_invoke_cmd$ = require("../index").send_invoke_cmd$;


// --------------------
// WfeAgent Class
// --------------------

/**
 * WfeAgent Class

 * @constructor
 * @param {object} em    entity manager object
 * @param {object} mnode 
 */
function WfeAgent(em, mnode) {
  this.type = "WfeAgent";
  this.id = B.unique_id("HOPE_WA_");
  this.mnode = mnode;
  this.em = em;
  this.cb_dicts = {}; //{workflow_id, handler}
}

/**
 * init the wfeagent itself.
 * it will set the accept function for mnode.
 * When received "session_invoke_ret" or "session_send", it will call
 * responding handlers, which are registered by wfe.
 * @return {Promise}
 */
WfeAgent.prototype.init$ = function() {
  var self = this;
  var action_handler_map = {
    start: "install_handler",
    stop: "uninstall_handler",
    pause: "pause_handler",
    resume: "resume_handler"
  };
  var tasks = [];
  tasks.push(self.mnode.accept$("session_invoke_ret", function(msg, topic, from_mnode_id) {
    try {
      check_obsolete_session(self, msg.session_id, from_mnode_id);
      if (msg.action === "kernel" || msg.action === "after_resume")
      {
        return;
      }
      var message = generate_ret_msg(self, msg);
      var caller = self.cb_dicts[msg.session_id].handler_obj;
      var handler = caller[action_handler_map[msg.action]];
      handler.call(caller, message);
    } catch (e)
    {
      check(e.message === "obsolete_session", e, msg, from_mnode_id);
      log.warn("find obsolete_session", msg, from_mnode_id);
    }
  })
  );
  tasks.push(self.mnode.accept$("session_send", function(msg, topic, from_mnode_id) {
    try {
      check_obsolete_session(self, msg.session_id, from_mnode_id);
      var message = generate_send_msg(self, msg);
      var caller = self.cb_dicts[msg.session_id].handler_obj;
      var handler;
      if (msg.is_error) {
        handler = caller.err_handler;
      }
      else {
        handler = caller.out_handler;
      }
      handler.call(caller, message);
    } catch (e)
    {
      check(e.message === "obsolete_session", e, msg, from_mnode_id);
      log.warn("find obsolete_session", msg, from_mnode_id);
    }
  })
  );
  return Promise.all(tasks);


};

function check_obsolete_session(wa, session_id, target_mnode_id) {
  if (_.isUndefined(wa.cb_dicts[session_id])) {
    wa.mnode.invoke_rpc$(target_mnode_id, "clear_session", session_id).done();
    throw new Error("obsolete_session");
  }
}
/**
 * send the invoke "start" command to install session
 * @param  {id} workflow_id
 * @param  {id} session_id  
 * @param  {object} bindings    {
 *                                hub_id:
 *                                thing_id:
 *                                service_id:
 *                              }
 */
WfeAgent.prototype.install = function(workflow_id, session_id, bindings) {
  log("install", workflow_id, session_id, bindings);
  var self = this;
  var service_id = bindings.service_id;
  var hub_id = bindings.hub_id;
  var dst_mnode_id;
  return self.em.hub__get$(hub_id)
  .then(function(hub_obj) {
    dst_mnode_id = hub_obj.mnode;
    var others = {service_id: service_id};
    return send_invoke_cmd$(self.mnode, dst_mnode_id, session_id, "start", others);
  })
  .catch(function(e) {
    log.error("install", e, workflow_id, session_id, bindings);
  })
  .done();
};


/**
 * send the invoke "stop" command to uninstall session
 * @param  {id} workflow_id
 * @param  {id} session_id  
 * @param  {object} bindings    {
 *                                hub_id:
 *                                thing_id:
 *                                service_id:
 *                              }
 */
WfeAgent.prototype.uninstall = function(workflow_id, session_id, bindings) {
  log("uninstall", workflow_id, session_id, bindings);
  var self = this;
  var dst_mnode_id;
  var hub_id = bindings.hub_id;
  return self.em.hub__get$(hub_id)
  .then(function(hub_obj) {
    dst_mnode_id = hub_obj.mnode;
    return send_invoke_cmd$(self.mnode, dst_mnode_id, session_id, "stop");
  })
  .catch(function(e) {
    log.error("uninstall", e, workflow_id, session_id, bindings);
  })
  .done();
};

/**
 * send the invoke "resume" command to resume session
 * @param  {id} workflow_id
 * @param  {id} session_id  
 * @param  {object} bindings    {
 *                                hub_id:
 *                                thing_id:
 *                                service_id:
 *                              }
 */
WfeAgent.prototype.resume = function(workflow_id, session_id, bindings) {
  log("resume", workflow_id, session_id, bindings);
  var self = this;
  var dst_mnode_id;
  var hub_id = bindings.hub_id;
  return self.em.hub__get$(hub_id)
  .then(function(hub_obj) {
    dst_mnode_id = hub_obj.mnode;
    return send_invoke_cmd$(self.mnode, dst_mnode_id, session_id, "resume");
  })
  .catch(function(e) {
    log.error("resume", e, workflow_id, session_id, bindings);
  })
  .done();
};

/**
 * send the invoke "pause" command to pause session
 * @param  {id} workflow_id
 * @param  {id} session_id  
 * @param  {object} bindings    {
 *                                hub_id:
 *                                thing_id:
 *                                service_id:
 *                              }
 */
WfeAgent.prototype.pause = function(workflow_id, session_id, bindings) {
  log("pause", workflow_id, session_id, bindings);
  var self = this;
  var dst_mnode_id;
  var hub_id = bindings.hub_id;
  return self.em.hub__get$(hub_id)
  .then(function(hub_obj) {
    dst_mnode_id = hub_obj.mnode;
    return send_invoke_cmd$(self.mnode, dst_mnode_id, session_id, "pause");
  })
  .catch(function(e) {
    log.error("pause", e, workflow_id, session_id, bindings);
  })
  .done();
};

/**
 * send the invoke "after_resume" command to session
 * @param  {id} workflow_id
 * @param  {id} session_id  
 * @param  {object} bindings    {
 *                                hub_id:
 *                                thing_id:
 *                                service_id:
 *                              }
 */
WfeAgent.prototype.after_resume = function(workflow_id, session_id, bindings) {
  log("after_resume", workflow_id, session_id, bindings);
  var self = this;
  var dst_mnode_id;
  var hub_id = bindings.hub_id;
  return self.em.hub__get$(hub_id)
  .then(function(hub_obj) {
    dst_mnode_id = hub_obj.mnode;
    return send_invoke_cmd$(self.mnode, dst_mnode_id, session_id, "after_resume");
  })
  .catch(function(e) {
    log.error("afterResume", e, workflow_id, session_id, bindings);
  })
  .done();                                                                                                        
};

/**
 * send the invoke "kernel" command to session
 * @param  {object} msg {
 *                        meta:{
 *                          wid:
 *                          cid:
 *                          tags:
 *                          bindings:{
 *                            hub_id:
 *                            thing_id:
 *                            service_id
 *                          }
 *                        }
 *                        payload: {
 *                          IN: {}
 *                        }
 *                      }
 *               
 *             
 */
WfeAgent.prototype.kernel = function(msg) {
  log("kernel", msg);
  var self = this;
  var dst_mnode_id;
  var hub_id = msg.meta.bindings.hub_id;
  var session_id = msg.meta.cid;
  var others = {
    IN: msg.payload.IN,
    tags: msg.meta.tags
  };
  return self.em.hub__get$(hub_id)
  .then(function(hub_obj) {
    dst_mnode_id = hub_obj.mnode;
    return send_invoke_cmd$(self.mnode, dst_mnode_id, session_id, "kernel", others);
  })
  .catch(function(e) {
    log.error("kernel", e, msg);
  })
  .done();                                                                                                        
};

/**
 * Register handler object with session_id.
 * handler_obj has some functions, they will be called
 * when mnode receive the msg from sm.
 * @param  {id} workflow_id  
 * @param  {id} session_id  
 * @param  {object} handler_obj {
 *                                out_handler:
 *                                err_handler:
 *                                install_handler:
 *                                uninstall_handler:
 *                                pause_handler:
 *                                resume_handler:
 *                              }
 */
WfeAgent.prototype.register_cb = function(workflow_id, session_id, handler_obj) {
  log("register_cb", workflow_id, session_id);
  check(_.isObject(handler_obj), "sm/wfe", "handler_obj must be object");
  check(_.isFunction(handler_obj.out_handler), "sm/wfe", "must have function out_handler");
  check(_.isFunction(handler_obj.err_handler), "sm/wfe", "must have function err_handler");
  check(_.isFunction(handler_obj.install_handler), "sm/wfe", "must have function install_handler");
  check(_.isFunction(handler_obj.uninstall_handler), "sm/wfe", "must have function uninstall_handler");
  check(_.isFunction(handler_obj.pause_handler), "sm/wfe", "must have function pause_handler");
  check(_.isFunction(handler_obj.resume_handler), "sm/wfe", "must have function resume_handler");
  check(!this.cb_dicts[session_id], "sm/wfe", "re-register is not allowed", workflow_id, session_id);
  this.cb_dicts[session_id] = {
    workflow_id: workflow_id,
    handler_obj: handler_obj
  };
};

/**
 * unregister handler object with session_id.
 * @param  {id} workflow_id  
 * @param  {id} session_id 
 */
WfeAgent.prototype.unregister_cb = function(workflow_id, session_id) {
  log("unregister_cb", workflow_id, session_id);
  check(this.cb_dicts[session_id], "sm/wfe", "the handler not exsit");
  delete this.cb_dicts[session_id];
};

/**
 * get hanler_obj with session_id
 * @param  {id} workflow_id  
 * @param  {id} session_id 
 */
WfeAgent.prototype.get_cb = function(workflow_id, session_id) {
  //log("get_cb", workflow_id, session_id);
  if (_.isUndefined(this.cb_dicts[session_id])) {
    return undefined;
  }
  return this.cb_dicts[session_id].handler_obj;
};
