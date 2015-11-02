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
require("assert");
require("should");

var _              = require("underscore");
var Bindings       = require("../mocks/bindings").Bindings;
var StaticBinding  = require("../mocks/bindings").StaticBinding;
var WorkflowEngine = require("../wfe");

// mock
var ComponentManager = require("../mocks/cm");

// dependencies that workflow engine will rely on
var dependencies = {
  component_manager: new ComponentManager()
};

// binding mocks
var staticBinding = new StaticBinding();
var bindings = new Bindings();
bindings.addBinding(staticBinding);

var bundles = JSON.parse(require("/home/zhangjianhu/projects/hope/ui-dev/ui/js/samples/spec_bundles.js"));
var specs = [];
_.each(bundles, function(bundle){
  specs = specs.concat(bundle.specs);
});
specs.push({
    "id": "switch_spec",
    "type": "spec",
    "catalog": "switch",
    "name": "On/Off",
    "description": "Turn On/Off a thing",
    "in": {
      "ports": [{
        "name": "on",
        "type": "boolean",
        "description": "true -> on, false -> off",
        "default": false,
        "buffered": false,
        "customizations_disabled": {
          "buffered": false,
          "passive": false,
          "be_grouped": false
       }
     }]
    }
  });
function load_case(path) {
  var result = require(path);
  // according to Jonathan, graph do not have id, use its parent's id
  result.graph.id = result.id;
  result.specs  = specs;
  return result;
}


// test tag for test_tag case
var case_name = "/home/zhangjianhu/projects/hope/ui-dev/.local/GRAPH_f37b96b0-4563-11e5-88b2-0d4d2a9b721f.json";
describe ("Compile, install and run " + case_name + " case", function () {
  var wfe = new WorkflowEngine(dependencies);
  var caseobj = load_case(case_name);
  var workflow = null;

  // init binding
  _.each(caseobj.bindings, function(binding, nid) {
    staticBinding.addMapping(nid, binding.value);
  });

  describe (".compile " + case_name +  " case", function () {
    it ("should not throw an exception", function() {
      workflow = wfe.compile(caseobj.graph,caseobj.specs);
    }).should.not.throw();
  });

  var promise = null;
  describe (".start " + case_name +  " case", function () {
    it ("should not throw an exception", function(done) {
      promise = workflow.start(bindings).then(done);
    }).should.not.throw();
  });

  describe (".emit request event for " + case_name +  " case", function () {
    it ("should not throw an exception", function() {
      promise.then( function (value) {
        workflow.emit("NODE_fb93e280-4563-11e5-88b2-0d4d2a9b721f",{
          meta : {
            tags:{}
          },
          payload: {
            OUT:{
              ip:"127.0.0.1",
              data: {
                header: "hello",
                body: "world"
              }
            }
          }
        });
        workflow.emit("NODE_fc68beb0-4563-11e5-88b2-0d4d2a9b721f",{
          meta : {
            tags:{}
          },
          payload: {
            OUT:{
              ip:"127.0.0.2",
              data: {
                header: "Good",
                body: "Job"
              }
            }
          }
        });
      });
    }).should.not.throw();
  });
});
