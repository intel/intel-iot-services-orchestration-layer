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
//////////////////////////////////////////////////////////////////
// Todo: May converge with ui-dev/graph.js as a lot of basic parsing 
// are similar
//////////////////////////////////////////////////////////////////

var B = require("hope-base");
var _ = require("lodash");
var EventEmitter = require("events").EventEmitter;

var log = B.log.for_category("workflow/workflow");


var Node = require("./node");
var Edge = require("./edge");

var Trace = require("./trace");


//----------------------------------------------------------------
// Workflow
//----------------------------------------------------------------

/**
 * The workflow 
 * @param {Object} engine The workflow engine
 * @param {Object} graph_json  Graph json which contains actual graph, bindings etc.
 * @param {Object} specs  An index to query specs used
 */
function Workflow(engine, graph_json, specs) {
  B.check(_.isObject(graph_json) && graph_json.type === "graph",
    "Incorrect Graph", graph_json);
  specs = specs || {};

  this.engine = engine;
  this.graph = graph_json.graph || {};
  this.specs = specs;


  /**
   * Available status are:
   *   unloaded, loaded, installing, installed, enabling, enabled, 
   *   disabling, disabled, uninstalling
   * @type {String}
   */
  this.status = "unloaded";
  this.id = graph_json.id;

  /* for on-fly debug */
  this.json = graph_json;

  /**
   * Event are in format of {
   *   type: "...", e.g. "node" etc.
   *   data: {...}
   * }
   * @type {EventEmitter}
   */
  this.event = new EventEmitter();
  this.seq_event = 0;


  this.trace = new Trace.ExecutionTrace(this);
  this.debug_trace = new Trace.DebugTrace(this);
  this.debug_trace.start();
  

  this.bindings = graph_json.bindings || {};
  this.tags = {};
  this.nodes = {};
  this.edges = {};
  this.heads = [];
}

Workflow.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/WORKFLOW/" + this.id + "/" + (key || ""));
};

// This creates messages that are internally dispatched inside workflow
// i.e. from outport to inport, and then inport queue them and node
// consume them to form IN object
// It is different vs. the "messages" exchanged between mnodes, e.g.
// send by the node implementation to the actual service session on 
// a hub to invoke a particular service
Workflow.prototype.create_message = function(payload, meta) {
  return {
    id: B.unique_id("HOPE_MESSAGE_"),
    workflow: this.id,
    created_at: new Date(),
    meta: meta || {},
    payload: _.isUndefined(payload) ? null : payload
  };
};


/**
 * Load the json file into memory
 */
Workflow.prototype.load = function() {
  B.check(this.status === "unloaded", 
    "Loading a workflow that already loaded and has status", this.status);  

  var self = this;

  _.forEach(this.graph.tags, function(t) {
    self.tags[t.id] = t;
  });

  _.forEach(this.graph.nodes, function(n) {
    self.nodes[n.id] = new Node(self, n);
  });

  _.forEach(this.graph.edges, function(e) {
    self.edges[e.id] = new Edge(self, e);
  });

  _.forOwn(this.nodes, function(n) {
    if (n.is_head()) {
      self.heads.push(n);
    }
  });

  _.forOwn(this.bindings, function(b, id) {
    var n = self.nodes[id];
    B.check(n, "workflow/workflow", "Node to bind doesn't exist", id, b);
    n.bindings = b;
  });


  this.status = "loaded";
};


Workflow.prototype._raw_install$ = function() {
  var tasks = [];
  var self = this;
  _.forEach(this.nodes, function(n) {
    if (self.engine.nodes[n.id]) {
      log.warn("install", "node already indexed in engine:", n);
    }
    self.engine.nodes[n.id] = n;
    tasks.push(n.install$());
  });
  return Promise.all(tasks);
};


/**
 * Invoked before start, i.e. start = install + enable
 */
Workflow.prototype.install$ = function() {
  if (!this.is_in_status("loaded")) {
    return Promise.reject("Workflow to install is in incorrect status " + this.status);
  }
  var self = this;
  this.status = "installing";
  return this.make_lock().lock_as_promise$(function() {
    return self._raw_install$().then(function() {
      self.status = "installed";
    }).catch(function(e) {
      return self._raw_uninstall$().then(function() {
        self.status = "loaded";
        // need to throw to indicate that we failed to install
        throw e;
      }).catch(function(e) {
        // TODO actually uninstall is failed ...
        // So this isn't correct status of loaded
        // if we don't set to loaded, it would be installing
        self.status = "loaded"; 
        throw e;
      });
    });
  });
};


Workflow.prototype._raw_uninstall$ = function() {
  var tasks = [];
  var self = this;
  _.forEach(this.nodes, function(n) {
    delete self.engine.nodes[n.id];
    tasks.push(n.uninstall$());
  });
  return Promise.all(tasks);
};

Workflow.prototype.uninstall$ = function() {
  if (!this.is_in_status(["installed", "disabled"])) {
    return Promise.reject("Workflow to uninstall is in incorrect status " + this.status);
  }
  var self = this;
  var status = this.status;
  this.status = "uninstalling";
  return this.make_lock().lock_as_promise$(function() {
    return self._raw_uninstall$().then(function() {
      self.status = "loaded";
    }).catch(function(e) {
      self.status = status;
      throw e;
    });
  });
};

