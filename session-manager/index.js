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
 * @module session-manager
 */
var B = require("hope-base");
var _ = require("lodash");
var check = B.check;

var log = B.log.for_category("sm");


// ---------------------------------------------------------------------
// Session related. create (will init the service if needed) 
// -> invoke_start -> ... -> invoke_stop -> delete
// ---------------------------------------------------------------------

/**
 * Create an service session object.
 * 0, if the session id is exsit, return Promise.reject
 * 1, get service_cache_obj
 * 2, init service if not inited before
 * 3, save the session to session cache
 * It return the Promise(session object)
 * @param  {object} sm  
 * @param  {String||Number} session_id         the session's id. if null, 
 *                                     then generate an unique id for the session obj
 * @param  {String||Number} service_id 
 * @param {String}  mnode_id  session should send msg to the dst mnode. 
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
exports.create_session$ = function(sm, session_id, service_id, mnode_id, config) {
  return sm.create_session$(session_id, service_id, mnode_id, config);
};

/**
 * get the session obj
 * @param  {object} sm 
 * @param  {String||number} id session id
 * @return {Promise}    resolve: session obj in session-cache
 */
exports.get_session$ = function(sm, session_id) {
  return sm.get_session$(session_id);
};

/**
 * delete the session obj
 * 0, if the session doesnt exsit or its status is not stable idle.
 * 1, delete from session-cache
 * @param  {object} sm 
 * @param  {String||number} id session id
 * @return {Promise}    
 */
exports.delete_session$ = function(sm, session_id) {
  return sm.delete_session$(session_id);
};

/**
 * ask session to act
 * @param  {object} sm
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
exports.invoke_session$ = function(sm, session_id, action, others) {
  return sm.invoke_session$(session_id, action, others);
};


/**
 * clear a session whose id is session_id.
 * if the session is not exsit, resolve()
 * if the session is idle, delete_session
 * if the session is paused, stop and delete
 * if the session is sending, pause and stop and delete
 * @param  {Object} sm        
 * @param  {String} session_id 
 * @return {Promise}            
 */
exports.clear_session$ = function(sm, session_id) {
  return sm.clear_session$(session_id);
};

/**
 * clear all sessions, whose mnode is mnode_id.
 * session's mnode means the mnode of the session's creator
 * @param  {Object} sm        
 * @param  {String} mnode_id  
 * @return {Promise}            
 */
exports.clear_sessions_with_mnode$ = function(sm, mnode_id) {
  return sm.clear_sessions_with_mnode$(mnode_id);
};

/**
 * clear all sessions
 * @param  {Object} sm        
 * @return {Promise}            
 */
exports.clear_all_sessions$ = function(sm) {
  return sm.clear_all_sessions$();
};
// -----------------------------------------------------------------
// Service related. 
// -----------------------------------------------------------------
/**
 * install the service.
 * O, make sure the servcie is not installed before (aka, not in the servcie cache). 
 *    Otherwise, reject the promise
 * 1, fetch the service and create a service_cache_obj, save in cache
 * 2, call service_init
 * @param  {object} sm  
 * @param  {id} service_id 
 * @return {Promise}            resolve: init done value
 */
exports.install_service$ = function(sm, service_id) {
  return sm.install_service$(service_id);
};

/**
 * uninstall the service
 * 0, make sure the service is installed (aka, in service is in cache)
 * 1, get the service_cache_obj
 * 2, call destroy func
 * 3, delete the obj in cache
 * @param  {object} sm  
 * @param  {id} service_id 
 * @return {Promise}          resolve: destroy done value
 */
exports.uninstall_service$ = function(sm, service_id) {
  return sm.uninstall_service$(service_id);
};


/**
 * uninstall all services
 * 0, make sure the service is installed (aka, in service is in cache)
 * 1, get the service_cache_obj
 * 2, call destroy func
 * 3, delete the obj in cache
 * @param  {object} sm  
 * @param  {id} service_id 
 * @return {Promise}          resolve: destroy done value
 */
exports.clear_all_services$ = function(sm) {
  return sm.clear_all_services$();
};
// -----------------------------------------------------------------
// Message related. 
// -----------------------------------------------------------------

/**
 * send invoke_cmd to remote session
 * @param  {Object} mnode        src mnode
 * @param  {id} dst_mnode_id     dst mnode id
 * @param  {id} session_id   
 * @param {id} invocation_id respresents this invocation
 * @param  {string} action       action name
 * @param  {Object} others       other parameters
 *                               {
 *                                 IN: for kernel
 *                                 tags: for kernel
 *                                 service_id: for start
 *                                 config: for start, session's config object
 *                               }
 * @return {Promise}              mnode.send$'s ret
 */
exports.send_invoke_cmd$ = function(mnode, dst_mnode_id, session_id, invocation_id, action, others) {
  log("send_invoke_cmd$", dst_mnode_id, session_id, invocation_id, action, others);
  var msg = {
    action: action,
    session_id: session_id,
    invocation_id: invocation_id
  };
  if (action === "kernel") {
    check(_.isObject(others.IN), "sm/send_invoke_cmd",
     "kernel must have IN in others", action, others);
    msg.IN = others.IN;
    msg.tags = others.tags;
  }
  if (action === "start") {
    check(!_.isUndefined(others.service_id), "sm/send_invoke_cmd",
     "start must have service_id in others", action, others);
    msg.service_id = others.service_id;
    msg.config = others.config;
  }
  return mnode.send$(dst_mnode_id, "session_invoke", msg);
};


// ---------------------------------------------
// create sm / wa
// --------------------------------------------

var SessionManager = require("./lib/session-manager").SessionManager;

/**
 * create a session manager, which will handle session/service invoke
 * @param  {Object} config {
 *                           mnode:
 *                           em:
 *                         }
 * @return {Promise}        resolve: inited session manager obj
 */
exports.create_session_manager$ = function(config) {
  var sm;
  return Promise.resolve()
  .then(function() {
    sm = new SessionManager(config.em, config.mnode);
    return sm.init$();
  }).then(function() {
    return sm;
  });
};



exports.$factories = {
  SessionManager: exports.create_session_manager$
};