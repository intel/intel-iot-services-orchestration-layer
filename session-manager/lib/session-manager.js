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
 * Session Manager Module
 * @module session_manager/session-manager
 */


var _ = require("lodash");
var B = require("hope-base");
var sb = require("./sandbox");
var log = B.log.for_category("sm");
var check = B.check;




exports.SessionManager = SessionManager;

/**
 * a manager handles session invoke and service invoke.
 * @constructor
 * @param {Object} em 
 * @param {Object} mnode 
   
 */
function SessionManager(em, mnode) {
  var ssc = require("./session-cache");
  var src = require("./service-cache");
  this.id = B.unique_id("HOPE_SM_");
  this.type = "SessionManager";
  this.session_cache = ssc.create_session_cache();
  this.service_cache = src.create_service_cache(em.service_store);
  this.em = em;
  this.mnode = mnode;
}


SessionManager.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/SM/" + this.id + "/" + 
    (_.isUndefined(key) ? "" : key));
};

/**
 * init the SM
 * it will setup the accept "session_invoke" for mnode
 * @return {Promise} 
 */
SessionManager.prototype.init$ = function() {
  var self = this;
  return  self.mnode.accept$("session_invoke", cb_session_invoke);
   /**
   * callback when receive "session invoke" msg.
   * 1, if action is start, and the session not exsit, call create_session
   * 2, invoke_session
   * 3, if invoke done, send-back the message. if is "stop" action, call delete_session 
   *    if invoke fail, send-back the error msg
   * 4, catch the 1-3's exception 
   * @param  {Object} msg           {
   *                                  action:
   *                                  session_id:
   *                                  invocation_id: 
   *                                  IN: for kernel
   *                                  service_id: for start
   *                                  config: for start and save in the session-cache-obj
   *                                  tags: for kernel
   *                                }
   * @param  {String} topic         [description]
   * @param  {String||number} from_mnode_id [description]
   */
  function cb_session_invoke(msg, topic, from_mnode_id) {
    self.make_lock(msg.session_id).lock(function() {
      log("cb_session_invoke", msg, topic, from_mnode_id);
      var action = msg.action;
      var id = msg.session_id;
      var IN = msg.IN;
      var invocation_id = msg.invocation_id;
      var others = {
        IN: IN,
        mnode: self.mnode,
        invocation_id: invocation_id,
        dst_mnode_id: from_mnode_id,
        tags: msg.tags,
        config: msg.config
      };
      return Promise.resolve("")
      .then(function prepare_init() {
        if (!self.session_cache.has(id)) {
          check(action === "start", "sm", "the session isn't in the cache and action is not start", msg);
          return self.create_session$(id, msg.service_id, from_mnode_id, msg.config);
        }
        return "session_already_created";
      })
      .then(function main_invoke() {
        return self.invoke_session$(id, action, others);
      })
      .then(function after_done(value) {
        var payload = generate_msg_payload(id, invocation_id, action, false, null, value);
        self.mnode.send$(from_mnode_id, "session_invoke_ret", payload);
        if (action === "stop") {
          return self.delete_session$(id);
        }
        else {
          return "after_done";
        }
      }, function after_fail(e) {
        log.warn("session_invoke_fail", e, msg, topic, from_mnode_id);
        var payload = generate_msg_payload(id, invocation_id, action, true, null, e);
        self.mnode.send$(from_mnode_id, "session_invoke_ret", payload);
      })
      .catch(function(e) {
        log.warn("session_invoke_error", e, msg, topic, from_mnode_id);
      });
    });
  }


};



// ------------------------------------------------
// Session Related
// -------------------------------------------------

/**
 * Create an service session object.
 * 0, if the session id exist, return Promise.reject
 * 1, get service_cache_obj
 * 2, init service if not inited before
 * 3, save the session to session cache
 * It return the Promise(session object)
 * 
 * @param  {String||Number} id         the session's id. if null, 
 *                                     then generate an unique id for the session obj
 * @param  {String||Number} service_id
 * @param {String} mnode_id the id of dst mnode, and session should send msg to it. 
 * @param {Object}  config  session's config info
 * @return {Promise}                   resolve: session object
 *                                              {
 *                                                id:
 *                                                service: service_id
 *                                                status: idle, paused, sending
 *                                                shared: session-shared
 *                                                is_status_stable: whether the status is changing now 
 *                                              }
 */
