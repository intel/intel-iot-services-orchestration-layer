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
var _                  = require("lodash");
var WorkflowEngine = require("./wfe.js");
var B = require("hope-base");
var check = B.check;
//var checker            = require("./check");

var WFStatus = {
    NON_EXIST : "Non-exist",
    IDLE : "Idle",
    WORKING : "Working",
    PAUSED : "Paused",
    STOPPED : "Stopped",
    //Following is only used internally.
    UNCOMPILED    :"uncompiled",
    COMPILED      :"compiled",
    UNINSTALLED   :"uninstalled",
    INSTALLED     :"installed",
    ENABLED       :"enabled",
    DISABLED      :"disabled"
};

function WorkflowAPI(dependencies) {
    this.wfe = new WorkflowEngine(dependencies);
}
WorkflowAPI.prototype.compile = function(graph, specs, bindings) {
    check(this.get_status(graph.id) === WFStatus.NON_EXIST,  "wfe/workflow", "graph's status should be " + WFStatus.NON_EXIST + ", instead of " + this.get_status(graph.id));
    return this.wfe.compile(graph, specs, bindings);
};
/**
 * To Modify workflow.start() to workflowengine.start()
 * If just one param is given, that param is the graph id
 * If three params are given, recompile the wfe and start it
 * @param  {object/id} graph    [description]
 * @param  {object/undefined} specs    [description]
 * @param  {object/undefined} bindings [description]
 * @return {promise}          [description]
 */
WorkflowAPI.prototype.start$ = function(graph, specs, bindings) {
    var self = this;
    var length = arguments.length;
    var id = (length === 1) ? graph : graph.id;
    var index = _.findIndex(self.wfe.workflows, function(workflow) {
        return workflow.graph.id === id;
    });
    var workflow = self.wfe.workflows[index];
    return new Promise(function(resolve, reject) {
        check([WFStatus.NON_EXIST, WFStatus.IDLE, WFStatus.STOPPED].indexOf(self.get_status(id)) >= 0,
          "wfe/workflow",
          "graph's status should be" + [WFStatus.NON_EXIST, WFStatus.IDLE, WFStatus.STOPPED] + ", instead of " + self.get_status(id));
        if ( length === 3 ) {
            if ( index >= 0 ) {
                self.wfe.workflows.splice(index, 1);
            }
            resolve(self.compile(graph, specs, bindings).start(bindings));
        }
        else if ( length === 1) {
            if ( index < 0) {
                reject(new Error("Error:There is no such a graph."));
            }
            resolve(workflow.start(workflow.bindings));
        }
        else {
            reject(new Error("Error:Wrong parameters."));
        }
    });
};
WorkflowAPI.prototype.stop$ = function(id) {
    var self = this;
    var workflow = _.find(self.wfe.workflows, function(workflow) {
        return workflow.graph.id === id;
    });
    return new Promise(function(resolve, reject) {
        check([WFStatus.PAUSED, WFStatus.WORKING].indexOf(self.get_status(id)) >= 0,  "wfe/workflow", "graph's status should be " + [WFStatus.PAUSED, WFStatus.WORKING] + ", instead of " + self.get_status(id));
        if (self.get_status(id) === WFStatus.WORKING) {
            resolve(workflow.stop());
        }
        else {
            resolve(workflow.uninstall());
        }

    });
};
WorkflowAPI.prototype.pause$ = function(id) {
    var self = this;
    return new Promise(function(resolve, reject) {
        check(self.get_status(id) === WFStatus.WORKING,  "wfe/workflow", "graph's status should be " + WFStatus.WORKING + ", instead of " + self.get_status(id));
        var workflow = _.find(self.wfe.workflows, function(workflow) {
            return workflow.graph.id === id;
        });
        resolve(workflow.disable());
    });
};
WorkflowAPI.prototype.resume$ = function(id) {
    var self = this;
    return new Promise(function(resolve, reject) {
        check(self.get_status(id) === WFStatus.PAUSED,  "wfe/workflow", "graph's status should be " + WFStatus.PAUSED + ", instead of " + self.get_status(id));
        var workflow = _.find(self.wfe.workflows, function(workflow) {
            return workflow.graph.id === id;
        });
        resolve(workflow.enable());
    });
};
WorkflowAPI.prototype.get_status = function(id) {
    var workflow = _.find(this.wfe.workflows, function(workflow) {
        return workflow.graph.id === id;
    });
    if (!workflow) {
        return WFStatus.NON_EXIST;
    }
    else {
        switch (workflow.status) {
            case WFStatus.ENABLED : {
                return WFStatus.WORKING;
            }
            case WFStatus.DISABLED : {
                return WFStatus.PAUSED;
            }
            case WFStatus.UNINSTALLED : {
                return WFStatus.STOPPED;
            }
            case WFStatus.COMPILED : {
                return WFStatus.IDLE;
            }
        }
    }
};
exports.create_wfe = function(dependencies) {
    return new WorkflowAPI(dependencies);
};

exports.$factories = {
  WFE: exports.create_wfe
};