/**
 * Enable is done in two stages. First, it enables each node so they
 * are ready to accept inputs. Then, it kickoff each node so they start 
 * It tries to rollback (by disabling) if it encounters any error
 * to send out messages
 * @return {Promise} 
 */
Workflow.prototype.enable$ = function() {
  if (!this.is_in_status(["installed", "disabled"])) {
    return Promise.reject("Workflow to enable is in incorrect status " + this.status);
  }
  var self = this;
  var status = this.status;
  this.status = "enabling";
  return this.make_lock().lock_as_promise$(function() {
    var enable_tasks = [], kickoff_tasks = [];
    _.forEach(self.nodes, function(n) {
      enable_tasks.push(n.enable$());
    });
    return Promise.all(enable_tasks).then(function() {
      self.status = "enabled";
      _.forEach(self.nodes, function(n) {
        kickoff_tasks.push(n.kickoff$());
      });
      return Promise.all(kickoff_tasks);
    }).catch(function(e) {
      return self._raw_disable$().then(function() {
        self.status = status;
        throw e;
      }).catch(function(e) {
        // maybe should still set it as "enabling" as we failed to disable
        self.status = status;
        throw e;
      });
    });
  });
};

Workflow.prototype._raw_disable$ = function() {
  var tasks = [];
  _.forEach(this.nodes, function(n) {
    tasks.push(n.disable$());
  });
  return Promise.all(tasks);
};

Workflow.prototype.disable$ = function() {
  if (!this.is_in_status("enabled")) {
    return Promise.reject("Workflow to disable is in incorrect status " + this.status);
  }
  var self = this;
  this.status = "disabling";
  return this.make_lock().lock_as_promise$(function() {
    return self._raw_disable$().then(function() {
      self.status = "disabled";
    }).catch(function(e) {
      // disable it anyway even failed to prevent node to send msgs
      // TODO this prevents retrying disable operation, may need to
      // turn this in the future
      self.status = "disabled";
      throw e;
    });
  });
};


/**
 * Trigger actually invokes the kernel_if_prepare_succeed4(), which tries 
 * to form an IN and then kernel
 * @return {Promise} 
 */
Workflow.prototype.trigger_head_nodes$ = function() {
  if (!this.is_in_status("enabled")) {
    return Promise.reject("Workflow to trigger head is in status " + this.status +
      " rather than enabled");
  }
  var self = this;
  return this.make_lock().lock_as_promise$(function() {
    var tasks = [];
    _.forEach(self.heads, function(n) {
      tasks.push(n.kernel_if_prepare_succeed$());
    });
    return Promise.all(tasks);
  });
};

Workflow.prototype.enable_tracing = function() {
  this.trace.start(true);
};

Workflow.prototype.disable_tracing = function() {
  this.trace.stop();
};

Workflow.prototype.emit_debug = function(node, data) {
  if (!node.is_debug) {
    return;
  }
  this.event.emit("debug", {
    seq: this.seq_event++,
    time: Date.now(),
    workflow_id: this.id,
    node_id: node.id,
    data: data
  });
};

// TODO: WE enforce the update of the json as well. THis isn't an elegant way 
// but works well so far
Workflow.prototype.set_debug_for_node = function(node_id, is_debug) {
  var n = this.nodes[node_id];
  B.check(n, "workflow/workflow", "Node to set_debug doesn't exist", node_id, is_debug);
  n.is_debug = is_debug;
  _.forEach(this.json.graph.nodes, function(n) {
    if (n.id === node_id) {
      n.is_debug = is_debug;
      return false;
    }
  });
};


/**
 * Start do three things: install, enable, and then trigger the heads (
 * nodes that has no edges to its inports)
 * @return {Promise} 
 */
Workflow.prototype.start$ = function(is_tracing) {
  if (this.status !== "loaded") {
    return Promise.reject("Workflow to start is in status " + this.status +
      " rather than loaded");
  }
  var self = this;
  return this.install$().then(function() {
    return self.enable$();
  }).then(function() {
    if (is_tracing) {
      self.enable_tracing();
    }
    self.debug_trace.clean();
    // disable if we failed to trigger head
    return self.trigger_head_nodes$().catch(function(e) {
      return self._raw_disable$().then(function() {
        self.status = "loaded";
        throw e;
      });
    });
  }).catch(function(e) {
    if (is_tracing) {
      self.disable_tracing();
      self.status = "loaded";
      throw e;
    } 
  });
};

Workflow.prototype.is_in_status = function(allowed_status) {
  if (!_.isArray(allowed_status)) {
    allowed_status = [allowed_status];
  }
  return _.includes(allowed_status, this.status);
};

Workflow.prototype.is_running = function() {
  return this.is_in_status("enabled");
};


Workflow.prototype.is_started = function() {
  return this.is_in_status(["installing", "installed", "enabling", "enabled",
    "disabling", "disabled", "uninstalling"]);
};

/**
 * Stop disables it and then uninstall
 * @return {Promise} 
 */
Workflow.prototype.stop$ = function() {
  if (!this.is_in_status("enabled")) {
    return Promise.reject("Workflow to stop is in status " + this.status +
      " rather than enabled");
  }
  this.disable_tracing();
  var self = this;
  return this.disable$().then(function() {
    return self.uninstall$();
  }).catch(function(e) {
    return self.uninstall$().then(function() {
      // ensure e is always thrown
      throw e;
    });
  });
};



module.exports = Workflow;