SessionManager.prototype.create_session$ = function(id, service_id, mnode_id, config) {
  log("create_session", id, service_id, config);
  var self = this;
  if (_.isNull(id)) {
    id = B.unique_id("session");
  }
  if (self.session_cache.has(id)) {
    return Promise.reject("session already exsit, please delete it first");
  }
  //status: idle, paused, sending
  //mnode: write down the dst mnode id
  var session = {
    id: id,
    service: service_id,
    status: "idle",
    shared: {},
    is_status_stable: true,
    mnode: mnode_id,
    config: config
  };
  return self.service_cache.get$(service_id)
  .then(function(service_cache_obj) {
    if (service_cache_obj.is_inited) {
      return "already inited";
    }
    else {
      return self.service_cache.init_service$(service_cache_obj);
    }
  })
  .then(function() {
    self.session_cache.set(session.id, session);//sync
    return session;
  });
};

/**
 * get the session obj
 * @param  {String||number} id session id
 * @return {Promise}    resolve: session obj in session-cache
 */
SessionManager.prototype.get_session$ = function (id) {
  log("get_session", id);
  return Promise.resolve(this.session_cache.get(id));
};

/**
 * delete the session obj
 * 0, if the session doesnt exsit or its status is not stable idle.
 * 1, delete from session-cache
 * @param  {String||number} id session id
 * @return {Promise}    
 */
SessionManager.prototype.delete_session$ = function (id) {
  log("delete_session", id);
  var self = this;
  return new Promise(function(resolve) {
    check(self.session_cache.has(id), "sm", "session not exsit", id);
    var session = self.session_cache.get(id);
    check(session.status === "idle" && session.is_status_stable, "sm",
     "only idle session can be deleted", id, session);
    self.session_cache.delete(id);
    resolve("delete_session");
  });
};

/**
 * clear all sessions, whose mnode is mnode_id.
 * session's mnode means the mnode of the session's creator
 * @param  {String} mnodeid  
 * @return {Promise}            
 */
SessionManager.prototype.clear_sessions_with_mnode$ = function(mnodeid) {
  log("clear all sessions with mnode", mnodeid);
  var tasks = [];
  var ids = _.keys(this.session_cache.db);
  var self = this;
  ids.forEach(function(id) {
    if (self.session_cache.db[id].mnode === mnodeid) {
      tasks.push(self.clear_session$(id));
    }
  });
  return Promise.all(tasks);
};

/**
 * clear a session whose id is session_id.
 * if the session is not exsit, resolve()
 * if the session is idle, delete_session
 * if the session is paused, stop and delete
 * if the session is sending, pause and stop and delete    
 * @param  {String} session_id 
 * @return {Promise}            
 */
SessionManager.prototype.clear_session$ = function(session_id) {
  var self = this;
  return this.make_lock(session_id).lock_as_promise$(function() {
    log("clear session", session_id);
    if (_.isUndefined(self.session_cache.db[session_id])) {
      return Promise.resolve();
    }
    if (self.session_cache.db[session_id].status === "idle") {
      return self.delete_session$(session_id);
    }
    else if (self.session_cache.db[session_id].status === "paused") {
      return self.invoke_session$(session_id, "stop")
      .then(function() {
        return self.delete_session$(session_id);
      });  
    }
    else {
      return self.invoke_session$(session_id, "pause")
      .then(function() {
        return self.invoke_session$(session_id, "stop");
      }).then(function() {
        return self.delete_session$(session_id);
      }); 
    }   
  });
};

/**
 * clear all sessions in the session-cache
 * @return {Promise}
 */
SessionManager.prototype.clear_all_sessions$ = function() {
  log("clear all sessions");
  var tasks = [];
  var ids = _.keys(this.session_cache.db);
  var self = this;
  ids.forEach(function(id) {
      tasks.push(self.clear_session$(id));
  });
  return Promise.all(tasks);
};

/**
 * ask session to act
 * @param  {String||number} id session id
 * @param  {string} action "kernel", "start", "stop", "pause",
 *                         "after_resume", "resume"
 * @param  {Object} others other parameters {
 *                           IN:
 *                           mnode:
 *                           dst_mnode_id:
 *                         }
 * @return {Promise}        for kernel, after_resume, just resolve the promise.
 *                          for other actions, return the done value
 */
