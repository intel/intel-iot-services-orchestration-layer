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
 * @file Workflow is the runtime representation of designate IoT process
 * defined by user via HOPE IDE tool. Workflow is generated from the graph,
 * which is produced by HOPE IDE.
 *
 * @module wf
 * @name wf.js
 * @author Tianyou Li <tianyou.li@gmail.com>
 * @license Intel
 */
var _                  = require("underscore");
var Q                  = require("q");
var B =  require("hope-base");

var checker            = require("./check");
var ComponentProcessor = require("./cp");
var Inport             = require("./code").Inport;
var MergeInport        = require("./code").MergeInport;
var ChoiceInport       = require("./code").ChoiceInport;
var Outport            = require("./code").Outport;
var Operator           = require("./code").Operator;

var WFStatus = {
  UNCOMPILED    :"uncompiled",
  COMPILED      :"compiled",
  UNINSTALLED   :"uninstalled",
  INSTALLED     :"installed",
  ENABLED       :"enabled",
  DISABLED      :"disabled"
};


/**
 * Workflow class encapsulate the required information for a user defined
 * IoT process to compile and run. Its instance should only be created via
 * Workflow engine's factory method.
 *
 * @class Workflow
 * @constructor
 * @param {object} graph   the graph object that holds the user defined IoT
 *                         process
 * @param {object} schemas the specification information that used to
 *                         describe each operation node in graph
 * @param {object} engine  the workflow engine object who creates this workflow
 */
function Workflow(graph, schemas, bindings, engine) {
  /** graph object
   *   graph object hold the original workflow graph object passed from
   *   frontend. This object will be keeped as-is after validate, compile
   *   and execute.
   * @member
   * @readonly
   */
  this.graph = graph;

  /** schemas object
   *   schemas object hold all schemas the graph may reference
   * @member
   * @readonly
   */
  this.schemas = schemas;

  /** engine object
   *   hold the engine which creates this workflow object
   * @member
   * @readonly
   */
  this.engine = engine;

  /** workflow object
   *   workflow object hold the compiled result of graph, it's basically
   *   an AST after compile the graph
   * @member
   * @readonly
   * @private
   */
  this.workflow = null;

  /** status object
   *   status object hold the current status of workflow engine. The status
   *   include: starting, started, stopping, stopped, compiling, compiled
   * @member
   * @readonly
   */
  this.status = WFStatus.UNCOMPILED;

  // the code generated for execution
  this.codes = [];

  // the id for this workflow
  this.wid = null;

  // the event bus, propagate from engine
  this.evtbs = engine.evtbs;

  // the component manager, propagate from engine
  this.cm = engine.cm;


  /*
  * bindings{
  *          hub_id:
  *          thing_id:
  *          service_id:
  * }
  * Used in workflow.start()
  */
  this.bindings = bindings;

}

Workflow.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/WF/" + this.wid + "/" +
    (_.isUndefined(key) ? "" : key));
};

///----------------------------------------------------------------
//         External interface defined below
///----------------------------------------------------------------

/**
 * Install the workflow, once workflow installed, it is ready to process the
 * logic defined by user. But user still need to 'enable' the workflow after
 * workflow installed.
 *
 * @member
 * @function
 * @param {object} bindings binding provider that can resolve device information
 *                          at runtime according to the context realized at that
 *                          time.
 */
Workflow.prototype.install = function (bindings) {

  checker.check_status([WFStatus.COMPILED, WFStatus.UNINSTALLED],this.status);
  var self = this;
  return this.make_lock().lock_as_promise$(function() {
    // install bindings for each operator, and trigger each operator's install()
    var promises = [];
    _.each(self.codes, function(code) {
      code.operate.bindings = bindings;
      promises.push(code.install());
    });
    return Q.all(promises).then(function (values ){
      self.status = WFStatus.INSTALLED;
    });
  })
};


/**
 * Uninstall the workflow. This operation will cleanup every runtime generated
 * or cached objects, and will offline the workflow from being able to execute.
 *
 * @member
 * @function
 */
