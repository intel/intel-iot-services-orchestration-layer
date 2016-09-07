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

var log = B.log.for_category("workflow/node");

var InPort = require("./in_port");
var OutPort = require("./out_port");
var BatchTag = require("./tag_batch");


// spec may define the in or out which contains a field ports
// but node may customize this in its in or out
// this helper talkes in/out of both json and returns an array of port json
// that could be used to create InPort or OutPort
function _parse_ports_spec(spec_ports_json, ports_json) {
  spec_ports_json = _.cloneDeep(spec_ports_json) || {};
  ports_json = _.cloneDeep(ports_json) || {};
  // added ports
  var ports = (spec_ports_json.ports || []).concat(ports_json.added_ports || []);
  // amended
  var ports_idx = _.keyBy(ports, "name");
  _.forEach(ports_json.amended_ports || [], function(p) {
    B.check(ports_idx[p.name], "workflow/node",
      "Failed to amend port: name doesn't exist", p, spec_ports_json);
    _.assign(ports_idx[p.name], p);
  });
  return ports;
}

function _parse_tags(o, tags, tags_json) {
  _.forEach(tags_json, function(t) {
    var tag = B.check(tags[t.ref], "workflow/node", "Tag doesn't exist", t);
    o.tags[tag.id] = tag;
  });
}

//----------------------------------------------------------------
// Node
//----------------------------------------------------------------

function Node(workflow, json) {
  json = json || {};
  B.check(json.id, "workflow/node", "Missing id", json);

  this.json = json;
  this.workflow = workflow;
  this.id = json.id;
  this.config = json.config || {};
  this.bindings = {};

  this.is_debug = json.is_debug;

  // status are loaded, installing, installed, enabling, enabled, disabling, disabled
  this.status = "loaded";

  this.in = {
    ports: {},
    is_grouped: false,
    tags: {}
  };
  this.out = {
    ports: {},
    tags: {}
  };

  var self = this;

  var spec = workflow.specs[json.spec];
  this.spec = spec;
  B.check(_.isObject(spec), "workflow/node", "Missing spec for node", json,
    "of workflow", workflow.id, workflow.specs);

  _parse_ports_spec(spec.in, json.in).forEach(function(p) {
    self.in.ports[p.name] = new InPort(self, p);
  });

  _parse_ports_spec(spec.out, json.out).forEach(function(p) {
    self.out.ports[p.name] = new OutPort(self, p);
  });

  // We assume that the entire IN is either grouped or non-grouped
  // TODO: We may need to either change the schema of input JSON
  // or add some validation logic here to ensure this assumption always work
  if (json.in && json.in.groups) {
    this.in.is_grouped = true;
  }

  // TODO: we assume tags are applied to entire IN or OUT rather than
  // individual port. We may need to either change the schema of input JSON
  // or add some validation logic here to ensure this assumption always work
  if (json.in && json.in.tags) {
    _parse_tags(this.in, this.workflow.tags, json.in.tags);
  }
  if (json.out && json.out.tags) {
    _parse_tags(this.out, this.workflow.tags, json.out.tags);
  }
}

Node.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/NODE/" + this.id + "/" + (key || ""));
};


Node.prototype.is_in_status = function(allowed_status) {
  if (!_.isArray(allowed_status)) {
    allowed_status = [allowed_status];
  }
  return _.includes(allowed_status, this.status);
};

Node.prototype.is_running = function() {
  return this.workflow.is_in_status("enabled") && this.is_in_status("enabled");
};


Node.prototype.emit = function(event, data) {
  this.workflow.event.emit("node", {
    type: "node",
    time: Date.now(),
    event: event,
    workflow_id: this.workflow.id,
    node_id: this.id,
    data: data
  });
};

Node.prototype.emit_debug = function(data) {
  if (!this.is_debug) {
    return;
  }
  this.workflow.emit_debug(this, data);
};


Node.prototype.is_head = function() {
  var result = true;
  _.forOwn(this.in.ports, function(p) {
    if (_.size(p.edges)) {
      result = false;
      return false; // exit _.forOwn early
    }
  });
  return result;
};