SessionManager.prototype.invoke_session$ = function(id, action, others) {
  log("invoke_session$", id, action);
  var self = this;
  return new Promise(function(resolve, reject) {
    check_session_avail(self, id, action);
    var session = self.session_cache.get(id);
    var service = self.service_cache.get_cache(session.service);
    var action_script = service[action + "_s"];
    check_action_avail(session, action);
    var sandbox = sb.create_session_sandbox(service, session);
    enhance_sandbox(sandbox, action, others, service, session, resolve, reject, self);
    var f = action_script.runInNewContext(sandbox);
    run_func(f, sandbox, action, others, resolve, reject, session, service);
  });
};

// -------------------------------------------------------
// Service Related
// --------------------------------------------------------

/**
 * install the service.
 * O, make sure the servcie is not installed before (aka, not in the servcie cache). 
 *    Otherwise, reject the promise
 * 1, fetch the service and create a service_cache_obj, save in cache
 * 2, call service_init
 * @param  {id} service_id 
 * @return {Promise}            resolve: init done value
 */
SessionManager.prototype.install_service$ = function(service_id) {
  var self = this;
  if (self.service_cache.has(service_id)) {
    return Promise.reject("service already installed");
  }
  return self.service_cache.get$(service_id)
  .then(function(service_cache_obj) {
    return self.service_cache.init_service$(service_cache_obj);
  });
};

/**
 * uninstall the service
 * 0, make sure the service is installed (aka, in service is in cache)
 * 1, get the service_cache_obj
 * 2, call destroy func
 * 3, delete the obj in cache
 * @param  {id} service_id 
 * @return {Promise}          resolve: destroy done value
 */
SessionManager.prototype.uninstall_service$ = function(service_id) {
  var self = this;
  if (!self.service_cache.has(service_id)) {
    return Promise.reject("service doesnt exsit");
  }
  var service_cache_obj = self.service_cache.get_cache(service_id);
  return self.service_cache.destroy_service$(service_cache_obj)
  .then(function(result) {
    self.service_cache.delete(service_id);
    return result;
  });
};
/**
 * clear all services in the service_cache. including call destroy and delete
 * @return {Promise}
 */
SessionManager.prototype.clear_all_services$ = function() {
  log("clear all services");
  var tasks = [];
  var ids = _.keys(this.service_cache.db);
  var self = this;
  ids.forEach(function(id) {
      tasks.push(self.uninstall_service$(id));
  });
  return Promise.all(tasks);
};

SessionManager.prototype.reload_service$ = function(service_id) {
  log("reload the service", service_id);
  return this.service_cache.reload_service_with_init_destroy$(service_id);
};

/**
 * run hub script in a hub sandbox. usually init or destroy in hub wide
 * @param  {string} script_path script file path
 * @return {promise}             
 */
SessionManager.prototype.run_hub_script$ = function(script_path) {
  log("run_hub_script", script_path);
  var fs = require("fs");
  var vm = require("vm");
  var self = this;
  var sandbox = sb.create_hub_sandbox(self.service_cache.hub_shared,
    B.path.resolve(script_path, ".."));
  var context = fs.readFileSync(script_path);
  var func_string = "(function(){\n" + context + "\n})";
  var func_script = new vm.Script(func_string, 
        {filename: script_path + "__wrap"});
  return new Promise(function(resolve, reject) {
    sandbox.done = function(value)
    {
      log("hub script done", script_path);
      sandbox.fail = B.type.func_noop;
      sandbox.done = B.type.func_noop;
      resolve(value);
    };

    sandbox.fail = function(value)
    {
      log.warn("hub script fail", script_path);
      sandbox.done = B.type.func_noop;
      sandbox.fail = B.type.func_noop;
      reject(value);
    };

    sandbox.throwEXC = function(value)
    {
      log.warn("hub script throw exception", value);
      sandbox.fail(value);
    };

    try {
      var f = func_script.runInNewContext(sandbox);
      f();
    } catch(e) {
      log.warn("hub script catch exception", e);
      sandbox.fail(e);
    }
    
  });
};

// TODO:
// 1, service in both store/cache should have a boolean attri: connect
// 2, here should check the connect in service, it false, reject
// 3, when things are disconeect/connect, the services in botn store/cache should be marked.
// 4, what to do with the init flag? we dont know. now we assume that the re-connect sevice need't re-init
// so the init flag should not change.
// 
//  
// the session should be in cache, service shold be in cache
// and the service.is_inited should be true
// and the service should have action script
function check_session_avail(sm, id, action) {
  var session = check(sm.session_cache.get(id), "sm",
   "session id is not in the session-cache", sm.session_cache, id);
  var service = check(sm.service_cache.get_cache(session.service),
   "sm", "service is not in the service cache",
    sm.service_cache, session);
  check(service.is_inited, "sm", "service is not inited", service, session);
  check(service[action + "_s"], "sm", "service do not has such action script", service, action);
}

