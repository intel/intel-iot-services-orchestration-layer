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
 * @module message/BrokerClient
 */

var B = require("hope-base");

var log = B.log.for_category("message/broker_client");

function AbstractBrokerClient(mnode, config) {
  this.mnode = mnode;
  this.config = config = config || {};
  this.handler_for_message_of_subscribe = this.on_message_for_subscribe.bind(this);
  this.handler_for_message_of_subscribe_all = this.on_message_for_subscribe_all.bind(this);
}

AbstractBrokerClient.prototype.on_message_for_accept = function(msg) {
  this.mnode.on_message_for_accept(msg, this);
};

AbstractBrokerClient.prototype.on_message_for_subscribe = function(msg) {
  this.mnode.on_message_for_subscribe(msg, this);
};

AbstractBrokerClient.prototype.on_message_for_subscribe_all = function(msg) {
  this.mnode.on_message_for_subscribe_all(msg, this);
};


AbstractBrokerClient.create$ = B.type.get_func_not_impl("mnode", "config");
AbstractBrokerClient.prototype.dispose$ = B.type.get_func_not_impl();

// invoke this.mnode.on_message_for_accept when msg is received
AbstractBrokerClient.prototype.accept$ = B.type.get_func_not_impl("topic");
AbstractBrokerClient.prototype.unaccept$ = B.type.get_func_not_impl("topic");

// invoke this.mnode.on_message_for_subscribe when msg is received
AbstractBrokerClient.prototype.subscribe$ = B.type.get_func_not_impl("mnode_id", "topic");
AbstractBrokerClient.prototype.unsubscribe$ = B.type.get_func_not_impl("mnode_id", "topic");

// invoke this.mnode.on_message_for_subscribe_all when msg is received
AbstractBrokerClient.prototype.subscribe_all$ = B.type.get_func_not_impl("topic");
AbstractBrokerClient.prototype.unsubscribe_all$ = B.type.get_func_not_impl("topic");


AbstractBrokerClient.prototype.send$ = B.type.get_func_not_impl("mnode_id", "topic", "msg");
AbstractBrokerClient.prototype.publish$ = B.type.get_func_not_impl("topic", "msg");


exports.AbstractBrokerClient = AbstractBrokerClient;

//----------------------------------------------------------------
// Register
//----------------------------------------------------------------


var _impls = {
};

var get_impl =
exports.get_impl = function(type) {
  return _impls[type];
};

exports.register_impl = function(type, impl) {
  B.check_warn(!get_impl(type), "message/broker_client/register_impl", 
    "Already registerred for", type);
  B.type.should_impl(impl, AbstractBrokerClient);
  _impls[type] = impl;
  log("register_impl", "[type]", type);
};

exports.create$ = function(type, mnode, config) {
  var impl = get_impl(type);
  B.check(impl, "message/broker_client/create", "Cann't find broker_client with type", type);
  return impl.create$(mnode, config);
};

