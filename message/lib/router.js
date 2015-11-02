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
 * @module  message/router
 */


var _ = require("lodash");
var B = require("hope-base");
var rules = require("./route_rule");

var log = B.log.for_category("message/router");


var Router = 
/**
 * Create a router to decide which port and address to use to send / subscribe
 * message for a MNode
 * @param  {Object} route_table 
 * @param  {Object} config, may contain predefined rules {
 *   rules: {
 *     send: [...],
 *     subscribe: [...],
 *     subscribe_all: [...]
 *   }
 * }      
 */
module.exports = function(route_table, config) {
  config = config || {};
  config.rules = config.rules || {};
  B.check(_.isObject(route_table), "create", "Need a route table");
  this.route_table = route_table;
  this.mnodes = {};
  this.rules = {
    send: config.rules.send || [],
    subscribe: config.rules.subscribe || [],
    subscribe_all: config.rules.subscribe_all || [],
    publish: config.rules.publish || []
  };
  // we would add an AutoRule by default, if nothing is specified
  var auto_rule = rules.create("auto");
  if (!config.rules.send) {
    this.rules.send.push(auto_rule);
  }
  if (!config.rules.subscribe) {
    this.rules.subscribe.push(auto_rule);
  }
  if (!config.rules.subscribe_all) {
    this.rules.subscribe_all.push(auto_rule);
  }
  if (!config.rules.publish) {
    this.rules.publish.push(auto_rule);
  }
};


Router.create = function(route_table, config) {
  return new Router(route_table, config);
};

Router.prototype.clean_rules = function(op) {
  this.rules[op] = [];
};

Router.prototype.validate_op = function(op, func_name) {
  B.check(_.includes(["send", "subscribe", "subscribe_all", "publish"], op), 
    "message/router/" + func_name, "Unsupported operation", op);
};

Router.prototype.add_rule = function(op, rule, is_at_the_beginning) {
  this.validate_op(op, "add_rule");
  if (is_at_the_beginning) {
    this.rules[op].unshift(rule);
  } else {
    this.rules[op].push(rule);
  }
};

Router.prototype.run_rules = function(op, from_mnode, to_mnode_id, to_info) {
  this.validate_op(op, "run_rules");
  var i, r;
  for (i = 0; i < this.rules[op].length; i++) {
    r = this.rules[op][i].find_port_and_info_to_talk(op, from_mnode, to_mnode_id, to_info);
    if (r) {
      return r;
    }
  }
};


/**
 * Returns the calcuated SendPort and AcceptPort to use
 * @param  {Object} from which MNode to send
 * @param  {String} to_mnode_id   
 * @return {Object} in format of {port: from_which_port, info: info_to_invoke_send}
 */
Router.prototype.get_info_for_send$ = function(from_mnode, to_mnode_id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var r;
    self.route_table.get$(to_mnode_id).then(function(to_info) {
      r = self.run_rules("send", from_mnode, to_mnode_id, to_info);
      if (r) {
        resolve(r);
      } else {
        reject(new Error("No route information found for sending from " +
          from_mnode.name + " to " + to_mnode_id));
      }
    }).catch(function(err) {
      reject(err);
    });

  });
};

/**
 * Returns the calculated SubscribePort and PublishPort to use
 * @param  {Object} from which MNode to sub
 * @param  {String} to_mnode_id   
 * @return {Object} in format of {port: from_which_port, info: info_to_invoke_sub}
 */
Router.prototype.get_info_for_subscribe$ = function(from_mnode, to_mnode_id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var r;
    self.route_table.get$(to_mnode_id).then(function(to_info) {
      r = self.run_rules("subscribe", from_mnode, to_mnode_id, to_info);
      if (r) {
        resolve(r);
      } else {
        reject(new Error("No route information found for subscribing from " +
          from_mnode.name + " to " + to_mnode_id));
      }
    });
  });
};


/**
 * Returns the calculated SubscribePort and PublishPort to use
 * NOTE: it returns an array because maybe mulitple ports need to subscribe
 * @param  {Object} from which MNode to sub
 * @return {Array} An array of {port: from_which_port, info: info_to_invoke_sub}
 */
Router.prototype.get_info_for_subscribe_all$ = function(from_mnode) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var r = self.run_rules("subscribe_all", from_mnode);
    if (r) {
      if (!_.isArray(r)) {
        r = [r];
      }
      resolve(r);
    } else {
      reject(new Error("No route information found for subcribe_all from " +
        from_mnode.name));
    }

  });
};


/**
 * @param  {Object} from which MNode to pub
 * NOTE: it returns an array because maybe mulitple ports need to publish
 * @return {Array} An array of {port: from_which_port, info: info_to_invoke_pub}
 */
Router.prototype.get_info_for_publish$ = function(from_mnode) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var r = self.run_rules("publish", from_mnode);
    if (r) {
      if (!_.isArray(r)) {
        r = [r];
      }
      resolve(r);
    } else {
      reject(new Error("No route information found for publish from " +
        from_mnode.name));
    }

  });
};


/**
 * Check whether the message arrived at the mnode comes from the correct publish port address
 * This helps ensure that for a given (from, to) mnode pairs
 * @param  {Object} the subscribe port
 * @param  {Object} from_addr        address of the PublishPort
 * @return {Promise}                 Resolve if passes, otherwise reject
 */
Router.prototype.check_address_for_published_message$ = function(port, from_addr) {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.get_info_for_subscribe$(port.mnode, from_addr.mnode_id).then(function(info) {
      if (info.port === port) {
        resolve();
      } else {
        reject("Unmatched port:", info.port, port);
      }
    }).catch(function(err) {
      reject(err);
    });
  });
};