Workflow.prototype.uninstall = function () {
  checker.check_status(
    [WFStatus.INSTALLED, WFStatus.ENABLED, WFStatus.DISABLED],this.status);
  var self = this;
  return this.make_lock().lock_as_promise$(function() {
    var promoises = [];
    _.each(self.codes, function(code) {
      promoises.push(code.uninstall());
      code.operate.bindings = null;
    });

    return Q.all(promoises).then(function (values) {
      self.status = WFStatus.UNINSTALLED;
    });
  });

};


/**
 * Enable the workflow. This operation will put workflow into executable state
 * if the workflow has been installed. A workflow can be enabled from disabled
 * state.
 *
 * @member
 * @function
 */
Workflow.prototype.enable = function () {
  checker.check_status([WFStatus.INSTALLED, WFStatus.DISABLED],this.status);
  var self =this;
  return this.make_lock().lock_as_promise$(function() {
    var promises = [];
    _.each(self.codes, function(code) {
      promises.push(code.enable());
    });

    return Q.all(promises)
      .then(function (values) {
        self.status = WFStatus.ENABLED;
        _.each(self.codes, function(code) {
          code.kickoff();
        });
      })
      .then(function (){
        _.each(self.codes, function(code) {
          if( code.isOrigin ){
            code.trigger();
          }
        });
      });
  });
};


/**
 * Disable the workflow. This operation will put workflow into non-executable
 * state but keep runtime generated or cached objects unchanged, so those objects
 * could be reused after enable().
 *
 * @member
 * @function
 */
Workflow.prototype.disable = function () {
  checker.check_status([WFStatus.ENABLED],this.status);
  var self = this;
  return this.make_lock().lock_as_promise$(function() {
    var promises = [];
    _.each(self.codes, function(code) {
      promises.push(code.disable());
    });
    return Q.all(promises).then(function (values) {
      self.status = WFStatus.DISABLED;
    });
  });
};


/**
 * Start the workflow. It is auxiliary method that combines install() and
 * enable() call.
 *
 * @member
 * @function
 */
Workflow.prototype.start = function (bindings) {
  var self = this;
  return self.install(bindings)
    .then(function(){
      return self.enable();
    });
};


/**
 * Stop the workflow. It is auxiliary method that combines uninstall() and
 * disable() call.
 *
 * @member
 * @function
 */
Workflow.prototype.stop = function () {
  var self = this;
  return self.disable().then(function() {
    return self.uninstall();
  });
};


///----------------------------------------------------------------
//         private interface defined below
///----------------------------------------------------------------

/**
 * Compile graph to workflow. This interface should only be invoked by
 * Workflow engine
 *
 * @member
 * @function
 * @private
 */
Workflow.prototype.compile = function () {
  checker.check_status([WFStatus.UNCOMPILED],this.status);
  checker.check_not_empty("Workflow<compile.graph>", this.graph);

  this.wid = this.graph.id;
  var self = this;
  _.each(self.graph.nodes, function (node) {
    // create a operator for the node
    self.createOperator(node.id, node);
  });

  this.status = WFStatus.COMPILED;
};


///----------------------------------------------------------------
//         Internal interface defined below
///----------------------------------------------------------------

Workflow.prototype.createOperator = function (sid, node) {
  var self = this;
  var isOrigin = !_.some(this.graph.edges,function(edge){
    return edge.target.node === sid;
  });
  var op = new Operator(self.wid, sid, new ComponentProcessor(self), isOrigin);

  // get schema of the node
  var schema = self.getSchemaById(node.spec);
  checker.check_not_empty("Workflow<compile.operator.schema>", schema);

  // merge node with schema. todo: schema validation
  this.mergeNodeWithSchema(node, schema);

  // attach node info to op
  op.ccat = node.catalog; // ccat: component catalog

  // create inport
  this.createOpInport(op, node);
  // create outport
  this.createOpOutports(op, node);

  self.codes.push(op);
};

