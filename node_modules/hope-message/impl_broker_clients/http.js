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
var _HTTPBrokerClient = require("hope-http-broker").HTTPBrokerClient;

var _ = require("lodash");


// We will use the id of mnode as the client_id for the http broker
// config should be in format of {
//   broker_url: ....     // how to connect to broker
//   my_port: ...         // at which port I'm listening to remote broker
// }
function HTTPBrokerClient(mnode, config) {
  AbstractBrokerClient.call(this, mnode, config);
  B.check(_.isString(config.broker_url), "message/http_broker_client", "Need broker_url be defined");
  B.check(_.isNumber(config.my_port), "message/http_broker_client", "Need my_port be defined as a number");

  this._client = new _HTTPBrokerClient({
    id: mnode.id,
    broker_url: config.broker_url,
    my_port: config.my_port
  });

  this._client.on("message_for_accept", this.on_message_for_accept.bind(this));
  this._client.on("message_for_subscribe", this.on_message_for_subscribe.bind(this));
  this._client.on("message_for_subscribe_all", this.on_message_for_subscribe_all.bind(this));
}

B.type.inherit(HTTPBrokerClient, AbstractBrokerClient);


HTTPBrokerClient.create$ = function(mnode, config) {
  var bc = new HTTPBrokerClient(mnode, config);
  return bc._client.connect$();
};

HTTPBrokerClient.prototype.dispose$ = function() {
  return this._client.dispose$();
};


// invoke this.mnode.on_message_for_accept when msg is received
HTTPBrokerClient.prototype.accept$ = function(topic) {
  return this._client.accept$(topic);
};

HTTPBrokerClient.prototype.unaccept$ = function(topic) {
  return this._client.unaccept$(topic);
};



HTTPBrokerClient.prototype.send$ = function(mnode_id, topic, msg) {
  return this._client.send$(mnode_id, topic, msg);
};


HTTPBrokerClient.prototype.subscribe$ = function(mnode_id, topic) {
  return this._client.subscribe$(mnode_id, topic);
};

HTTPBrokerClient.prototype.unsubscribe$ = function(mnode_id, topic) {
  return this._client.unsubscribe$(mnode_id, topic);
};


HTTPBrokerClient.prototype.subscribe_all$ = function(topic) {
  return this._client.subscribe_all$(topic);
};

HTTPBrokerClient.prototype.unsubscribe_all$ = function(topic) {
  return this._client.unsubscribe_all$(topic);
};



HTTPBrokerClient.prototype.publish$ = function(topic, data) {
  return this._client.publish$(topic, data);
};


module.exports = HTTPBrokerClient;