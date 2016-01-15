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

function Trace(workflow, config) {
  this.workflow = workflow;
  this.id = B.unique_id("HOPE/TRACE_");
  this.trace = [];

  this.config = config || {};
  // by default, only capture 100 records
  if (!this.config.max_records || this.config.max_records < 0) {
    this.config.max_records = 100;
  }

  this.workflow.event.on("node", this.on_node_event.bind(this));
  this.workflow.event.on("edge", this.on_edge_event.bind(this));
}

Trace.prototype.start = function() {
  this.is_started = true;
};

Trace.prototype.stop = function() {
  this.is_started = false;
};

Trace.prototype.clean = function() {
  this.trace = [];
};

Trace.prototype.sweep = function() {
  while (this.trace.length > this.config.max_records) {
    this.trace.shift();
  }
};

Trace.prototype.on_node_event = function(data) {
  if (!this.is_started) {
    return;
  }
  if (data.event === "kernel") {
    this.trace.push({
      time: data.time,
      nodes: [{
        id: data.node_id,
        data: data.data
      }]
    });
    this.sweep();
  }
};


Trace.prototype.on_edge_event = function(data) {
  if (!this.is_started) {
    return;
  }
  if (data.event === "dispatch") {
    this.trace.push({
      time: data.time,
      edges: [{
        id: data.edge_id,
        data: data.data
      }]
    });
    this.sweep();
  }
};

module.exports = Trace;