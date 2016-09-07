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
var chai = require("chai");
var spawn = require("child_process").spawn;
var fork = require("child_process").fork;
var Center = require("../index");
var _ = require("lodash");
chai.should();

var broker_child;
var config_path = B.path.abs("../samples/config.json", __filename);
var broker_file = B.path.abs("../start_http_broker.js", __filename);
var hub_exe =  B.path.abs("../../hub/hub", __filename);
var hub_config_path = B.path.abs("../../hub/samples/config.json", __filename);
var config = B.fs.read_json(config_path);

describe("basic_connection >", function() {


  this.timeout(50000);
  function open_broker(d) {
    broker_child = spawn("node", [broker_file]);
    setTimeout(d, 1000);
  }
  
  function close_broker(d) {
    broker_child.kill();
    setTimeout(d, 1000);
  }


  describe("center with builtin hub >>", function() {
    var center;
    var id = "center_test_01_01";
    before("open http broker", open_broker);
    after("close http broker", close_broker);
    it("center start", function(d) {
      Center.start$({
        id: id,
        assemble: config.assemble,
        config_path: config_path
      }).then(function(objs) {
        center = objs.center;
        center.id.should.equal(id);
        center.type.should.equal("Center");
        center.built_in_hub.type.should.equal("Hub");//builtin hub is created
        center.heartbeat_server.check_timer.should.not.null;//hb server is enabled
        return new Promise(function(resolve) {
          setTimeout(function() {
            _.size(center.em.hub_store.store.db).should.equal(1, "the builtin_hub should in the center.em");//builtin hub is connected with center
            center.em.hub_store.store.db[center.built_in_hub.id].should.not.undefined;
            d();
            resolve();
          }, 1000);
        });
      }).done();
    });

    it("center leave", function(d) {
      center.leave$()
      .then(function() {
        _.isNull(center.heartbeat_server.check_timer).should.true;
        return new Promise(function(resolve) {
          setTimeout(function() {
            _.size(center.em.hub_store.store.db).should.equal(0, "the builtin_hub still in the center.em");//builtin hub is connected with center
            d();
            resolve();
          }, 1000);
        });
      }).done();
    });
  });



  describe("center connect with another hub, center first >>", function() {
    var center;
    var id = "center_test_01_02";
    var hub_child;
    before("open http broker", open_broker);
    after("close http broker", close_broker);
    it("center start then hub start", function(d) {
      Center.start$({
        id: id,
        assemble: config.assemble,
        config_path: config_path
      })
      .then(function(objs) {
        center = objs.center;
        hub_child = fork(hub_exe, [hub_config_path], {silent:true});
        return new Promise(function(resolve) {
          setTimeout(function() {
            _.size(center.em.hub_store.store.db).should.equal(2, "the builtin_hub and new hub should in the center.em");
            d();
            resolve();
          }, 5000);
        });
      }).done();
    });

    it("hub leave", function(d) {
      hub_child.send("exit");
      setTimeout(function() {
        _.size(center.em.hub_store.store.db).should.equal(1, "the new hub should leaves");
        center.leave$().then(function() {
          d();
        }).done();
      }, 2000);
    });
  });

  describe("center connect with another hub, hub first >>", function() {
    var center;
    var id = "center_test_01_03";
    var hub_child;
    before("open http broker", open_broker);
    after("close http broker", close_broker);
    it("hub start then center start", function(d) {
      hub_child = fork(hub_exe, [hub_config_path], {silent:true});
      setTimeout(function() {
        Center.start$({
          id: id,
          assemble: config.assemble,
          config_path: config_path
        }).then(function(objs) {
          center = objs.center;
          return new Promise(function(resolve) {
            setTimeout(function() {
              _.size(center.em.hub_store.store.db).should.equal(2, "the builtin_hub and new hub should in the center.em");
              d();
              resolve();
            }, 3000);
          });
        }).done();
      }, 3000);
    });

    it("hub leave", function(d) {
      hub_child.send("exit");
      setTimeout(function() {
        _.size(center.em.hub_store.store.db).should.equal(1, "the new hub should leaves");
        center.leave$().then(function() {
          d();
        }).done();
      }, 2000);
    });
  });
  
});