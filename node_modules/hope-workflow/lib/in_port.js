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
var B = require("hope-base");
var _ = require("lodash");
var BatchTag = require("./tag_batch");

var log = B.log.for_category("workflow/in_port");

//----------------------------------------------------------------
// Port
//----------------------------------------------------------------

function InPort(node, json) {
  json = json || {};
  this.node = node;
  this.json = json;

  this.name = json.name;
  this.type = json.type;
  this.is_buffered = json.buffered;
  this.default = json.default;
  this.no_trigger = json.no_trigger;


  this.edges = {};


  this.queue = [];
}

InPort.prototype.install = function() {
  if (!this.is_buffered && !_.isUndefined(this.default)) {
    this.queue[0] = this.node.workflow.create_message(this.default);
  }
};

InPort.prototype.uninstall = function() {
  this.queue = [];
};


InPort.prototype.on_receive = function(msg, no_store) {
  this.node.emit("receive", {
    in_port: this.name,
    message: msg
  });
  if (!this.node.is_running()) {
    log.warn("Inport", this.name, "Recieved message when it isn't running. Node",
    this.node.id, this.node.status, "and message", msg);
    return;
  }
  // nothing to do
  if (no_store && this.no_trigger) {
    return;
  }
  // verify the tags here
  var is_tag_satisfied = true;
  var tags = [];
  if (_.isObject(msg) && _.isObject(msg.meta) && _.isArray(msg.meta.tags)) {
    tags = msg.meta.tags;
  }

  _.forOwn(this.node.in.tags, function(t) {
    if (t.type === "batch") {
      if (!BatchTag.validate_tag_array(t, tags)) {
        is_tag_satisfied = false; // AND, failed if any tag in inport failed
        return false; // exit forOwn early
      }
    }
  });
  if (!is_tag_satisfied) {
    return;
  }
  // store
  if (!no_store) {
    if (this.is_buffered) {
      this.queue.push(msg);
    } else {
      this.queue[0] = msg;
    }  
  }
  // trigger: prepare and then kernel
  var self = this;
  if (!this.no_trigger) {
    this.node.kernel_if_prepare_succeed$(this).catch(function(e) {
      self.node.send({
        error: e
      });
    }).done();
  }
};

// remove the message from the queue
InPort.prototype.consume_message = function(msg_id) {
  if (this.is_buffered) {
    _.remove(this.queue, function(m) {
      return m.id === msg_id;
    });
  }
};

module.exports = InPort;