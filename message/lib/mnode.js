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
var Port = require("./port");
var consts = require("./consts");

var log = B.log.for_category("message/mnode");

var all_mnodes_in_this_process = {};

var MNode =
/**
 * A Message Node
 * config is optional, it may contains {
 *   id: ...,        // otherwise would automatically generate one
 *   ports: {
 *     accept: [[params], [params]], // other ports beyond default local. each 
 *       // elements (params) are in format of {
 *       //   name: ...
 *       //   impl: e.g. event, http etc.
 *       //   config: ...
 *       // }
 *     ...
 *   }
 * }
 *
 * A Message Node would have a bunch of Ports for in / out messages. Each Port 
 * could be described as a PortAddress which is a plain object in format of {
 *   mnode_id: ...
 *   name: use this to get it from the MNode.ports
 *   type: send / accept / subscribe / publish
 *   impl: the actual implementor class for the port
 *   data: {...}   // this is customize by each impl. itself, e.g. it may 
 *                    contain the URL address to visit a HTTP based port
 * }
 * 
 * @exports message/mnode
 */
module.exports = function MNode(router, config) {
  B.check(_.isObject(router), "message/mnode/create", "Need a router");
  config = config || {};

  this.router = router;
  this.id = config.id || B.unique_id("MNODE_");
  this.name = config.name || "<" + config.id + ">";

  B.check_warn(!_.isObject(all_mnodes_in_this_process[this.id]), 
    "message/mnode/create", "id already used in this process", this.id);

  this.events = {
    accept: new EventEmitter(),
    subscribe: {},
    subscribe_all: new EventEmitter()
  };

  // need to know all listened topics, however, this is a private member
  // e.g. _events that might be changed in the future
  // so we workaround it by ourselves
  var _topics = this.events.subscribe_all.$hope_topics = {};
  var f_on = this.events.subscribe_all.on.bind(this.events.subscribe_all);
  this.events.subscribe_all.on = function(_t, _f) {
    _topics[_t] = true;
    f_on(_t, _f);
  };

  this.ports = {
    accept: new B.type.IndexedArray("name"),
    send: new B.type.IndexedArray("name"),
    subscribe: new B.type.IndexedArray("name"),
    publish: new B.type.IndexedArray("name")    
  };

  // by default, it should have local ports in place, which is event based
  this.ports.accept.push(Port.get_impl("accept", "event").create(this, 
    consts.LOCAL_PORT_NAME));
  this.ports.send.push(Port.get_impl("send", "event").create(this, 
    consts.LOCAL_PORT_NAME));
  this.ports.subscribe.push(Port.get_impl("subscribe", "event").create(this, 
    consts.LOCAL_PORT_NAME));
  this.ports.publish.push(Port.get_impl("publish", "event").create(this, 
    consts.LOCAL_PORT_NAME));

  // other ports are added from config
  config.ports = config.ports || {};

  var self = this;
  ["accept", "send", "subscribe", "publish"].forEach(function(_type) {
    var _src = config.ports[_type] || [];
    var _tgt = self.ports[_type];
    _src.forEach(function(_port) {
      B.check(_.isObject(_port), "message/mnode", "Port config should be object", self.config);
      _tgt.push(Port.create.call(Port, self, _type, _port.impl,
        _port.name, _port.config));
    });
  });

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


MNode.create = function(router, config) {
  return new MNode(router, config);
};


MNode.dispose = function(mnode_id) {
  var n = all_mnodes_in_this_process[mnode_id];
  if (n) {
    delete all_mnodes_in_this_process[mnode_id];
    MNode.event.emit("removed", n);
  }
};

MNode.prototype.destroy_its_webapp = function() {
  if (this.ports.accept.index.http && this.ports.accept.index.http.config.app) {
    this.ports.accept.index.http.config.app.$destroy();
  }
  if (this.ports.subscribe.index.http && this.ports.subscribe.index.http.config.app) {
    this.ports.subscribe.index.http.config.app.$destroy();
  }
};

MNode.prototype.updated = function() {
  MNode.event.emit("updated", this);
};


MNode.prototype.get_route_info = function() {
  var r = {
    id: this.id,
    ports: {
      accept: [],
      send: [],
      subscribe: [],
      publish: []
    }
  };
  function _get_address(to_arr, from_arr) {
    from_arr.forEach(function(p) {
      to_arr.push(p.get_addr());
    });
  }
  _get_address(r.ports.accept, this.ports.accept.array);
  _get_address(r.ports.send, this.ports.send.array);
  _get_address(r.ports.subscribe, this.ports.subscribe.array);
  _get_address(r.ports.publish, this.ports.publish.array);

  return r;
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

MNode.get_all_mnodes_in_this_process = function(mnode_id) {
  return all_mnodes_in_this_process;
};

MNode.prototype.is_in_this_process = function(mnode_id) {
  return MNode.is_in_this_process(mnode_id);
};

MNode.prototype.get_mnode_in_this_process = function(mnode_id) {
  return MNode.get_mnode_in_this_process(mnode_id);
};

//----------------------------------------------------------------
// Ports
//----------------------------------------------------------------
MNode.prototype.get_port_from_addr = function(addr) {
  B.check(addr.mnode_id === this.id, "message/get_port_from_addr",
    "Mismatched mnode_id: this is", this.id, " but addr is ", addr);
  return this.ports[addr.type].get(addr.name);
};

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
  this.events.accept.on(topic, cb);
  return Promise.resolve();
};

MNode.prototype.remove_accept$ = function(topic, cb) {
  log("remove_accept", "[topic]", topic, "[for]", cb ? "one cb" : "all cbs", "[by]", this.name);
  if (cb) {
    this.events.accept.removeListener(topic, cb);
  } else {
    this.events.accept.removeAllListeners(topic);
  }
  return Promise.resolve();
};

MNode.prototype.clean_accepts$ = function() {
  log("clean_accepts", "[by]", this.name);
  this.events.accept.removeAllListeners();
  return Promise.resolve();
};


MNode.prototype.on_message_for_accept = function(msg, accept_port) {
  log("ACCEPTED", msg);
  this.events.accept.emit(msg.topic, msg.message, msg.topic, msg.from.mnode_id);
};

//----------------------------------------------------------------
// Subscribe
//----------------------------------------------------------------

// Unlike send/accept which is always 1:1 mapping
// It subscribes multiple ports while the target also publish to multiple ports
// So we need to use this function to filter all messages it receives, to ensure
// for one message, it would be handled by the subscriber only once
// We do so by ensure that for a mnode_id, we should only accept the publish msg
// from only one publish port while ingores msg from other publish ports
// 
// It resolves if accepts this message, otherwise rejects
MNode.prototype.is_published_message_from_right_port$ = function(msg, port) {
  // if port already cached and no need to check router
  var m = this.events.subscribe[msg.from.mnode_id];
  if (m && m.port)  {
    return new Promise(function(resolve, reject) {
      if (m.port === port) {
        resolve();
      } else {
        reject();
      }
    });
  } 

  // check router
  return this.router.check_address_for_published_message$(port, msg.from);
    
};


MNode.prototype.on_message_for_subscribe = function(msg, sub_port) {
  var self = this;
  this.is_published_message_from_right_port$(msg, sub_port).then(function() {
    var e = self.events.subscribe[msg.from.mnode_id];
    if (e) {
      log("SUBSCRIBE ARRIVED", msg);
      e.event.emit(msg.topic, msg.message, msg.topic, msg.from.mnode_id);
    }
  }).done();  
};


MNode.prototype.on_message_for_subscribe_all = function(msg, sub_port) {
  var self = this;
  this.is_published_message_from_right_port$(msg, sub_port).then(function() {
    log("SUBSCRIB_ALL ARRIVED", msg);
    self.events.subscribe_all.emit(msg.topic, msg.message, msg.topic, msg.from.mnode_id);
  }).done();
};


MNode.prototype.subscribe$ = function(mnode_id, topic, cb) {
  log("subscribe", "[mnode]", mnode_id, "[topic]", topic, "[by]", this.name);
  if (!this.events.subscribe[mnode_id]) {
    this.events.subscribe[mnode_id] = {
      topics: {},
      port: null,
      info: null,
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
    if (m.port) {
      return m.port.subscribe$(m.info, topic);
    } else {
      return this.router.get_info_for_subscribe$(this, mnode_id).then(function(info) {
        m.port = info.port;
        m.info = info.info;
        return m.port.subscribe$(m.info, topic);
      });
    }
  }
};

MNode.prototype.subscribe_all$ = function(topic, cb) {
  log("subscribe_all", "[topic]", topic, "[by]", this.name);
  var has_subscribed = (this.events.subscribe_all.listeners(topic, true) > 0);
  this.events.subscribe_all.on(topic, cb);
  if (has_subscribed) {
    return Promise.resolve();
  } 
  return this.router.get_info_for_subscribe_all$(this).then(function(info_arr) {
    return Promise.all(info_arr.map(function(info) {
      return info.port.subscribe_all$(topic);
    }));
  });
};

MNode.prototype.unsubscribe$ = function(mnode_id, topic, cb) {
  log("unsubscribe", "[mnode]", mnode_id, "[topic]", topic,
    "[for]", cb ? "one cb" : "all cbs", "[by]", this.name);
  var m = this.events.subscribe[mnode_id];
  if (!m) {
    return;
  }
  if (cb) {
    m.event.removeListener(topic, cb);
  } else {
    m.event.removeAllListeners(topic);
  }
  var to_unsubscribe = [];
  _.forOwn(m.topics, function(k) {
    if (!m.event.listeners(k, true)) {
      delete m.topics[k];     
      to_unsubscribe.push(k);
    }
  });
  if (_.isEmpty(m.topics)) {
    delete this.events.subscribe[mnode_id];
  }
  if (to_unsubscribe.length) {
    return Promise.all(to_unsubscribe.map(function(t) {
      return m.port.unsubscribe$(m.info, t);
    }));
  } else {
    return Promise.resolve();
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
  if (cb) {
    this.events.subscribe_all.removeListener(topic, cb);
  } else {
    this.events.subscribe_all.removeAllListeners(topic);
  }
  if (this.events.subscribe_all.listeners(topic, true)) {
    return Promise.resolve();
  } else {
    delete this.events.subscribe_all.$hope_topics[topic];
    return Promise.all(this.ports.subscribe.array.map(function(p) {
      return p.unsubscribe_all$(topic);
    }));
  }
};

MNode.prototype.clean_subscribe_all$ = function() {
  log("clean_subscribe_all");
  var self = this;
  return Promise.all(Object.keys(this.events.subscribe_all.$hope_topics)
    .map(function(topic) {
      return self.unsubscribe_all$(topic);
    }));
};



//----------------------------------------------------------------
// Send
//----------------------------------------------------------------
MNode.prototype.send$ = function(mnode_id, topic, data) {
  return this.router.get_info_for_send$(this, mnode_id).then(function(info) {
    log("SEND", mnode_id, topic, data);
    return info.port.send$(info.info, topic, data);
  });
};


//----------------------------------------------------------------
// Publish
//----------------------------------------------------------------
MNode.prototype.publish$ = function(topic, data) {
  var self = this;
  // we added additional Promise.resolve() to ensure publish$ and 
  // subscribe$ has same number of then in internal, this ensures port.sub 
  // and port.pub is executed in order, for local event impl.

  return Promise.resolve().then(function() {
    return self.router.get_info_for_publish$(self).then(function(info_arr) {
      log("PUBLISH", topic, data);
      return Promise.all(info_arr.map(function(info) {
        return info.port.publish$(topic, data);
      }));
    });

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