function _get_msg_tags(msg) {
  if (_.isObject(msg) && _.isObject(msg.meta) && _.isArray(msg.meta.tags)) {
    return msg.meta.tags;
  }
  return [];
}


/**
 * This tries to form an IN object. The prepare logic executes as below:
 *   if it is NOT grouped, then simply grab data from each port to form an IN
 *     and if a port has no data, simply use undefined for that port
 *   if it is GROUPED, it becomes a little bit complicated
 *     first of all, the finally formed IN should have message for all in ports.
 *       it would fail (i.e. return null) if any of inport is blank
 *     secondly, if there is tag defined for in, it doesn't simply grab the data
 *       from each port. Instead, it tries to grab the data from each port that
 *       satisfies the tag semantics. For example, if in is attached with a
 *       batch tag, then it would tries to prepare a IN object that each msg
 *       from each port has a matched batch tag (same tag id and same batch id)
 * @param {Object} triggered_port The port that result in this prepare action
 * @return {Object} null if failed. otherwise an Object contains messages
 * collected from each in port and waiting for being consumed before kernel
 */
// TODO remove these too old messages
Node.prototype.prepare = function(triggered_port) {
  if (!this.is_running()) {
    log.warn("Asked Node to prepare when it isn't running:", this.id, this.status);
    return;
  }
  this.emit("prepare", triggered_port);
  var data = {};
  var self = this;

  // no in ports
  if (_.size(this.in.ports) === 0) {
    return false;
  }

  // check whether each port has data
  var has_empty_port = false;
  _.forOwn(this.in.ports, function(port) {
    if (_.size(port.queue) === 0) {
      has_empty_port = true;
      return false; // exit forOwn early
    }
  });

  function _simply_grab() {
    _.forOwn(self.in.ports, function(port, name) {
      data[name] = port.queue[0];
    });
  }

  // ---------- not grouped --------------
  if (!this.in.is_grouped) {
    _simply_grab();
    return data;
  }

  // ---------- grouped --------------
  // null if has empty port
  if (has_empty_port) {
    return null;
  }

  // simply grab if no tags
  if (_.size(this.in.tags) === 0) {
    _simply_grab();
    return data;
  }
  // tagged, need search to get a matched pair
  // TODO this is a simple implementation for now, may need an optimized
  // algorithm in the future
  // currently, we simply do a DFS search of all possible combinataion of
  // messages, to see whether they match the tag requirements or not
  // Basically,
  //    a) pickup a msg from queue of first port
  //    b) try to add a msg from queue of 2nd port and ensure it matches all tags
  //    c) try to add a msg from queue of 3rd ...
  // if failes on any queue, then roll back. It fails if all fails
  // To accelerate this, each stage of DFS is
  // (idx of queue of 1st port, idx of queue of 2nd port, ..., a tag context)
  // Tag context saves the current restriction of the tags, e.g. available batch_ids
  // based on existing messages, this avoids some duplicated calculations

  var keys = _.keys(this.in.ports);

  // we use {port_idx: ..., msg_idx: ...} as a pointer
  function _at(p) {
    if (p.port_idx >= keys.length) {
      return null;
    }
    var _q = self.in.ports[keys[p.port_idx]].queue;
    if (p.msg_idx > _q.length) {
      return null;
    }
    return _q[p.msg_idx];
  }
  function _has(p) {
    return _at(p) !== null;
  }
  // build the tree
  function _childen(p) {
    var children = [];
    var _p_idx = p.port_idx + 1;
    if (_p_idx >= keys.length) {
      return children;
    }
    if (_p_idx < keys.length) {
      children = _.range(self.in.ports[keys[_p_idx]].queue.length).map(
        function(_i) {
          return {
            port_idx: _p_idx,
            msg_idx: _i
          };
        });
    }
    return children;
  }

  // we try to get a path (only need one)
  // f verifies whether current node (the message) is ok, it returns null
  // if current node fails, otherwise it returns a new context
  // dfs itself return the valid path or null (if failed)
  function _dfs(p, f, ctx) {
    if (!_has(p)) {
      return null;
    }
    var new_ctx = f(p, ctx);
    if (!new_ctx) {
      return null;
    }
    var res;
    var children = _childen(p);
    if (!children.length) {
      // we have already checked whether any port is empty
      // so if no children, it means it is the leaf node
      return [p];
    }
    _.forEach(children, function(c) {
      res = _dfs(c, f, new_ctx);
      if (res) {
        return false;   // quit ealier
      }
    });
    if (!res) { // at least one child should have valid path
      return null;
    }
    return [p].concat(res);
  }

  function _visit(p, ctx) {
    var new_ctx = {};
    var m = _at(p);
    if (!m) {
      return null;
    }
    var failed = false;
    _.forOwn(self.in.tags, function(t) {
      if (BatchTag.is(t)) {
        new_ctx[t.id] = BatchTag.validate_tag_array_with_context(
          _get_msg_tags(m), t.id, ctx[t.id]);
        if (!new_ctx[t.id]) { // failed for this tag
          failed = true;
          return false; // quit earlier
        }
      }
    });
    if (failed) {
      return null;
    }
    return new_ctx;
  }

  var res = _dfs({port_idx: 0, msg_idx: 0}, _visit, {});
  if (!res) {
    return null;
  }
  _.forEach(res, function(p) {
    data[keys[p.port_idx]] = _at(p);
  });
  return data;
};

