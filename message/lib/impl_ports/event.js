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
 * Port Implementation based on events 
 * @module  message/port/event
 */

var Port = require("../port");
var B = require("hope-base");
var EventEmitter = require("eventemitter3");
var M = require("../message");

// this is used for subscrib_all
var _all_emitter_ = new EventEmitter();

module.exports = {
  accept: AcceptPort,
  send: SendPort,
  subscribe: SubscribePort,
  publish: PublishPort
};

//----------------------------------------------------------------
// Accept
//----------------------------------------------------------------

function AcceptPort(mnode, name, config) {
  Port.AcceptPort.apply(this, arguments);
}
B.type.inherit(AcceptPort, Port.AcceptPort);

AcceptPort.create = function(mnode, name, config) {
  return new AcceptPort(mnode, name, config);
};

AcceptPort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "accept",
    impl: "event",
    data: {}
  };
};


//----------------------------------------------------------------
// Send
//----------------------------------------------------------------

function SendPort(mnode, name, config) {
  Port.SendPort.apply(this, arguments);
}
B.type.inherit(SendPort, Port.SendPort);

SendPort.create = function(mnode, name, config) {
  return new SendPort(mnode, name, config);
};


SendPort.prototype.get_info_to_talk = function(to_mnode_id, to_info) {
  if (!this.mnode.is_in_this_process(to_mnode_id)) {
    return null;
  }
  var i, p;
  var port_addrs = to_info.ports.accept;
  for (i = 0; i < port_addrs.length; i ++) {
    p = port_addrs[i];
    if (p.type === "accept" && p.impl === "event") {
      return {
        addr: p
      };
    }
  }
  return null;
};

SendPort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "send",
    impl: "event",
    data: {}
  };
};


SendPort.prototype.send$ = function(info, topic, message) {
  var self = this;
  var to = B.check(
    this.mnode.get_mnode_in_this_process(info.addr.mnode_id).get_port_from_addr(info.addr),
    "message/event/SendPort", "Failed to get the info.addr event", info.addr);

  return new Promise(function(resolve) {
    to.on_message(M.encode_send(self.get_addr(), info.addr.mnode_id, topic, message));
    resolve();
  });
};


//----------------------------------------------------------------
// Subscribe
//----------------------------------------------------------------

function SubscribePort(mnode, name, config) {
  Port.SubscribePort.apply(this, arguments);
  this.msg_handler = this.on_message.bind(this);
  this.all_msg_handler = this.on_message_all.bind(this);
}
B.type.inherit(SubscribePort, Port.SubscribePort);

SubscribePort.create = function(mnode, name, config) {
  return new SubscribePort(mnode, name, config);
};

SubscribePort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "subscribe",
    impl: "event",
    data: {}
  };
};

SubscribePort.prototype.get_info_to_talk = function(pub_mnode_id, to_info) {
  if (!this.mnode.is_in_this_process(pub_mnode_id)) {
    return null;
  }
  var i, p;
  var port_addrs = to_info.ports.publish;
  for (i = 0; i < port_addrs.length; i++) {
    p = port_addrs[i];
    if (p.type === "publish" && p.impl === "event") {
      return {
        addr: p
      };
    }
  }
  return null;
};

SubscribePort.prototype._get_valid_to_port = function(info) {
  return B.check(
    this.mnode.get_mnode_in_this_process(info.addr.mnode_id).get_port_from_addr(info.addr),
    "message/event/SubscribePort", "Failed to get the addr event", info);
};

SubscribePort.prototype.subscribe$ = function(info, topic) {
  var self = this;
  return new Promise(function(resolve) {
    B.later(function() {
      self._get_valid_to_port(info).event.on(topic, self.msg_handler);
      resolve();
    });
  });
};

SubscribePort.prototype.unsubscribe$ = function(info, topic) {
  this._get_valid_to_port(info).event.removeListener(topic, this.msg_handler);
  return Promise.resolve();
};


SubscribePort.prototype.subscribe_all$ = function(topic) {
  _all_emitter_.on(topic, this.all_msg_handler);
  return Promise.resolve();
};

SubscribePort.prototype.unsubscribe_all$ = function(topic) {
  _all_emitter_.removeListener(topic, this.all_msg_handler);
  return Promise.resolve();
};

//----------------------------------------------------------------
// Publish
//----------------------------------------------------------------

function PublishPort(mnode, name, config) {
  Port.PublishPort.apply(this, arguments);
  this.event = new EventEmitter();
}
B.type.inherit(PublishPort, Port.PublishPort);

PublishPort.create = function(mnode, name, config) {
  return new PublishPort(mnode, name, config);
};



PublishPort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "publish",
    impl: "event",
    data: {}
  };
};


PublishPort.prototype.publish$ = function(topic, message) {
  var self = this;
  return new Promise(function(resolve) {
    B.later(function() {
      var msg = M.encode_publish(self.get_addr(), topic, message);
      _all_emitter_.emit(topic, msg);
      self.event.emit(topic, msg);
      resolve();
    });
  });
};
