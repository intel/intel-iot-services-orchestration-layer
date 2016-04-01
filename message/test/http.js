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
var test = require("./lib/test");
var M = require("../index");
var B = require("hope-base");
var HTTPBroker = require("hope-http-broker");


var asm = B.assemble.create(M.$factories);
asm.add_factories(HTTPBroker.$factories);

before(function(d) {
  asm.assemble$({
    broker: {
      $type:"HTTPBroker",
      $params: {
        port: 18888
      }
    }
  }).then(function() {
    setTimeout(function() {
      asm.assemble$({
        n1: {
          $type: "MNode",
          $params: [{
            name: "n1",
            disable_local_broker: true,
            brokers: {
              type: "http",
              broker_url: "http://localhost:18888",
              my_port: 16666
            }
          }]
        },
        n2: {
          $type: "MNode",
          $params: [{
            name: "n2",
            disable_local_broker: true,
            brokers: {
              type: "http",
              broker_url: "http://localhost:18888",
              my_port: 16667
            }
          }]
        },
        n3: {
          $type: "MNode",
          $params: [{
            name: "n3",
            disable_local_broker: true,
            brokers: {
              type: "http",
              broker_url: "http://localhost:18888",
              my_port: 16668
            }
          }]
        }
      }).then(function(o) {
        test(o);
        d();
      }).done();
    }, 1000);
  });
});


// Should have at least 1 test in this file to ensure before is executed
describe("dummy", function() {
  it("dummy", function() {

  });
});

