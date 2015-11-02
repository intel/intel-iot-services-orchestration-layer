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
 * @file Workflow Engine is the entity to manage all workflow instances.
 * The workflow engine takes responsibility to manage the lifecycle of
 * workflow instances it is created, and also have capability to inspect
 * the detailed information about workflow.
 *
 * @module wfe
 * @name wfe.js
 * @author Tianyou Li <tianyou.li@gmail.com>
 * @license Intel
 */

var Workflow = require("./wf");
var EventBus = require("./eventbus");


/**
 * Workflow Engine composite the required information to create and
 * execute a workflow. It also encapsulate the structures that used
 * to manage workflow instance's lifecycle and to inspect workflow
 * instance's internal status.
 *
 * @class WorkflowEngine
 * @constructor 
 * @param {object} dependencies dependencies grouped all workflow
 *                 engine required information to compile, execute
 *                 and manage a workflow as follows:
 * <pre><code>
 * {
 *   component_manager: cm // the component manager instantiate outside
 * }
 * </code></pre>
 */
function WorkflowEngine(dependencies)
{
  // the workflow this engine owned
  this.workflows = [];

  // the event bus that each workflow will utilize to pass message
  this.evtbs = new EventBus();

  // external dependencies injected for this engine
  this.cm = dependencies.component_manager;
}


/**
 * Compile a graph into workflow. The workflow is managed by this workflow engine
 * at runtime.
 *
 * @member
 * @function
 * @param {object} graph      the graph object which hold the original information
 *                            generated from the frontend
 * @param {object} schemas    The schemas object which hold the specification
 *                            information about the node referenced by the graph.
 * @returns returns the {@link module.wf.Workflow workflow} object if passed compilation. If
 *          error occurs, this method will throw an exception.
 */
WorkflowEngine.prototype.compile = function(graph, schemas, bindings) {
  var result = new Workflow(graph, schemas, bindings, this);
  try {
    result.compile();
  } catch (err) {
    throw err;
  }
  this.workflows.push(result);
  return result;
};

module.exports = WorkflowEngine;