Workflow.prototype.mergeNodeWithSchema = function (node, schema) {
  // clone schema
  var new_node = JSON.parse(JSON.stringify(schema));
  this.mergeRightToLeft(node, new_node);
  if (node.in && node.in.allow_to_add) {
    node.in.ports = node.in.ports || [];
    node.in.ports = _.union(node.in.ports, node.in.added_ports);
  }
  if ( node.in ) {
    node.in.ports = node.in.ports || [];
    _.each(node.in.amended_ports,function(amended_port){
      // amended inports must be in the spec
      var index = _.findIndex(node.in.ports, function(port){
        return port.name === amended_port.name;
      });
      _.assign(node.in.ports[index], amended_port);
    });
  }
  if (node.out && node.out.allow_to_add) {
    node.out.ports = node.out.ports || [];
    node.out.ports = _.union(node.out.ports, node.out.added_ports);
  }
};

Workflow.prototype.mergeRightToLeft = function (left, right) {
  for (var key in right) {
    if (_.isUndefined(left[key])) {
      left[key] = right[key];
    } else if (_.isObject(right[key])) {
      this.mergeRightToLeft(left[key], right[key]);
    } else if (_.isArray(right[key])) {
      left[key] = _.union(left[key], right[key]);
    }
  }
};

Workflow.prototype.getSchemaById = function (spec_id) {
  var result = null;

  _.find(this.schemas, function (schema) {
    if (schema.id === spec_id) {
      result = schema;
      return true;
    }
    return false;
  });

  return result;
};

Workflow.prototype.createOpOutports = function(operator, graph_node) {
  var self = this;
  var op   = operator;
  var node = graph_node;
  var outports = op.outports;
  var graph = this.graph;

  // get all outports which have edges
  var connected_outports = this.getConnectedOutportsByNode(node);

  // get all defined outports
  var defined_outports = [];
  if (node.out && node.out.ports) {
    defined_outports = node.out.ports;
  }

  // create outport for connected and defined port
  _.each(defined_outports, function (port) {
    if (_.contains(connected_outports, port.name)) {
      var outport = self.createOutport(port.name);
      outport.setParent(op);
      outports.push(outport);
      // find all dest nodes' inport for this port
      var edges = self.getEdgesBySourcePort(node.id, port.name);
      _.each(edges, function (edge) {
        outport.addTarget(edge.target.node, edge.target.port);
      });
      // find all tags which attached to this port
      if (node.out && node.out.tags) {
        var tags = node.out.tags;
        _.each(tags, function (tag) {
          var ports = tag.ports;
          if (_.contains(ports, port.name)) {
            // find the tag definition
            var t = _.find(graph.tags, function (item) {return item.id === tag.ref;});
            outport.addTag(t.type, t.id);
          }
        });
      }
    }
  });
};

Workflow.prototype.getEdgesBySourcePort = function (id, port) {
  var edges = this.graph.edges;
  return _.filter(edges, function(edge) {
    return edge.source.node === id && edge.source.port === port;
  });
};

Workflow.prototype.getConnectedPortsByNode = function (graph_node, isInport) {
  var self = this;
  var node = graph_node;
  var nid = node.id;
  var result = [];

  _.each(self.graph.edges, function(edge) {
    var ref  = isInport ? edge.target : edge.source;
    if (ref.node === nid) {
      if (!_.contains(result, ref.port)) {
        result.push(ref.port);
      }
    }
  });

  return result;
};

// true if array2 was subset of array1
Workflow.prototype.inSet = function (array1, array2) {
  return array1.filter(function(element) {
    return array2.indexOf(element) > -1;
  }).length ===  array2.length;
};

