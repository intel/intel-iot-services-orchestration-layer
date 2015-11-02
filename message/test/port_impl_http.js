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
var test = require("./lib/test_port_impl");
var M = require("../index");
var S = require("hope-store");
var B = require("hope-base");


var __port = 16666;
var base_url = "http://localhost:" + __port;
var broker_url = base_url + "/broker";


var asm = B.assemble.create(M.$factories);

asm.add_factories(S.$factories);


var web_app = require("express")();

// Create the HTTP broker
M.impls.http.setup_app(web_app);
M.impls.http.create_broker_from_app(web_app, {url_path: "/broker"});

// Start the server
var server = require("http").createServer(web_app); // http server
server.listen(__port);


// Create Ports for each node
function gen_port_json(node_name) {
  var p = "/nodes/" + node_name;
  return {
    accept: [{
      name: "http_test",
      impl: "http",
      config: {
        app: "$web_app",
        base_url: base_url,
        path: p + "/accept",
        broker_url: broker_url
      }
    }],
    send: [{
      name: "http_test",
      impl: "http",
      config: {
        broker_url: broker_url
      }
    }],
    subscribe: [{
      name: "http_test",
      impl: "http",
      config: {
        app: "$web_app",
        base_url: base_url,
        path: p + "/subscribe",
        path_for_all: p + "/subscribe_all",
        broker_url: broker_url
      }
    }],
    publish: [{
      name: "http_test",
      impl: "http",
      config: {
        broker_url: broker_url
      }
    }]
  };
}

// Don't use default auto router. Instead, we force to select the http port
var route_rule_param = [{
  $type: "RouteRule",
  $params: ["select", {
    name: "http_test",
    impl: "http"
  }]
}];

before(function(d) {
  // wait for the broker to be ready
  setTimeout(function() {
    asm.assemble$({
      route_table: {
        $type: "RouteTable",
        $params: {
          $type: "Store",
          $params: "memory"
        }
      },
      router: {
        $type: "Router",
        $params: ["$route_table", {
          rules: {
            send: route_rule_param,
            subscribe: route_rule_param,
            subscribe_all: route_rule_param,
            publish: route_rule_param
          }
        }]
      },
      n1: {
        $type: "MNode",
        $params: ["$router", {
          name: "n1",
          ports: gen_port_json("n1")
        }]
      },
      n2: {
        $type: "MNode",
        $params: ["$router", {
          name: "n2",
          ports: gen_port_json("n2")
        }]
      },
      n3: {
        $type: "MNode",
        $params: ["$router", {
          name: "n3",
          ports: gen_port_json("n3")
        }]
      }
    }, {
      web_app: web_app
    }).then(function(o) {
      test(o);
      d();
    });
  }, 500);

});



// Should have at least 1 test in this file to ensure before is executed
describe("dummy", function() {
  it("dummy", function() {

  });
});
