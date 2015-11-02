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
var M = require("../index");
var S = require("hope-store");
var B = require("hope-base");

var asm = B.assemble.create({
  Store: S.create_store,
  RouteTable: M.create_route_table,
  Router: M.create_router,
  MNode: M.create_mnode
});

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
    $params: "$route_table"
  },
  n1: {
    $type: "MNode",
    $params: "$router"
  },
  n2: {
    $type: "MNode",
    $params: "$router"
  },
  n3: {
    $type: "MNode",
    $params: "$router"
  }
}).then(function(oo) {
  /*
  var route_table = M.create_route_table(S.create_store("memory"));
  var router = M.create_router(route_table);

  var n1 = M.create_mnode(router);
  var n2 = M.create_mnode(router);
  var n3 = M.create_mnode(router);
  */
  var n1 = oo.n1;
  var n2 = oo.n2;
  var n3 = oo.n3;


  //----------------------------------------------------------------
  // n1
  //----------------------------------------------------------------

  n1.accept$("test", function(x) {
    console.log("N1 | accept_test_1\t", x);
  }).done();

  n1.accept$("test", function(x) {
    console.log("N1 | accept_test_2\t", x);
  }).done();

  n1.subscribe$(n2.id, "test", function(x) {
    console.log("N1 | sub_test_n2\t", x);
  }).done();

  n1.subscribe_all$("test", function(x) {
    console.log("N1 | sub_test_all\t", x);
  }).done();


  //----------------------------------------------------------------
  // n2
  //----------------------------------------------------------------

  n2.accept$("test", function(x) {
    console.log("N2 | accept_test_1\t", x);
  }).done();

  n2.accept$("test", function(x) {
    console.log("N2 | accept_test_2\t", x);
  }).done();

  n2.subscribe$(n2.id, "test", function(x) {
    console.log("N2 | sub_test_n2\t", x);
  });

  n2.subscribe_all$("test", function(x) {
    console.log("N2 | sub_test_all\t", x);
  });


  function run() {

    // Expect to see: 1|accept_test_1, 1|accept_test_2
    n2.send$(n1.id, "test", "send from n2").done();
    // Expect to see: 1|accept_test_1, 1|accept_test_2
    n3.send$(n1.id, "test", "send from n3").done();


    // Expect to see: 2|accept_test_1, 2|accept_test_2
    n2.send$(n2.id, "test", "send from n2").done();
    // Expect to see: 2|accept_test_1, 2|accept_test_2
    n3.send$(n2.id, "test", "send from n3").done();


    // Expect to see: 1|sub_test_n2, 1|sub_test_all, 2|sub_test_n2, 2|sub_test_all
    n2.publish$("test", "publish from n2").done();
    // Expect to see: 1|sub_test_all, 2|sub_test_all
    n3.publish$("test", "publish from n3");
  }


  //run();
  setTimeout(run, 0);
  
});

