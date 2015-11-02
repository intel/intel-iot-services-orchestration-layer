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

var _  = require("underscore");
var WFA = require("../index");
var ComponentManager = require("../mocks/cm");
var B = require("hope-base");
// dependencies that workflow engine will rely on
var dependencies = {
  component_manager: new ComponentManager()
};
var bundles_path = B.path.abs("./forAPItest/spec_bundles.js", __filename);
var bundles = JSON.parse(require(bundles_path));
var specs = [];
_.each(bundles, function(bundle) {
  specs = specs.concat(bundle.specs);
});

function load_case(path) {
  var result = B.fs.read_json(path);
  // according to Jonathan, graph do not have id, use its parent's id
  result.graph.id = result.id;
  result.specs  = specs;
  return result;
}

var case_name = B.path.abs("./forAPItest/graph_api.json", __filename);

describe ("Compile, install and run case >>", function () {
  var wfe = WFA.create_wfe(dependencies);
  var caseobj = load_case(case_name);


  it ("compile first", function() {
    console.log("Current status is " + wfe.get_status(caseobj.graph.id));
    wfe.compile(caseobj.graph, caseobj.specs, caseobj.bindings);
    console.log("Current status is " + wfe.get_status(caseobj.graph.id));
  });





  it ("start after compile", function(d) {
    wfe.start$(caseobj.graph, caseobj.specs, caseobj.bindings)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("stop after start", function(d) {
    wfe.stop$(caseobj.graph.id)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("start after stop", function(d) {
    wfe.start$(caseobj.graph.id)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("pause after start", function(d) {
    wfe.pause$(caseobj.graph.id)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("start after pause (exception)", function(d) {
    wfe.start$(caseobj.graph.id)
    .catch(function(e) {
      if (e.$check === true) {
          console.log("Improperly call sequence has been detected.");
      }
      d();
    }).done();
  });


  it ("pause after pause (exception)", function(d) {
    wfe.pause$(caseobj.graph.id)
    .catch(function(e) {
      if (e.$check === true) {
          console.log("Improperly call sequence has been detected.");
      }
      d();
    }).done();
  });



  it ("resume after pause", function(d) {
    wfe.resume$(caseobj.graph.id)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("pause after resume", function(d) {
    wfe.pause$(caseobj.graph.id)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("stop after pause", function(d) {
    wfe.stop$(caseobj.graph.id)
    .then(function() {
      console.log("Current status is " + wfe.get_status(caseobj.graph.id));
      d();
    }).done();
  });



  it ("resume after stop (exception)", function(d) {
    wfe.resume$(caseobj.graph.id)
    .catch(function(e) {
      if (e.$check === true) {
          console.log("Improperly call sequence has been detected.");
      }
      d();
    }).done();
  });


});
