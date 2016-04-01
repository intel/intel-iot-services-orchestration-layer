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
var _ = require("lodash");
var B = require("hope-base");
var EventEmitter = require("eventemitter3");
var BrokerClient = require("./broker_client");

var log = B.log.for_category("message/mnode");

var all_mnodes_in_this_process = {};

var MNode =
/**
 * A Message Node
 * config is optional, it may contains {
 *   id: ...,         // otherwise would automatically generate one
 *   brokers: [{      // a list of broker definitioin
 *     type: ...
 *     config: {}
 *   },  ...]
 * }
 *
 * @exports message/mnode
 */
module.exports = function MNode(config) {
  this.config = config = config || {};

  this.id = config.id || B.unique_id("MNODE_");
  this.name = config.name || "<" + config.id + ">";

  this.broker_clients = [];
  // We specially handle local broker client instead of putting it into 
  // the broker_clients array above
  this.disable_local_broker = config.disable_local_broker;
  this.local_broker_client = null;
  this.events_broker = new EventEmitter();

  B.check_warn(!_.isObject(all_mnodes_in_this_process[this.id]), 
    "message/mnode/create", "id already used in this process", this.id);

  this.events = {
    accept: {
      topics: {},
      event: new EventEmitter()
    },
    subscribe: {},
    subscribe_all: {
      topics: {},
      event: new EventEmitter()
    }
  };


  // RPC sessions
  this.rpc = {
    is_enabled: false,
    sessions: {},
    defines: {}
  };

  this.rpc_handler = this._handle_rpc_call.bind(this);


  all_mnodes_in_this_process[this.id] = this;
  MNode.event.emit("added", this);
};

MNode.event = new EventEmitter();


MNode.create$ = function(config) {
  var m = new MNode(config);
  return m.init$().then(function() {
    return m;
  });
};

MNode.dispose$ = function(mnode_id) {
  var n = all_mnodes_in_this_process[mnode_id];
  if (n) {
    delete all_mnodes_in_this_process[mnode_id];
    MNode.event.emit("removed", n);
    return n.dispose$();
  } else {
    return Promise.resolve();
  }
};


MNode.prototype.init$ = function() {
  var bc_config = this.config.brokers || [];
  if (!_.isArray(bc_config)) {
    bc_config = [bc_config];
  }
  var self = this;
  // need to keep the order of the broker_clients in config
  var todos = [];
  _.forOwn(bc_config, function(v, k) {
    todos.push(BrokerClient.create$(v.type, self, v).then(function(bc) {
      self.broker_clients[k] = bc;
    }));
  });
  todos.push(BrokerClient.create$("events", self).then(function(bc) {
    self.local_broker_client = bc;
  }));
  return Promise.all(todos);
};

MNode.prototype.dispose$ = function() {
  return Promise.all(this.broker_clients.map(function(bc) {
    return bc.dispose$();
  }));
};


MNode.prototype.updated = function() {
  MNode.event.emit("updated", this);
};


//----------------------------------------------------------------
// Helpers
//----------------------------------------------------------------

MNode.is_in_this_process = function(mnode_id) {
  return _.has(all_mnodes_in_this_process, mnode_id);
};

MNode.get_mnode_in_this_process = function(mnode_id) {
  return all_mnodes_in_this_process[mnode_id];
};

MNode.get_all_mnodes_in_this_process = function() {
  return all_mnodes_in_this_process;
};

MNode.prototype.is_in_this_process = function(mnode_id) {
  return MNode.is_in_this_process(mnode_id);
};

MNode.prototype.get_mnode_in_this_process = function(mnode_id) {
  return MNode.get_mnode_in_this_process(mnode_id);
};

MNode.prototype.validate_income_msg = function(msg, from_broker) {
  if (this.is_in_this_process(msg.from.mnode_id) && from_broker && !this.disable_local_broker) {
    if (from_broker !== this.local_broker_client) {
      return false;
    }
  }
  return true;
};


//----------------------------------------------------------------
// Message Envelop
//----------------------------------------------------------------
var _msg_seq = 1;

function _encode_send_msg(from_mnode_id, to_mnode_id, topic, msg, options) {
  return {
    type: "send",
    from: from_mnode_id,
    to: to_mnode_id,
    topic: topic,
    message: msg,
    options: options,
    seq: _msg_seq++,
    timestamp: Date.now()
  };
}

function _encode_publish_msg(from_mnode_id, topic, msg, options) {
  return {
    type: "publish",
    from: from_mnode_id,
    topic: topic,
    message: msg,
    options: options,
    seq: _msg_seq++,
    timestamp: Date.now()
  };
}



