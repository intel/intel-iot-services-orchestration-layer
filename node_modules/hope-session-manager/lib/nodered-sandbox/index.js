/******************************************************************************
Copyright (c) 2016, Intel Corporation

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
var util = require("util");
var redUtil = require("./nodered-deps/util.js");
var EventEmitter = require("events").EventEmitter;
var express = require("express");
var http = require("http");

exports.prepare_nodered_sandbox = function(sandbox) {

  if(_.isObject(sandbox.__nodered.RED)) {
    //sandbox.__nodered have RED already
    return;
  }
  var RED = {};
  RED.nodes = {};

  if(_.isUndefined(sandbox.hub_shared.__nodered_server))
  {
    var app, server;
    if (global.$hope__dev_webapp) {
      app = global.$hope__dev_webapp;
      server = app.$$server;
    }
    else {
      app = express();
      server = http.createServer(app);
      server.setMaxListeners(0);
      server.listen(8080);
    }
    sandbox.hub_shared.__nodered_server = server;
    sandbox.hub_shared.__nodered_httpNode = app;
  }
  RED.server = sandbox.hub_shared.__nodered_server;
  RED.httpNode = sandbox.hub_shared.__nodered_httpNode;


  RED.nodes.createNode = function(node, config) {
    Node.call(node, config);
  };

  RED.nodes.registerType = function(name, func) {
    util.inherits(func, Node);
    sandbox.__nodered["Type_" + name] = func;
  };

  RED.nodes.getNode = function(id) {
    if(sandbox.hub_shared.__nodered_nodes[id] && sandbox.hub_shared.__nodered_nodes[id].z === "global_z") {
      return sandbox.hub_shared.__nodered_nodes[id];
    }
    var id_l = sandbox.__nodered.id.split("@");
    id_l[0] = id;
    var newid = id_l.join("@");
    return sandbox.hub_shared.__nodered_nodes[newid];
  };
  //RED.library
  RED.library = {};
  RED.library.register = function() {};
  //RED.settings
  RED.settings = {};
  //RED.httpAdmin
  RED.httpAdmin = RED.httpNode;
  //RED.auth
  RED.auth = {
    needsPermission:function() { return function(req, res, next) { next(); }}
  };
  //RED.util
  RED.util = redUtil;

  RED.comms = {
    publish: function() {}
  };

  RED.log = {
    addHandler: function() {},
    error: console.error.bind(console),
    info: console.log.bind(console)
  };

  RED._ = function() {
    return util.format.apply(util, arguments);
  };
  sandbox.__nodered.RED = RED;

  //Node Class
  function Node(n) {
    this.id = n._nr.id || n.id;
    this.type = n._nr.type || n.type;
    this.z = n._nr.z || n.z || "global_z";
    sandbox.hub_shared.__nodered_flow_context = sandbox.hub_shared.__nodered_flow_context || {}; // shared by hub, store the flow context for nodered: hub_shared.__nodered_flow_context[node.z]
    sandbox.hub_shared.__nodered_flow_context[this.z] = sandbox.hub_shared.__nodered_flow_context[this.z] || {};
    this._closeCallbacks = [];
    if (n.name) {
        this.name = n.name;
    }
    if (n._alias) {
        this._alias = n._alias;
    }
    sandbox.hub_shared.__nodered_nodes = sandbox.hub_shared.__nodered_nodes || {};
    sandbox.hub_shared.__nodered_catchNodeMap = sandbox.hub_shared.__nodered_catchNodeMap || {};
    sandbox.hub_shared.__nodered_statusNodeMap = sandbox.hub_shared.__nodered_statusNodeMap || {};
    if (this.type === "catch") {

      sandbox.hub_shared.__nodered_catchNodeMap[this.z] = sandbox.hub_shared.__nodered_catchNodeMap[this.z] || [];
      sandbox.hub_shared.__nodered_catchNodeMap[this.z].push(this);
    } else if (this.type === "status") {

      sandbox.hub_shared.__nodered_statusNodeMap[this.z] = sandbox.hub_shared.__nodered_statusNodeMap[this.z] || [];
      sandbox.hub_shared.__nodered_statusNodeMap[this.z].push(this);
    }

  }

  util.inherits(Node, EventEmitter);

  Node.prototype.context = function() {
    var node = this;
    var c = {};
    c.get = function(k) {
      return sandbox.shared[k];
    };
    c.set = function(k, v) {
      sandbox.shared[k] = v;
      return v;
    };
    c.global = {
      get : function(k) {
        return sandbox.hub_shared[k];
      },
      set : function(k, v) {
        sandbox.hub_shared[k] = v;
        return v;
      }
    };
    c.flow = {
      get : function(k) {
        return sandbox.hub_shared.__nodered_flow_context[node.z][k];
      },
      set : function(k, v) {
        sandbox.hub_shared.__nodered_flow_context[node.z][k] = v;
        return v;
      }
    };
    return c;
  };

  Node.prototype._on = Node.prototype.on;
  Node.prototype.on = function(event, callback) {
    if (event == "close") {
        this._closeCallbacks.push(callback);
    } else {
        this._on(event, callback);
    }
  };

  Node.prototype.close = function() {
    var node = this;
    var tasks = [];
    for(var i = 0; i < this._closeCallbacks.length; i++) {
      var callback = this._closeCallbacks[i];
      if(callback.length == 1) {
        tasks.push(
          new Promise(function(resolve) {
            callback.call(node, function() {
              resolve();
            });
          })
        );
      } else {
        callback.call(node);
      }
    }
    if(tasks.length > 0) {
      return Promise.all(tasks);
    } else {
      return;
    }
  };

  Node.prototype.afterclose = function() {
    if (this.type === "catch") {
      delete sandbox.hub_shared.__nodered_catchNodeMap[this.id];
    } else if (this.type === "status") {
      delete sandbox.hub_shared.__nodered_statusNodeMap[this.id];
    }
    delete sandbox.hub_shared.__nodered_nodes[this.id];
  };

  Node.prototype.send = function(msgs) {
    console.log("nodered [[", this.type, "]] [[", this.id, "]] ==>", msgs);
    var out_package = {};
    if(!_.isArray(msgs)) {
      msgs._msgid = msgs._msgid || B.unique_id("__NODERED_MSG__");
      out_package.out1 = msgs;
    } else {
      msgs.forEach(function(msg, i) {
        if (msg !== null) {
          msg._msgid = msgs._msgid || B.unique_id("__NODERED_MSG__");
          out_package["out" + (i + 1)] = msg;
        }
      });
    }
    if (!_.isEmpty(out_package)) {
      sandbox.__nodered.sendOUT(out_package);
    }
  };

  Node.prototype.receive = function(msg) {
    if (msg === undefined || msg === null) {
      msg = {};
    }
    else if (this.propertyType === "msg" && this.property && (!_.isObject(msg) || !(this.property in msg))) {
        var msg2 = {};
        msg2[this.property] = msg;
        msg = msg2;
    }
    if (!msg._msgid) {
        msg._msgid = redUtil.generateId();
    }
    this.metric("receive", msg);
    try {
        this.emit("input", msg);
    } catch(err) {
        this.error(err, msg);
    }
  };

  Node.prototype.log = console.log.bind(console);
  Node.prototype.warn = console.warn.bind(console);
  Node.prototype.error = function(logMessage, msg) {
      console.error(logMessage, msg);
      handle_nr_error(this, logMessage, msg);
      sandbox.__nodered.sendERR({
        info: logMessage,
        msg: msg
      });
    };


  //bind status
  Node.prototype.status = function(status) {
    handleStatus(this, status);
  };

  Node.prototype.metric = function() {};

  function handle_nr_error (node, logMessage, msg) {
    var count = 1;
    if (msg && msg.hasOwnProperty("error")) {
        if (msg.error.hasOwnProperty("source")) {
            if (msg.error.source.id === node.id) {
                count = msg.error.source.count + 1;
                if (count === 10) {
                    node.warn("nodes.flow.error-loop");
                    return;
                }
            }
        }
    }
    var targetCatchNodes = null;
    var throwingNode = node;
    targetCatchNodes = sandbox.hub_shared.__nodered_catchNodeMap[throwingNode.z];
    var throwingNode_origin_id = throwingNode.id.split("@")[0];
    if (targetCatchNodes) {
        targetCatchNodes.forEach(function(targetCatchNode) {
            if (targetCatchNode.scope && targetCatchNode.scope.indexOf(throwingNode_origin_id) === -1) {
                return;
            }
            var errorMessage;
            if (msg) {
                errorMessage = redUtil.cloneMessage(msg);
            } else {
                errorMessage = {};
            }
            if (errorMessage.hasOwnProperty("error")) {
                errorMessage._error = errorMessage.error;
            }
            errorMessage.error = {
                message: logMessage.toString(),
                source: {
                    id: node.id,
                    type: node.type,
                    name: node.name,
                    count: count
                }
            };
            targetCatchNode.receive(errorMessage);
        });
    }
  }
  function handleStatus (node, statusMessage) {
    var targetStatusNodes = null;
    var reportingNode = node;
    var reportingNode_origin_id = reportingNode.id.split("@")[0];
    targetStatusNodes = sandbox.hub_shared.__nodered_statusNodeMap[reportingNode.z];
    if (targetStatusNodes) {
        targetStatusNodes.forEach(function(targetStatusNode) {
            if (targetStatusNode.scope && targetStatusNode.scope.indexOf(reportingNode_origin_id) === -1) {
                return;
            }
            var message = {
                status: {
                    text: "",
                    source: {
                        id: node.id,
                        type: node.type,
                        name: node.name
                    }
                }
            };
            if (statusMessage.text) {
                message.status.text = statusMessage.text;
            }
            targetStatusNode.receive(message);
        });
    }
  }






};