/**
 * Really execute the functionablity offered by this node
 * The data send to underlying impl is {
 *   IN: the in object
 *   tags: the tags
 * }
 * @param  {Object} unconsumed_IN The stuff got from prepare
 */
Node.prototype.kernel$ = function(unconsumed_IN) {
  if (!this.is_running()) {
    log.warn("Asked Node to kernel when it isn't running:", this.id, this.status);
    return Promise.resolve();
  }

  var IN = {};
  var self = this;
  _.forOwn(unconsumed_IN, function(msg, name) {
    var port = self.in.ports[name];
    if (!port) {
      return Promise.reject(new Error("Node/kernel$ failed to get in port with name " +
        name + " for message " + B.to_string(msg)));
    }
    // some ports may have no meesasge if ungrouped
    if (msg) {
      port.consume_message(msg.id);
      IN[name] = msg.payload;
    }
  });
  var IN_id = B.unique_id("IN_");
  this.emit("kernel", IN);
  this.emit_debug({
    type: "kernel",
    IN_id: IN_id,
    IN: IN
  });
  var meta = {
    IN_id: IN_id,
    is_debug: this.is_debug,
    tags: []
  };
  if (this.is_debug) {
    meta.IN = IN;   // Ensure it is sent back from service
  }
  return this.get_impl().kernel$(this, {
    IN: IN,
    meta: meta
  });
};

/**
 * This tries to prepare, and if succeed, it executes the kernel
 * @param  {Object} triggered_port
 * @return {Promise} Only reject if encounters any error. It resolves
 *    even if the prepare failed and kernel not executed
 */
