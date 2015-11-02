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
 * This defines the rules to define the route. Multiple rules could be 
 * added to a router, and router would execute them one by one until a 
 * talkable info is returned which is used for send/subscribe etc. to conduct
 * the real operations
 *
 * 
 * @module message/route_rule
 */

var B = require("hope-base");
var _ = require("lodash");


var Rule = 
exports.Rule = function(config) {
  this.config = config;
};

Rule.create = B.type.get_func_not_impl();

Rule.prototype.find_port_and_info_to_talk = B.type.get_func_not_impl("operation", 
  "from_mnode",  "to_mnode_id", "to_info_from_route_table");

Rule.prototype.validate_op = function(op) {
  B.check(_.includes(["send", "subscribe", "subscribe_all", "publish"], op), 
    "message/route_rule/find_port_and_info_to_talk", "Unsupported operation", op);
};



var rule_types = {};

function get_rule_type(type) {
  return rule_types[type];
}

exports.create = function(type) {
  var t = B.check(get_rule_type(type), "message/route_rule/create", 
    "Route rule type not registerred", type);
  var args = _.toArray(arguments);
  args.shift();
  return t.create.apply(t, args);
};

var register_rule_type =
exports.register_rule_type = function(type, impl) {
  B.check_warn(!get_rule_type(type), "message/route_rule/register_type", 
    "Already registerred for", type);
  B.type.should_impl(impl, Rule);
  rule_types[type] = impl;
  B.log("register_rule_type", "[type]", type);
};

//////////////////////////////////////////////////////////////////
// Types
//////////////////////////////////////////////////////////////////


//----------------------------------------------------------------
// Auto
//----------------------------------------------------------------

// Automatically select a from_port and then get the talkable info
function AutoRule(config) {
  Rule.apply(this, arguments);
}
B.type.inherit(AutoRule, Rule);

AutoRule.create = function(config) {
  return new AutoRule(config);
};


AutoRule.prototype.find_port_and_info_to_talk = function(op, from_mnode, to_mnode_id, to_info) {
  this.validate_op(op);
  if (op === "subscribe_all") {
    // subscribe at all ports
    return from_mnode.ports.subscribe.array.map(function(p) {
      return {
        port: p,
        info: {
          to_mnode_id: to_mnode_id,
          to_info: to_info
        }
      };
    });
  } else if (op === "publish") {
    return from_mnode.ports.publish.array.map(function(p) {
      return {
        port: p,
        info: {
          to_mnode_id: to_mnode_id,
          to_info: to_info
        }
      };
    });    
  }
  var from_ports = from_mnode.ports[op];
  var i, p, t;
  for (i = 0; i < from_ports.array.length; i++) {
    p = from_ports.array[i];
    t = p.get_info_to_talk(to_mnode_id, to_info);
    if (t && !t.not_sure_can_talk) {
      return {
        port: p,
        info: t
      };
    }
  }  
};


register_rule_type("auto", AutoRule);


//----------------------------------------------------------------
// Select
//----------------------------------------------------------------
// select the first port matched the config {
//   name: exactly mathes this name if provided
//   impl: exactly matches this impl
// } and also has the info returned
function SelectRule(config) {
  Rule.apply(this, arguments);
}
B.type.inherit(SelectRule, Rule);

SelectRule.create = function(config) {
  return new SelectRule(config);
};

SelectRule.prototype.find_port_and_info_to_talk = function(op, from_mnode, to_mnode_id, to_info) {
  this.validate_op(op);
  var info;
  if (op === "subscribe_all" || op === "publish") {
    info = {
      to_mnode_id: to_mnode_id,
      to_info: to_info
    };
  }
  if (op === "subscribe_all") {
    op = "subscribe";
  }
  var from_ports = from_mnode.ports[op];
  var i, p, addr;
  for (i = 0; i < from_ports.array.length; i++) {
    p = from_ports.array[i];
    addr = p.get_addr();
    if ((this.config.name && addr.name !== this.config.name) ||
      (this.config.impl && addr.impl !== this.config.impl)) {
      continue;
    }

    return {
      port: p,
      info: info || p.get_info_to_talk(to_mnode_id, to_info)
    };
  }
};


register_rule_type("select", SelectRule);