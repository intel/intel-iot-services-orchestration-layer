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
var ES = require("hope-entity-store");
var E = require("hope-entity");
var M = require("hope-message");
var B = require("hope-base");
var S = require("hope-store");
var SM = require("../index");
var _ = require("lodash");

var chai = require("chai");
chai.should();

describe("sm base for hope service > ", function() {

  var service_id = "service_sm_test_1";
  var service_obj = {
    id: service_id,
    name: "test1",
    spec: "no_need",
    thing: "no_need",
    path: B.path.resolve(__dirname, "./service/service1"),
    is_connect: true,
    own_spec: false,
    type: "hope_service",
    config: 1 
  };

  var service_store = ES.create_servicestore("memory");
  var em = E.create_entity_manager({service_store:service_store});
  //create mnode
  var route_table = M.create_route_table(S.create_store("memory"));
  var router = M.create_router(route_table);
  var mnode_master = M.create_mnode(router);
  var mnode_slave = M.create_mnode(router);// the mnode in sm
  var sm;

  before(function(d) {
    var service_empty_obj = {
      id: "service_empty",
      name: "test1_empty",
      spec: "no_need",
      thing: "no_need",
      path: B.path.resolve(__dirname, "./service/empty"),
      is_connect: true,
      own_spec: false,
      type: "hope_service"
    };
    service_store.set$(service_obj.id, service_obj)
    .then(function() {
      return service_store.set$(service_empty_obj.id, service_empty_obj);
    })
    .then(function() {
      d();
    }).done();
  });

  describe("service operation >>", function() {
    var service_init_done_expect = "test1_service_init";
    var service_init_shared_expect = {name:"test1_service_name"};
    var service_init_hub_shared_expect = {txt:"hub"};
    var service_destroy_done_expect = service_init_shared_expect.name;
    it("create sm >>>", function(d) {
      SM.create_session_manager$({em:em, mnode:mnode_slave})
      .then(function(obj) {
        sm = obj;
        sm.type.should.equal("SessionManager");
        sm.em.should.equal(em);
        sm.mnode.should.equal(mnode_slave);
        sm.session_cache.type.should.equal("SessionCache");
        sm.service_cache.type.should.equal("ServiceCache");
        d();
      }).done();
    });

    it("install service >>>", function(d) {
      SM.install_service$(sm, service_id)
      .then(function(value) {
        value.should.equal(service_init_done_expect);
        sm.service_cache.db.should.contain.key(service_id);
        sm.session_cache.db.should.deep.equal({});
        sm.service_cache.db[service_id].is_inited.should.equal(true);
        d();
      }).done();
    });

    it("service_shared and hub_shared >>>", function(d) {
      sm.service_cache.db[service_id].shared.should.deep.equal(service_init_shared_expect);
      sm.service_cache.db[service_id].hub_shared.should.deep.equal(service_init_hub_shared_expect);
      SM.install_service$(sm, "service_empty")
      .then(function() {
        sm.service_cache.db["service_empty"].shared.should.deep.equal({});
        sm.service_cache.db["service_empty"].hub_shared.should.deep.equal(service_init_hub_shared_expect);
        d();
      }).done();
    });

    it("uninstall service >>>", function(d) {
      SM.uninstall_service$(sm, service_id)
      .then(function(value) {
        value.should.equal(service_destroy_done_expect);
        sm.service_cache.db.should.not.include.key(service_id);
        d();
      }).done();
    });

  });

  describe("session operation >>", function() {
    var session_id = service_id + "_SESSION_" + "01";
    var others = {
      IN: {num:10},
      mnode: mnode_slave,
      dst_mnode_id: mnode_master.id
    };
    var start_done_expect = 1000;
    var resume_done_expect = "resume";
    var after_resume_sendout_expect = {
      session_id: session_id,
      action: "after_resume",
      is_error: false,
      tags: undefined,
      value: 1000
    };

    afterEach("clean mnode_master's accept", function(d) {
      mnode_master.clean_accepts$().then(function() {
        d();
      });
    });

    it("create session >>>", function(d) {
      var s;
      SM.create_session$(sm, session_id, service_id, mnode_master.id)
      .then(function(session) {
        s = session;
        sm.service_cache.db.should.contain.key(service_id);
        sm.session_cache.db[session_id].should.equal(session);
        session.id.should.equal(session_id);
        session.service.should.equal(service_id);
        session.status.should.equal("idle");
        session.is_status_stable.should.equal(true);
        session.mnode.should.equal(mnode_master.id);
        return SM.get_session$(sm, session_id);
      }).then(function(session) {
        session.should.equal(s);
        d();
      }).done();
    });

    it("session start >>>", function(d) {
      SM.invoke_session$(sm, session_id, "start", others)
      .then(function(value) {
        value.should.equal(start_done_expect);
        sm.session_cache.db[session_id].status.should.equal("paused");
        sm.session_cache.db[session_id].is_status_stable.should.equal(true);
        d();
      }).done();
    });

    it("session resume >>>", function(d) {
      SM.invoke_session$(sm, session_id, "resume", others)
      .then(function(value) {
        value.should.equal(resume_done_expect);
        sm.session_cache.db[session_id].status.should.equal("sending");
        sm.session_cache.db[session_id].is_status_stable.should.equal(true);
        d();
      }).done();
    });

    it("session after_resume >>>", function(d) {

      mnode_master.accept$("session_send", function(msg) {
        msg.should.deep.equal(after_resume_sendout_expect);
        d();
      }).then(function() {
        return SM.invoke_session$(sm, session_id, "after_resume", others);
      }).done();
    });

    it("kernel 2 times >>>", function(d) {
      var dm = B.test.create_data_monitor("kernel");
      dm.start_reject_data();
      var data_expect = [
      {
        session_id: session_id,
        action: "kernel",
        is_error: false,
        tags: undefined,
        value: 1011
      },
      {
        session_id: session_id,
        action: "kernel",
        is_error: true,
        tags: undefined,
        value: 'test1_service_namehubab'
      },
      {
        session_id: session_id,
        action: "kernel",
        is_error: false,
        tags: undefined,
        value: 1022
      },
      {
        session_id: session_id,
        action: "kernel",
        is_error: true,
        tags: undefined,
        value: 'test1_service_nametest1_service_namehubabab'
      }
      ];
      dm.wait$(data_expect, true).then(function() {
        d();
      }).done();
      mnode_master.accept$("session_send", function(msg) {
        dm.on_data(msg);
      }).then(function() {
        return SM.invoke_session$(sm, session_id, "kernel", others);
      }).then(function() {
        return SM.invoke_session$(sm, session_id, "kernel", others);
      }).done();
    });

    it("session pause (default) >>>", function(d) {
      SM.invoke_session$(sm, session_id, "pause", others)
      .then(function(value) {
        _.isUndefined(value).should.equal(true);
        sm.session_cache.db[session_id].status.should.equal("paused");
        sm.session_cache.db[session_id].is_status_stable.should.equal(true);
        d();
      }).done();
    });

    it("session stop >>>", function(d) {
      var stop_done_expect = 'test1_service_nametest1_service_namehubabab';
      SM.invoke_session$(sm, session_id, "stop", others)
      .then(function(value) {
        value.should.equal(stop_done_expect);
        sm.session_cache.db[session_id].status.should.equal("idle");
        sm.session_cache.db[session_id].is_status_stable.should.equal(true);
        d();
      }).done();
    });




  });


















});