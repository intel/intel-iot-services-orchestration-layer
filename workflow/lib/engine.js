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
var _ = require("lodash");

var log = B.log.for_category("workflow/engine");


var Workflow = require("./workflow");

var NodeImplService = require("./node_impl_service");

var EventEmitter = require("events").EventEmitter;


/**
 * @param {Object} config it should contains em and mnode
 */
function Engine(config) {
  this.config = config || {};

  this.workflows = {};
  // a quick lookup table for nodes
  // updated in workflow install / uninstall
  this.nodes = {};


  this.event = new EventEmitter();

}

Engine.create$ = function(config) {
  // TODO: so far we hard code this, while in the future,
  // it should be created via assemble$
  B.check(config.em && config.mnode, "workflow/engine", 
    "Need em (entity_manager) and mnode to initialize the workflow engine");
  var engine = new Engine(config);
  return NodeImplService.create$(engine, config.em, config.mnode).then(function(impl) {
    engine.default_node_impl = impl;
  }).then(function() {
    return engine;
  });
};


Engine.prototype.ensure_get_workflow = function(graph_id) {
  return B.check(this.workflows[graph_id], "Graph not found:", graph_id);
};

Engine.prototype.load = function(graph_json, specs) {
  B.check_warn(!this.workflows[graph_json.id], "workflow/engine", 
    "Workflow would be reloaded for", graph_json.id);
  log("load graph", graph_json.id);
  var w = new Workflow(this, graph_json, specs);
  w.load();
  this.workflows[w.id] = w;
  return w;
};

Engine.prototype.start$ = function(graph_json, specs, tracing) {
  // the engine would ensure there is no existing workflow is running first
  var f = this.workflows[graph_json.id];
  if (f) {
    B.check(!f.is_started(), "workflow/engine", 
      "Workfload already started. Please stop it first", graph_json.id);
  }
  // then it would reload (since graph might updated and start)
  f = this.load(graph_json, specs);

  var self = this;
  f.event.on("debug", function(data) {
    self.event.emit("debug", data);
  });

  return f.start$(tracing);
};


Engine.prototype.stop$ = function(graph_id) {
  return this.ensure_get_workflow(graph_id).stop$();
};

Engine.prototype.pause$ = function(graph_id) {
  return this.ensure_get_workflow(graph_id).disable$();
};


Engine.prototype.resume$ = function(graph_id) {
  return this.ensure_get_workflow(graph_id).enable$();
};

Engine.prototype.get_status = function(graph_id) {
  var f = this.workflows[graph_id];
  if (!f) {
    return "unloaded";
  }
  return f.status;
};

Engine.prototype.get_trace = function(graph_id) {
  return this.ensure_get_workflow(graph_id).trace;
};

Engine.prototype.get_debug_trace = function(graph_id) {
  return this.ensure_get_workflow(graph_id).debug_trace;
};

Engine.prototype.set_debug_for_node = function(graph_id, node_id, is_debug) {
  return this.ensure_get_workflow(graph_id).set_debug_for_node(node_id, is_debug);
};


Engine.prototype.has_started_workflows = function() {
  var self = this;
  var res = false;
  _.forEach(self.workflows, function(v) {
    if (v.is_started()) {
      res = true;
      return false;
    }
  });
  return res;
};
module.exports = Engine;