//----------------------------------------------------------------
// Accept
//----------------------------------------------------------------

/**
 * Add message handler
 * @param  {String} topic 
 * @param  {Function} cb     callback with signature cb(message, topic, from_mnode_id)
 */
MNode.prototype.accept$ = function(topic, cb) {
  log("accept", topic, "[by]", this.name);
  var has_subscribed = this.events.accept.topics[topic];
  this.events.accept.topics[topic] = true;
  this.events.accept.event.on(topic, cb);
  if (has_subscribed) {
    return Promise.resolve();
  } else {
    return Promise.all(this.broker_clients.map(function(bc) {
      return bc.accept$(topic);
    }));
  }
};

MNode.prototype.remove_accept$ = function(topic, cb) {
  log("remove_accept", "[topic]", topic, "[for]", cb ? "one cb" : "all cbs", "[by]", this.name);
  if (!this.events.accept.topics[topic]) {
    return Promise.resolve();
  }
  if (cb) {
    this.events.accept.event.removeListener(topic, cb);
  } else {
    this.events.accept.event.removeAllListeners(topic);
  }
  if (this.events.accept.event.listeners(topic, true)) {
    return Promise.resolve();
  } else {
    delete this.events.accept.topics[topic];
    return Promise.all(this.broker_clients.map(function(bc) {
      return bc.unaccept$(topic);
    }));
  }
};

MNode.prototype.clean_accepts$ = function() {
  log("clean_accepts", "[by]", this.name);
  this.events.accept.event.removeAllListeners();
  return Promise.resolve();
};


MNode.prototype.on_message_for_accept = function(msg, from_broker) {
  if (this.validate_income_msg(msg, from_broker)) {
    log("ACCEPTED", msg);
    this.events.accept.event.emit(msg.topic, msg.message, msg.topic, msg.from);
  }
};

//----------------------------------------------------------------
// Subscribe
//----------------------------------------------------------------


MNode.prototype.on_message_for_subscribe = function(msg, from_broker) {
  var e = this.events.subscribe[msg.from];
  if (e && this.validate_income_msg(msg, from_broker)) {
    log("SUBSCRIBE ARRIVED", msg);
    e.event.emit(msg.topic, msg.message, msg.topic, msg.from);
  }
};


MNode.prototype.on_message_for_subscribe_all = function(msg, from_broker) {
  if (this.validate_income_msg(msg, from_broker)) {
    log("SUBSCRIB_ALL ARRIVED", msg);
    this.events.subscribe_all.event.emit(msg.topic, msg.message, msg.topic, msg.from);
  }
};


MNode.prototype.subscribe$ = function(mnode_id, topic, cb) {
  log("subscribe", "[mnode]", mnode_id, "[topic]", topic, "[by]", this.name);
  if (!this.events.subscribe[mnode_id]) {
    this.events.subscribe[mnode_id] = {
      topics: {},
      event: new EventEmitter()
    };
  }
  var m = this.events.subscribe[mnode_id];
  var has_subscribed = m.topics[topic];
  m.topics[topic] = true;
  m.event.on(topic, cb);

  if (has_subscribed) {
    return Promise.resolve();
  } else {
    if (this.is_in_this_process(mnode_id) && !this.disable_local_broker) {
      return this.local_broker_client.subscribe$(mnode_id, topic);
    }
    return Promise.all(this.broker_clients.map(function(bc) {
      return bc.subscribe$(mnode_id, topic);
    }));
  }
};

MNode.prototype.subscribe_all$ = function(topic, cb) {
  log("subscribe_all", "[topic]", topic, "[by]", this.name);
  var has_subscribed = this.events.subscribe_all.topics[topic];
  this.events.subscribe_all.topics[topic];
  this.events.subscribe_all.event.on(topic, cb);
  if (has_subscribed) {
    return Promise.resolve();
  } 
  var todos = this.broker_clients.map(function(bc) {
      return bc.subscribe_all$(topic);
  });
  if (!this.disable_local_broker) {
    todos.push(this.local_broker_client.subscribe_all$(topic));
  }
  return Promise.all(todos);
};

