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
var B = require("hope-base");
var BrokerClient = require("../lib/broker_client");
var AbstractBrokerClient = BrokerClient.AbstractBrokerClient;
var EventEmitter = require("eventemitter3");


// this is used for subscrib_all
var _all_emitter_ = new EventEmitter();

function EventsBrokerClient(mnode, config) {
  AbstractBrokerClient.call(this, mnode, config);
}

B.type.inherit(EventsBrokerClient, AbstractBrokerClient);



EventsBrokerClient.create$ = function(mnode, config) {
  var bc = new EventsBrokerClient(mnode, config);
  return Promise.resolve(bc);
};

EventsBrokerClient.prototype.dispose$ = function() {
  return Promise.resolve();
};


// invoke this.mnode.on_message_for_accept when msg is received
EventsBrokerClient.prototype.accept$ = function(topic) {
  return Promise.resolve();
};

EventsBrokerClient.prototype.unaccept$ = function(topic) {
  return Promise.resolve();
};

EventsBrokerClient.prototype.send$ = function(mnode_id, topic, msg) {
  var m = this.mnode.get_mnode_in_this_process(mnode_id);
  var self = this;
  return new Promise(function(resolve, reject) {
    if (m) {
      m.on_message_for_accept(msg, self);
      resolve();
    } else {
      reject("message/broker_client/events: Send to a mnode_id not in same process: " + mnode_id);      
    }
  });
};

// invoke this.mnode.on_message_for_subscribe when msg is received
EventsBrokerClient.prototype.subscribe$ = function(mnode_id, topic) {
  var m = this.mnode.get_mnode_in_this_process(mnode_id);
  var self = this;
  return new Promise(function(resolve, reject) {
    if (m) {
      m.events_broker.on(topic, self.handler_for_message_of_subscribe);
      resolve();
    } else {
      reject("message/broker_client/events: Subscribe to a mnode_id not in same process: " + mnode_id);      
    }
  });  
};

EventsBrokerClient.prototype.unsubscribe$ = function(mnode_id, topic) {
  var m = this.mnode.get_mnode_in_this_process(mnode_id);
  var self = this;
  return new Promise(function(resolve, reject) {
    if (m) {
      m.events_broker.removeListener(topic, self.handler_for_message_of_subscribe);
      resolve();
    } else {
      reject("message/broker_client/events: Unsubscribe to a mnode_id not in same process: " + mnode_id);      
    }
  });  
};

// invoke this.mnode.on_message_for_subscribe_all when msg is received
EventsBrokerClient.prototype.subscribe_all$ = function(topic) {
  _all_emitter_.on(topic, this.handler_for_message_of_subscribe_all);
  return Promise.resolve();
};


EventsBrokerClient.prototype.unsubscribe_all$ = function(topic) {
  _all_emitter_.removeListener(topic, this.handler_for_message_of_subscribe_all);
  return Promise.resolve();
};



EventsBrokerClient.prototype.publish$ = function(topic, data) {
  var self = this;
  return new Promise(function(resolve) {
    B.later(function() {
      self.mnode.events_broker.emit(topic, data);
      _all_emitter_.emit(topic, data);
      resolve();
    });
  });
};


module.exports = EventsBrokerClient;