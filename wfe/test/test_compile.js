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

var _ = require("underscore");
var WorkflowEngine = require("../wfe");
var Bindings       = require("../mocks/bindings").Bindings;
var StaticBinding  = require("../mocks/bindings").StaticBinding;


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


// all test cases names
var cases = [
  "sensor_led",
  "request_response"
];


function load_case(path) {
  var result = JSON.parse(require(path));  
  // according to Jonathan, graph do not have id, use its parent's id
  result.graph.id = result.id;
  return result;
}


// test workflow compile
describe ("WorkflowEngine", function () {
  var wfe = new WorkflowEngine(dependencies);
  _.each(cases, function(case_name) {
    var caseobj = load_case("/home/zhangjianhu/projects/hope/samples/graph/" + case_name);
  
    describe (".compile " + case_name +  " case", function () {
      wfe.should.have.property("compile");
      it ("should not throw an exception", function() {
        wfe.compile(caseobj.graph,caseobj.specs);
      }).should.not.throw();
    });
  });  
});

// test workflow install
describe ("WorkflowEngine", function () {
  var wfe = new WorkflowEngine(dependencies);
  _.each(cases, function (case_name) {
    var caseobj = load_case("/home/zhangjianhu/projects/hope/samples/graph/" + case_name);
    var workflow = wfe.compile(caseobj.graph, caseobj.specs);
    // init binding
    _.each(caseobj.bindings, function(binding, nid) {
      staticBinding.addMapping(nid, binding.value);
    });

    var promise = null;
    describe (".execise " + case_name + " case", function () {
      it ("should be able to install", function (done) {
        promise = workflow.install(bindings).then(function() {
          done();
        });
      }).should.not.throw();
      
      it ("should be able to uninstall", function (done) {
        promise = promise.then(function () {
          workflow.uninstall().then(function() {
            done();
          });
        });
      }).should.not.throw();

      it ("should be able to start", function (done) {
        promise = promise.then(function() {
          workflow.start(bindings).then(function() {
            done();
          });
        });
      }).should.not.throw();

      it ("should be able to stop", function (done) {
        promise = promise.then(function() {
          workflow.stop().then(function() {
            done();
          });
        });
      }).should.not.throw();
    });
  });
});