MNode.prototype.unsubscribe$ = function(mnode_id, topic, cb) {
  log("unsubscribe", "[mnode]", mnode_id, "[topic]", topic,
    "[for]", cb ? "one cb" : "all cbs", "[by]", this.name);
  var m = this.events.subscribe[mnode_id];
  if (!m || !m.topics[topic]) {
    return Promise.resolve();
  }
  if (cb) {
    m.event.removeListener(topic, cb);
  } else {
    m.event.removeAllListeners(topic);
  }
  var need_unsub = false;
  if (!m.event.listeners(topic, true)) {  // no listeners now
    need_unsub = true;
    delete m.topics[topic];
    if (_.isEmpty(m.topics)) {
      delete this.events.subscribe[mnode_id];
    }
  }
  if (need_unsub) {
    if (this.is_in_this_process(mnode_id) && !this.disable_local_broker) {
      return this.local_broker_client.unsubscribe$(mnode_id, topic);
    } else {
      return Promise.all(this.broker_clients.map(function(bc) {
        return bc.unsubscribe$(mnode_id, topic);
      }));
    }
  }
};



MNode.prototype.clean_subscribe$ = function(mnode_id) {
  log("clean_subscribe", "[mnode]", mnode_id ? mnode_id : "*ALL*", "[by]", this.name);
  var self = this;
  if (mnode_id) {
    var m = this.events.subscribe[mnode_id];
    if (m) {
      return Promise.all(Object.keys(m.topics).map(function(t) {
        return self.unsubscribe$(mnode_id, t);
      }));
    }
  } else {
    return Promise.all(Object.keys(this.events.subscribe).map(function(n_id) {
      return self.clean_subscribe$(n_id);
    }));
  }
};

MNode.prototype.unsubscribe_all$ = function(topic, cb) {
  log("subscribe_all", "[topic]", topic, "[by]", this.name);
  if (!this.events.subscribe_all.topics[topic]) {
    return Promise.resolve();
  }
  if (cb) {
    this.events.subscribe_all.event.removeListener(topic, cb);
  } else {
    this.events.subscribe_all.event.removeAllListeners(topic);
  }
  if (this.events.subscribe_all.listeners(topic, true)) {
    return Promise.resolve();
  } else {
    delete this.events.subscribe_all.topics[topic];
    var todos = this.broker_clients.map(function(bc) {
      return bc.unsubscribe_all$(topic);
    });
    if (!this.disable_local_broker) {
      todos.push(this.local_broker_client.unsubscribe_all$(topic));
    }
    return Promise.all(todos);
  }
};

MNode.prototype.clean_subscribe_all$ = function() {
  log("clean_subscribe_all");
  var self = this;
  return Promise.all(Object.keys(this.events.subscribe_all.topics)
    .map(function(topic) {
      return self.unsubscribe_all$(topic);
    }));
};



//----------------------------------------------------------------
// Send
//----------------------------------------------------------------
MNode.prototype.send$ = function(mnode_id, topic, data) {
  var msg = _encode_send_msg(this.id, mnode_id, topic, data);
  if (this.is_in_this_process(mnode_id) && !this.disable_local_broker) {
    return this.local_broker_client.send$(mnode_id, topic, msg);
  } else {
    return Promise.all(this.broker_clients.map(function(bc) {
      return bc.send$(mnode_id, topic, msg);
    }));
  }
};


//----------------------------------------------------------------
// Publish
//----------------------------------------------------------------
MNode.prototype.publish$ = function(topic, data) {
  var self = this;
  var msg = _encode_publish_msg(this.id, topic, data);
  // we added additional Promise.resolve() to ensure publish$ and 
  // subscribe$ has same number of then in internal, this ensures port.sub 
  // and port.pub is executed in order, for local event impl.
  return Promise.resolve().then(function() {
    log("PUBLISH", topic, data);
    var todos = self.broker_clients.map(function(bc) {
      return bc.publish$(topic, msg);
    });
    if (!this.disable_local_broker) {
      todos.push(self.local_broker_client.publish$(topic, msg));
    }
    return Promise.all(todos);
  });
};


//----------------------------------------------------------------
// Helpers
//----------------------------------------------------------------
/**
 * Listen to events and publish them
 * @param  {Event} e      
 * @param  {Array} topics 
 */
MNode.prototype.attach_publish_to_event = function(e, topics) {
  var self = this;
  topics.forEach(function(t) {
    e.on(t, function(m) {
      self.publish$(t, m).done();
    });
  });
};

/**
 * Generate an event for subscribed messages
 * @param  {Event} e      
 * @param  {String} mnode_id
 * @param  {Array} topics 
 */
MNode.prototype.attach_event_to_subscribe$ = function(e, mnode_id, topics) {
  var self = this;
  return Promise.all(topics.map(function(t) {
    return self.subscribe$(mnode_id, t, function(msg, topic) {
      e.emit(msg, topic);
    });
  }));
};

/**
 * Generate an event for subscribe_all messages
 * @param  {Event} e      
 * @param  {Array} topics 
 */
