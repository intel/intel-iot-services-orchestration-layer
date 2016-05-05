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

var log = B.log.for_category("workflow/edge");



function Edge(workflow, json) {
  json = json || {};
  this.workflow = workflow;
  this.json = json;

  this.id = json.id;
  this.field = json.field;
  this.no_store = json.no_store;

  try {
    this.source = workflow.nodes[json.source.node].out.ports[json.source.port];
    this.target = workflow.nodes[json.target.node].in.ports[json.target.port];

    this.source.edges[this.id] = this;
    this.target.edges[this.id] = this;
  } catch(e) {
    B.check(false, "workflow/edge", "Failed to get ports of edge", json,
      "with error", e);
  }
}

Edge.prototype.emit = function(event, data) {
  this.workflow.event.emit("edge", {
    type: "edge",
    time: Date.now(),
    edge_id: this.id,
    event: event,
    data: data
  });
};


// payload and meta would be cloned before dispatch
Edge.prototype.dispatch = function(payload, meta) {
  payload = _.cloneDeep(payload);
  var cloned_meta = _.cloneDeep(meta);
  if (this.field) {
    if (_.isObject(payload)) {
      payload = payload[this.field];
    } else {
      payload = undefined;
    }
  }

  var msg = this.workflow.create_message(payload, cloned_meta);

  this.emit("dispatch", msg);

  this.target.on_receive(msg, this.no_store);
};


module.exports = Edge;