// check if the session's status is matched with invoked action
function check_action_avail(session, action) {
  check(session.is_status_stable === true, "sm",
    "session's status must be stable", session, action);
  var before_action = {
    start: "idle",
    stop: "paused",
    pause: "sending",
    resume: "paused",
    after_resume: "sending",
    kernel: "sending"
  };
  check(session.status === before_action[action],
    "status shoule be " + before_action[action],
    session, action);
}

// Make sure when session send sth, the status must be "sending"
function check_status_in_sending (sm, session_id)
{
  check(sm.session_cache.has(session_id), "sm",
   "session dont exsit", session_id);
  check(sm.session_cache.get(session_id).status === "sending", "sm",
   "status is not sending", session_id);
}

// run the function
// a. the error-handlers and function argunents are different for actions
// b. some actions will set the session's working
function run_func(f, sandbox, action, others, resolve, reject, session, service) {
  if (action === "kernel") {
    try {
      f(others.IN, _.merge({}, session.config, service.config));
    } catch(e) {
      log.warn("kernel exception", e, session);
      sandbox.sendERR(e);
      reject(e);
    }
    resolve("kernel");
    return;
  }

  else if (action === "after_resume") {
    try {
      f(_.merge({}, session.config, service.config));
    } catch(e) {
      log.warn("after_resume exception", e, session);
      sandbox.sendERR(e);
      reject(e);
    }
    resolve("after_resume");
    return;
  }

  else {
    try {
      session.is_status_stable = false;
      f(_.merge({}, session.config, service.config));
    } catch(e) {
      log.warn(action + " exception", e, session);
      sandbox.fail(e);
    }
    return;
  } 
}

// add sendOUT, sendERR, done and fail to sandbox
function enhance_sandbox(sandbox, action, others, service, session, resolve, reject, sm) {
  if (action === "kernel" || action === "after_resume")
  {
    sandbox.sendOUT = function(out) {
      try {
        check_status_in_sending(sm, session.id);
        log("sendOUT", out, action, session);
        var payload = generate_msg_payload(session.id, others.invocation_id,
          action, false, others.tags, out);
        others.mnode.send$(others.dst_mnode_id, "session_send", payload)
        .catch(function(e) {
          log.warn("error in sending session output", e, others.dst_mnode_id, payload);
        })
        .done();
      } catch(e) {
        log.warn("error in sendOUT", e, out, action, session, service);
      }
    };
    sandbox.sendERR = function(err) {
      try {
        check_status_in_sending(sm, session.id);
        log.warn("sendERR", err, action, session);
        var payload = generate_msg_payload(session.id, others.invocation_id,
          action, true, others.tags, err);
        others.mnode.send$(others.dst_mnode_id, "session_send", payload)
        .catch(function(e) {
          log.warn("error in sending session error", e, others.dst_mnode_id, payload);
        })
        .done();
      } catch (e) {
        log.warn("error in sendERR", e, err, action, session, service);
      }
    };
  }
  else {
    sandbox.done = function(out) { 
      
      change_session_status(session, action);
      session.is_status_stable = true;
      log(action + " done", out, session);
      sandbox.fail = B.type.func_noop;
      sandbox.done = B.type.func_noop;
      resolve(out);
    };
    sandbox.fail = function(err) {
      session.is_status_stable = true;
      log.warn(action + " fail", err, session);
      sandbox.done = B.type.func_noop;
      sandbox.fail = B.type.func_noop;
      reject(err);
    };
  }
}

// generate payload for message send
function generate_msg_payload(session_id, invocation_id, action, is_error, tags, value) {
  var payload = {
    session_id: session_id,
    invocation_id: invocation_id,
    action: action,
    is_error: is_error,
    tags: tags,
    value: value
  };
  return payload;
}

// change the session's status based on the action
function change_session_status(session, action) {
  var after_action = {
    start: "paused",
    stop: "idle",
    pause: "paused",
    resume: "sending"
  };
  session.status = after_action[action];
}

