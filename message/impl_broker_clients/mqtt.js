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
var mqtt = require("mqtt");
var _ = require("lodash");

var log = B.log.for_category("message/mqtt_broker_client");

var _magic = "__HOPE_MAGIC_STR_^_^__";
// config should be in format of {
//   url: ....     // the url of mqtt server
//   only_support_mqtt_3_1: ...     // set to true if it doesn't support 3.1.1 or higher
//   config: ...   // other options, see help of mqtt npm package 
// }
function MQTTBrokerClient(mnode, config) {
  AbstractBrokerClient.call(this, mnode, config);
  B.check(_.isString(config.url), "message/mqtt_broker_client", "Need url be defined");

  this.mqtt_config = this.config.config || {};
  if (this.config.only_support_mqtt_3_1) {
    _.assign(this.mqtt_config, {
      protocolId: "MQIsdp",
      protocolVersion: 3
    });
  }

  this.mqtt_client = null;
  this.status = "disconnected";

  // stores all promises that wait for ack / return
  // in format of {
  //    session_id: {
  //      resolve: the function
  //      reject: the function
  //      
  //    }
  // }
  this.sessions = {};
}

B.type.inherit(MQTTBrokerClient, AbstractBrokerClient);




MQTTBrokerClient.create$ = function(mnode, config) {
  var bc = new MQTTBrokerClient(mnode, config);
  return bc.connect$();
};

MQTTBrokerClient.prototype.dispose$ = function() {
  return this.disconnect$();
};

MQTTBrokerClient.prototype.connect$ = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.status !== "disconnected") {
      reject("MQTT broker client should be disconnected before it connects");
      return;
    }
    self.status = "connecting";
    var timer = setTimeout(function() {
      log.error("connect", "Timeout to connect to", self.mnode.id, self.config.url, self.mqtt_config);
      reject("Timeout to connect to MQTT with url " + self.config.url);
    }, 10000);
    self.client = mqtt.connect(self.config.url, self.mqtt_config);
    self.client.on("connect", function() {  // this might be triggered upon REconnection
      if (self.status !== "connected") {
        log("connect", "connected", self.mnode.id, self.config.url, self.mqtt_config);
        self.status = "connected";
        clearTimeout(timer);
        self.client.on("error", function(err) {
          log.error("error event", err, "for", self.config.url, self.mqtt_config);
        });
        self.client.on("message", function(t, m) {
          self.handle_message(m);
        });
        resolve(self);
      }
    });
  });
};

MQTTBrokerClient.prototype.disconnect$ = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.status !== "connected") {
      reject("MQTT broker client should be connected before it disconnects while it is " + self.status);
      return;
    }
    self.status = "disconnected";
    self.client.end();
    self.client = null;
    resolve();
  });
};

MQTTBrokerClient.prototype.handle_message = function(m) {
  m = JSON.parse(m);
  switch (m.type) {
    case "message_for_accept": 
      if (this.mnode.id === m.mnode_id) {
        this.on_message_for_accept(m.message);
      }
      break;
    case "message_for_subscribe":
      this.on_message_for_subscribe(m.message);
      break;
    case "message_for_subscribe_all":
      this.on_message_for_subscribe_all(m.message);
      break;
  }
};

// invoke this.mnode.on_message_for_accept when msg is received
MQTTBrokerClient.prototype.accept$ = function(topic) {
  this.client.subscribe("ACCEPT" + _magic + this.mnode.id + _magic + topic);
  return Promise.resolve();
};

MQTTBrokerClient.prototype.unaccept$ = function(topic) {
  this.client.unsubscribe("ACCEPT" + _magic + this.mnode.id + _magic + topic);
  return Promise.resolve();
};



MQTTBrokerClient.prototype.send$ = function(mnode_id, topic, msg) {
  this.client.publish("ACCEPT" + _magic + mnode_id + _magic + topic, JSON.stringify({
    type: "message_for_accept",
    mnode_id: mnode_id,
    topic: topic,
    message: msg
  }));
  return Promise.resolve();
};


MQTTBrokerClient.prototype.subscribe$ = function(mnode_id, topic) {
  this.client.subscribe("SUBSCRIBE" + _magic + mnode_id + _magic + topic);
  return Promise.resolve();
};

MQTTBrokerClient.prototype.unsubscribe$ = function(mnode_id, topic) {
  this.client.subscribe("SUBSCRIBE" + _magic + mnode_id + _magic + topic);
  return Promise.resolve();
};


MQTTBrokerClient.prototype.subscribe_all$ = function(topic) {
  return this.subscribe$("__HOPE_SUBSCRIBE_ALL__", topic);
};

MQTTBrokerClient.prototype.unsubscribe_all$ = function(topic) {
  return this.unsubscribe$("__HOPE_SUBSCRIBE_ALL__", topic);
};



MQTTBrokerClient.prototype.publish$ = function(topic, data) {
  this.client.publish("SUBSCRIBE" + _magic + this.mnode.id + _magic + topic, 
    JSON.stringify({
      type: "message_for_subscribe",
      mnode_id: this.mnode.id,
      topic: topic,
      message: data
    }));
  this.client.publish("SUBSCRIBE" + _magic + "__HOPE_SUBSCRIBE_ALL__" + _magic + topic, 
    JSON.stringify({
      type: "message_for_subscribe_all",
      mnode_id: this.mnode.id,
      topic: topic,
      message: data
    }));

  return Promise.resolve();
};


module.exports = MQTTBrokerClient;