MNode.prototype.attach_event_to_subscribe_all$ = function(e, topics) {
  var self = this;
  return Promise.all(topics.map(function(t) {
    return self.subscribe_all$(t, function(msg, topic) {
      e.emit(msg, topic);
    });
  }));
};


//----------------------------------------------------------------
// Remote Procedure Call
// 
// based on accept$ and send$
//----------------------------------------------------------------

var rpc_entry = "__HOPE__/__RPC__";

MNode.prototype._close_rpc_session = function(session_id, result, error) {
  var session = this.rpc.sessions[session_id];
  if (!session) {
    B.check_warn(false, "mnode/rpc/close_session",
      "Session expired already", session_id, result, error);
  } else {
    delete this.rpc.sessions[session_id];
    if (session.timer) {
      clearTimeout(session.timer);
    }
    if (error) {
      session.reject(error);
    } else {
      session.resolve(result);
    }
  }
};

// msg {
//   session: ...,
//   type: "invoke" 
//   func: ...,
//   params: ...,
//   config: ...
// } or {
//   session: ...,
//   type: "return",
//   error / result: ...
// }
MNode.prototype._handle_rpc_call = function(msg, topic, from_mnode_id) {
  log("handle rpc", msg, from_mnode_id);
  B.check(msg.type === "invoke" || msg.type === "return",
    "mnode/rpc/handle_rpc", "Unknow msg type", msg);
  var self = this;
  if (msg.type === "invoke") {
    var f = this.rpc.defines[msg.func];
    if (!f) {
      this.send$(from_mnode_id, rpc_entry, {
        session: msg.session,
        type: "return",
        error: "RPC function " + msg.func + " not defined on " + this.id
      }).done();
    } else {
      if (_.isUndefined(msg.params)) {
        msg.params = [];
      }
      Promise.resolve(f.apply({}, msg.params)).then(function(r) {
        return self.send$(from_mnode_id, rpc_entry, {
          session: msg.session,
          type: "return",
          result: r
        });
      }).catch(function(err) {
        return self.send$(from_mnode_id, rpc_entry, {
          session: msg.session,
          type: "return",
          error: "RPC function " + msg.func + " on " + self.id + 
                  " failed due to " + err.toString()
        });
      }).done();
    }
  } else if (msg.type === "return") {
    this._close_rpc_session(msg.session, msg.result, msg.error);
  }
};


MNode.prototype.enable_rpc$ = function() {
  if (this.rpc.is_enabled) {
    return Promise.resolve();
  }
  var self = this;
  return this.accept$(rpc_entry, this.rpc_handler).then(function() {
    self.rpc.is_enabled = true;
  });
};

MNode.prototype.disable_rpc$ = function() {
  if (!this.rpc.is_enabled) {
    return Promise.resolve();
  }
  var self = this;
  return this.remove_accept$(rpc_entry, this.rpc_handler).then(function() {
    self.rpc.is_enabled = false;
  });
};


MNode.prototype.define_rpc = function(func_name, func) {
  B.check_warn(this.rpc.is_enabled, "mnode/rpc/define", 
    "RPC isn't enabled when define", func_name);
  B.check(!this.rpc.defines[func_name], "mnode/rpc/define", "Already defined:", func_name);
  B.check(_.isFunction(func), "mnode/rpc/define", "Should be a function", func);
  this.rpc.defines[func_name] = func;
};

MNode.prototype.undefine_rpc = function(func_name) {
  delete this.rpc.defines[func_name];
};


MNode.prototype.invoke_rpc$ = function(mnode_id, func_name, params, config) {
  B.check(this.rpc.is_enabled, "mnode/rpc/invoke", "RPC hasn't been enabled yet");
  var self = this;
  if (_.isUndefined(params)) {
    params = [];
  }
  if (!_.isArray(params)) {
    params = [params];
  }
  config = config || {};
  return new Promise(function(resolve, reject) {
    var session_id = B.unique_id("HOPE_RPC_SESSION_");
    var session = {
      resolve: resolve,
      reject: reject
    };
    self.rpc.sessions[session_id] = session;

    if (config.timeout > 0) {
      session.timer = setTimeout(function() {
        self._close_rpc_session(session_id, null, 
          "Timeout for invoking rpc", mnode_id, func_name, params, config);
      }, config.timeout);
    }

    self.send$(mnode_id, rpc_entry, {
      session: session_id,
      type: "invoke",
      func: func_name,
      params: params,
      config: config
    }).catch(function(err) {
      self._close_rpc_session(session_id, null, err);
    });
  });
};