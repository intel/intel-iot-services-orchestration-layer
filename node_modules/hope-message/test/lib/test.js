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

// nodes are created and initiated from external
// we will use n1, n2, n3 from it
module.exports = function(nodes) {
  B.check(_.isObject(nodes.n1), "test", "n1 should be an object");
  B.check(_.isObject(nodes.n2), "test", "n2 should be an object");
  B.check(_.isObject(nodes.n3), "test", "n3 should be an object");

  var n1 = nodes.n1, n2 = nodes.n2, n3 = nodes.n3;

  var dm1 = B.test.create_data_monitor("n1");
  var dm2 = B.test.create_data_monitor("n2");
  var dm3 = B.test.create_data_monitor("n3");
  var dm1_sub = B.test.create_data_monitor("n1_sub");
  var dm2_sub = B.test.create_data_monitor("n2_sub");
  var dm3_sub = B.test.create_data_monitor("n3_sub");
  var dm1_sub_all = B.test.create_data_monitor("n1_sub_all");
  var dm2_sub_all = B.test.create_data_monitor("n2_sub_all");
  var dm3_sub_all = B.test.create_data_monitor("n3_sub_all");

  // to avoid unexecept data being received
  function reject_all() {
    dm1.start_reject_data();
    dm2.start_reject_data();
    dm3.start_reject_data();
    dm1_sub.start_reject_data();
    dm2_sub.start_reject_data();
    dm3_sub.start_reject_data();
    dm1_sub_all.start_reject_data();
    dm2_sub_all.start_reject_data();
    dm3_sub_all.start_reject_data();
  }

  // register handlers here
  before(function(d) {
    this.enableTimeouts(false);

    reject_all();

    setTimeout(function() {
    var promises = [];

    promises.push(n1.enable_rpc$());
    promises.push(n2.enable_rpc$());
    promises.push(n3.enable_rpc$());
    
    promises.push(n1.accept$("test", dm1.on_data.bind(dm1)));
    promises.push(n2.accept$("test", dm2.on_data.bind(dm2)));
    promises.push(n3.accept$("test", dm3.on_data.bind(dm3)));


    promises.push(n1.subscribe$(n1.id, "test", dm1_sub.on_data.bind(dm1_sub)));
    promises.push(n1.subscribe$(n2.id, "test", dm1_sub.on_data.bind(dm1_sub)));
    promises.push(n1.subscribe$(n3.id, "test", dm1_sub.on_data.bind(dm1_sub)));

    // promises.push(n2.subscribe$(n1.id, "test", dm2_sub.on_data.bind(dm2_sub)));
    promises.push(n2.subscribe$(n2.id, "test", dm2_sub.on_data.bind(dm2_sub)));
    promises.push(n2.subscribe$(n3.id, "test", dm2_sub.on_data.bind(dm2_sub)));

    // promises.push(n3.subscribe$(n1.id, "test", dm3_sub.on_data.bind(dm3_sub)));
    // promises.push(n3.subscribe$(n2.id, "test", dm3_sub.on_data.bind(dm3_sub)));
    // promises.push(n3.subscribe$(n3.id, "test", dm3_sub.on_data.bind(dm3_sub)));


    promises.push(n1.subscribe_all$("test", dm1_sub_all.on_data.bind(dm1_sub_all)));
    promises.push(n2.subscribe_all$("test", dm2_sub_all.on_data.bind(dm2_sub_all)));
    promises.push(n3.subscribe_all$("test", dm3_sub_all.on_data.bind(dm3_sub_all)));

    Promise.all(promises).then(function() {
      setTimeout(function() {
        d();
      }, 500);   // leave sometime between above the the send/pub later
    }).done();

    }, 1000);
  });

  var timeout = 1500;

  describe("basic", function() {

    it("accept", function(d) {
      reject_all();
      B.test.expect_promise(d, 
        dm1.wait$(["send from n1", "send from n2", "send from n3"], false, timeout));
      n1.send$(n1.id, "test", "send from n1").done();
      n2.send$(n1.id, "test", "send from n2").done();
      n3.send$(n1.id, "test", "send from n3").done();
    });

    it("accept - fail", function(d) {
      reject_all();
      B.test.expect_promise_reject(d, 
        dm1.wait$(["send from n1", "send from n2", "send from n3"], false, timeout));
      n1.send$(n1.id, "test", "send from n1").done();
      n2.send$(n1.id, "test", "send from n2").done();
    });

    it("subscribe", function(d) {
      reject_all();
      B.test.expect_promise(d, 
        Promise.all([
          dm1_sub.wait$(["pub from n1", "pub from n2", "pub from n3"], false, timeout),
          dm2_sub.wait$(["pub from n2", "pub from n3"], false, timeout),
          dm1_sub_all.wait$(["pub from n1", "pub from n2", "pub from n3"], false, timeout),
          dm2_sub_all.wait$(["pub from n1", "pub from n2", "pub from n3"], false, timeout),
          dm3_sub_all.wait$(["pub from n1", "pub from n2", "pub from n3"], false, timeout)
        ]));
      n1.publish$("test", "pub from n1").done();
      n2.publish$("test", "pub from n2").done();
      n3.publish$("test", "pub from n3").done();
    });

    it("rpc", function(d) {
      reject_all();
      n1.define_rpc("test", function(a, b) {
        return a + b;
      });
      B.test.expect_promise(d, n2.invoke_rpc$(n1.id, "test", [1, 2]), 3);
      
    });

  });
};