Workflow.prototype.createOpInport = function (operator, graph_node) {
  var self = this;
  var op   = operator;
  var node = graph_node;
  var graph = this.graph;
  // get all inports which have edge
  var connected_inports = this.getConnectedInportsByNode(node, true);
  _.each(node.in.ports,function(port){
    if( !_.contains(connected_inports,port.name) ) {
      connected_inports.push(port.name);
    }
  });
  // have group?
  var haveInGroups  = node.in !== null && node.in !== undefined &&
                      node.in.groups !== null && node.in.groups !== undefined;

  // create merge inport according to group info
  var processed_ports = [];
  var merge_ports = [];
  if (haveInGroups) {
    _.each(node.in.groups, function(group) {
      var grouped_ports = group.ports;
      // todo: check groups do not have intersection
      // todo: check group ports should be defined in schema in ports
      // todo: check all group ports should have edge
      if (self.isSubset(connected_inports, grouped_ports)) {
        var mergeport = self.createMergeInport(group.id, op);
        merge_ports.push(mergeport);
        _.each(group.ports, function(port) {
          var port_config = _.find(node.in.ports,function(ele){
            return ele.name === port;
          });
          var inport = self.createInport(port, op, port_config);
          mergeport.addChild(inport);
          processed_ports.push(port);
        });
      } else {
        // todo: report a warning
      }
    });
  }

  // all connected ports are grouped ports, and only one group
  if (connected_inports.length === processed_ports.length &&
      merge_ports.length === 1) {
    op.inport = merge_ports[0];
    op.inport.setParent(op);
  } else if (connected_inports.length > 0) {
    op.inport = this.createChoiceInport(op.sid, op);
    op.inport.setParent(op);
    // add all groups
    _.each(merge_ports, function(port) { op.inport.addChild(port);});
    // add none grouped, connected ports
    _.each(connected_inports, function(port) {
      if (!_.contains(processed_ports, port)) {
        var port_config = _.find(node.in.ports,function(ele){
          return ele.name === port;
        });
        var inport = self.createInport(port, op, port_config);
        op.inport.addChild(inport);
      }
    });
  }

  // find all tags which attached to this port
  _.each(connected_inports, function(port){
    if (node.in && node.in.tags) {
      var tags = node.in.tags;
      _.each(tags, function (tag) {
        // find the tag definition
        var t = _.find(graph.tags, function (item) {return item.id === tag.ref;});
        op.inport.addTag(t.type, t.id);
      });
    }
  });

};


Workflow.prototype.isSubset = function (superset, set) {
  return superset.length === _.union(superset, set).length;
};

Workflow.prototype.getConnectedInportsByNode = function (graph_node) {
  return this.getConnectedPortsByNode(graph_node, true);
};

Workflow.prototype.getConnectedOutportsByNode = function (graph_node) {
  return this.getConnectedPortsByNode(graph_node, false);
};


///----------------------------------------------------------------
//         Factory method for code gen
///----------------------------------------------------------------

Workflow.prototype.createMergeInport = function (sid, operator) {
  return new MergeInport(this.wid, sid, this.evtbs, operator);
};

Workflow.prototype.createChoiceInport = function (sid, operator) {
  return new ChoiceInport(this.wid, sid, this.evtbs, operator);
};

Workflow.prototype.createInport = function (sid, operator, port_config) {
  return new Inport(this.wid, sid, this.evtbs, operator, port_config);
};

Workflow.prototype.createOutport = function (sid) {
  return new Outport(this.wid, sid, this.evtbs);
};


///----------------------------------------------------------------
//         Debugging & Tooling interfaces defined below
///----------------------------------------------------------------

Workflow.prototype.print = function (fstream) {
  var self = this;

  fstream.write("Workflow " + self.wid + "\n");
  _.each(self.codes, function (code) {
    code.print(fstream);
  } );
};

// simulate the output of component
Workflow.prototype.emit = function(cid, message) {
  var cps = [];
  _.each(this.codes, function (code) {
    if (cid === code.sid) {
      cps.push(code);
    }
  });

  checker.check_not_empty("Workflow<emit>.cps", cps);

  _.each(cps, function(code) {
    code.operate.out_handler(message);
  });
};

module.exports = Workflow;
