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
 * @module message/port
 */

var B = require("hope-base");

//----------------------------------------------------------------
// Accept
//----------------------------------------------------------------

var AcceptPort =
exports.AcceptPort = function(mnode, name, config) {
  this.type = "accept";
  this.mnode = mnode;
  this.name = name;
  this.config = config || {};
};

AcceptPort.create = B.type.get_func_not_impl("mnode", "name", "config");

AcceptPort.prototype.get_addr = B.type.get_func_not_impl();
AcceptPort.prototype.on_message = function(msg) {
  this.mnode.on_message_for_accept(msg, this);
};



//----------------------------------------------------------------
// Send
//----------------------------------------------------------------

var SendPort =
exports.SendPort = function(mnode, name, config) {
  this.type = "send";
  this.mnode = mnode;
  this.name = name;
  this.config = config || {};
};

SendPort.create = B.type.get_func_not_impl("mnode", "name", "config");

// Returns an object {
//  not_sure_can_talk: ...
// }
// The returned value would be used by send$.
// 
// It's also used by the router to decide whether the we could access to_mnode_id
// We don't create a able_to_talk() because a lot of times, able_to_talk() and
// get_info_to_talk shares similar algorithm. So by default, if get_info_to_talk
// returns something, we think it is able_to_talk.
// However, sometimes, (e.g. using broker), the port knows how to form the 
// information to send$, but don't know whether it is sure that the send
// would would success. For example, it may send from MQTT pub, but don't know
// the to_mnode subscribe it. 
// In this case, we set not_sure_can_talk to true to let Router work 
// convservatively by preferring to use other type of port first
SendPort.prototype.get_info_to_talk = B.type.get_func_not_impl(
  "to_mnode_id", "to_info_from_router_table");
SendPort.prototype.get_addr = B.type.get_func_not_impl();
SendPort.prototype.send$ = B.type.get_func_not_impl("info", 
  "topic", "message");


//----------------------------------------------------------------
// Subscribe
//----------------------------------------------------------------

var SubscribePort =
exports.SubscribePort = function(mnode, name, config) {
  this.type = "subscribe";
  this.mnode = mnode;
  this.name = name;
  this.config = config || {};
};

SubscribePort.create = B.type.get_func_not_impl("mnode", "name", "config");

// Returns an object {
//  not_sure_can_talk: ...
// }
// See above SendPort
SubscribePort.prototype.get_info_to_talk = B.type.get_func_not_impl(
  "pub_mnode_id", "to_info_from_router_table");
SubscribePort.prototype.get_addr = B.type.get_func_not_impl();
SubscribePort.prototype.subscribe$ = B.type.get_func_not_impl("info", "topic");
SubscribePort.prototype.subscribe_all$ = B.type.get_func_not_impl("topic");
SubscribePort.prototype.unsubscribe$ = B.type.get_func_not_impl("info", "topic");
// This only removes the one added by subscribe_all$, and doesn't impact
// these added by subscribe$
SubscribePort.prototype.unsubscribe_all$ = B.type.get_func_not_impl("topic");


// when a message for subcribe arraives
SubscribePort.prototype.on_message = function(msg) {
  this.mnode.on_message_for_subscribe(msg, this);
};

// when a message for subcribe_all arraives
SubscribePort.prototype.on_message_all = function(msg) {
  this.mnode.on_message_for_subscribe_all(msg, this);
};


//----------------------------------------------------------------
// Publish
//----------------------------------------------------------------

var PublishPort =
exports.PublishPort = function(mnode, name, config) {
  this.type = "publish";
  this.mnode = mnode;
  this.name = name;
  this.config = config || {};
};

PublishPort.create = B.type.get_func_not_impl("mnode", "name", "config");

PublishPort.prototype.get_addr = B.type.get_func_not_impl();
PublishPort.prototype.publish$ = B.type.get_func_not_impl("topic", "message");


//----------------------------------------------------------------
// Register
//----------------------------------------------------------------

var type_mappings = {
  "accept": AcceptPort,
  "subscribe": SubscribePort,
  "send": SendPort,
  "publish": PublishPort
};


var port_impls = {
  accept: {},
  subscribe: {},
  send: {},
  publish: {}
};

var get_impl =
exports.get_impl = function(type, impl_name) {
  return port_impls[type][impl_name];
};

exports.register_impl = function(type, impl_name, impl) {
  B.check_warn(!get_impl(type, impl_name), "message/port/register_impl", 
    "Already registerred for", impl);
  B.type.should_impl(impl, type_mappings[type]);
  port_impls[type][impl_name] = impl;
  B.log("register_impl", "[type]", type, "[impl_name]", impl_name);
};

exports.create = function(mnode, type, impl_name, port_name, port_config) {
  var p = get_impl(type, impl_name);
  B.check(p, "message/port/create", "Cann't find port with type", type,
    "and impl_name", impl_name);
  return p.create(mnode, port_name, port_config);
};