Node.prototype.kernel_if_prepare_succeed$ = function(triggered_port) {
  try {
    if (!this.is_running()) {
      log.warn("Asked Node to kernel_if_prepare_succeed when it isn't running:", this.id, this.status);
      return Promise.resolve();
    }
    var unconsumed_IN = this.prepare(triggered_port);
    if (!unconsumed_IN) {
      return Promise.resolve();
    } else {
      return this.kernel$(unconsumed_IN);
    }
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Dispatch the data from out ports
 * @param  {Object} payload Each field corresponding to a OutPort
 * @param {Object} meta The meta to carry over
 */
Node.prototype.send = function(payload, meta) {
  this.emit("send", {
    payload: payload,
    meta: meta
  });
  this.emit_debug({
    type: "send",
    IN_id: meta.IN_id,
    IN: meta.IN,
    data: payload
  });

  if (!this.is_running()) {
    log.warn("Asked Node to send when it isn't running:", this.id, this.status, payload, meta);
    return;
  }
  var self = this;
  // attach tag info. into meta
  meta = _.cloneDeep(meta);
  meta = meta || {};
  _.forOwn(this.out.tags, function(t) {
    if (BatchTag.is(t)) {
      meta.tags = meta.tags || [];
      BatchTag.attach_to_tag_array(t, meta.tags);
    }
  });
  _.forOwn(payload, function(v, k) {
    var port = self.out.ports[k];
    if (!port) {
      log.warn("Asked Node to send when no such port: " + k + ", payload: ", payload);
      return;
    }
    _.forOwn(port.edges, function(e) {
      e.dispatch(v, meta);
    });
  });
};


//----------------------------------------------------------------
// External Dependencies
//
// NOTE: for status, if it is in incorrect status, we  simply resolove
// This allows workflow to reinvoke an operation multiple times without error
//----------------------------------------------------------------
// Each node is able to use their own customized implementation to respond
// invocation of install, uninstall, enable, disable, kernel, kickoff
Node.prototype.get_impl = function() {
  return this.workflow.engine.default_node_impl;
};

Node.prototype.install$ = function() {
  try {
    this.emit("install");
    if (!this.is_in_status("loaded")) {
      log.warn("Asked Node to install when it isn't loaded status:", this.id, this.status);
      return Promise.resolve();
    }

    this.status = "installing";
    _.forEach(this.in.ports, function(p) {
      p.install();
    });
    _.forEach(this.out.ports, function(p) {
      p.install();
    });

    var self = this;
    return this.get_impl().install$(this).then(function() {
      self.status = "installed";
    }).catch(function(e) {
      self.status = "loaded";
      throw e;
    });
  } catch (e) {
    log.error("install", e);
    return Promise.reject(e);
  }
};

Node.prototype.uninstall$ = function() {
  try {
    this.emit("uninstall");
    var self = this;
    var status = this.status;
    if (!this.is_in_status(["disabled", "installed"])) {
      log.warn("Node to uninstall isn't in allowed status:", this.id, this.status);
      return Promise.resolve();
    }

    this.status = "uninstalling";
    _.forEach(this.in.ports, function(p) {
      p.uninstall();
    });
    _.forEach(this.out.ports, function(p) {
      p.uninstall();
    });

    return this.get_impl().uninstall$(this).then(function() {
      self.status = "loaded";
    }).catch(function(e) {
      self.status = status;
      throw e;
    });
  } catch (e) {
    log.error("uninstall", e);
    return Promise.reject(e);
  }
};

Node.prototype.enable$ = function() {
  try {
    this.emit("enable");
    var self = this;
    var status = this.status;
    if (!this.is_in_status(["installed", "disabled"])) {
      log.warn("Node to enable isn't in allowed status:", this.id, this.status);
      return Promise.resolve();
    }

    this.status = "enabling";

    return this.make_lock().lock_as_promise$(function() {
      return self.get_impl().enable$(self).then(function() {
        self.status = "enabled";
      }).catch(function(e) {
        self.status = status;
        throw e;
      });
    });
  } catch (e) {
    log.error("enable", e);
    return Promise.reject(e);
  }
};

Node.prototype.disable$ = function() {
  try {
    this.emit("disable");
    if (!this.is_in_status("enabled")) {
      log.warn("Node to disable isn't in allowed status:", this.id, this.status);
      return Promise.resolve();
    }
    this.status = "disabling";
    var self = this;
    return this.make_lock().lock_as_promise$(function() {
      return self.get_impl().disable$(self).then(function() {
        self.status = "disabled";
      }).catch(function(e) {
        self.status = "enabled";
        throw e;
      });
    });
  } catch (e) {
    log.error("disable", e);
    return Promise.reject(e);
  }
};

Node.prototype.kickoff$ = function() {
  this.emit("kickoff");
  return this.get_impl().kickoff$(this).catch(function(e) {
    log.error("kickoff", e);
    throw e;
  });
};


module.exports = Node;