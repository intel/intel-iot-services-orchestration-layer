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
var ES = require("../../entity-store");
var E = require("../../entity");
var M = require("../../message");
var B = require("hope-base");
var S = require("../../store");
var SM = require("../index");
var log = B.log.for_category("sm_sample");
//create the em, service_store and service_obj
var service_obj = {
  id: "sm_case1",
  name: "case1",
  spec: "no_need",
  thing: "no_need",
  path: B.path.resolve(__dirname, "./case/case1"),
  is_connect: true,
  own_spec: false,
  type: "hope_service"
};
var service_store = ES.create_servicestore("memory");
service_store.set$(service_obj.id, service_obj).done();
var em = E.create_entity_manager({service_store:service_store});


//create mnode
var route_table = M.create_route_table(S.create_store("memory"));
var router = M.create_router(route_table);
var mnode_master = M.create_mnode(router);
var mnode_slave = M.create_mnode(router);


function _new_id() {
  return B.unique("invocation_");
}

//create sm
var sm;
SM.create_session_manager$({em:em, mnode:mnode_slave}).
then(function(obj) {
  sm = obj;
}).done();

var service_id = "sm_case1";
setTimeout(function() {
  console.log("\n\n====INSTALL & UNINSTALL START");
  SM.install_service$(sm, service_id)
  .then(function(value) {
    console.log("install service ret:", value); //case1
    return SM.uninstall_service$(sm, service_id);
  })
  .then(function(value) {
    console.log("uninstall service ret:", value); //case1
    console.log("is in cache?", sm.service_cache.has(service_id)); //false
    console.log("=====INSTALL & UNINSTALL DONE!\n\n");
  })
  .done();
}, 500);

setTimeout(function() {
  console.log("\n\n====CREATE & GET & DELETE & GET");
  var session_id = service_id + "_001";
  SM.create_session$(sm, session_id, service_id, null)
  .then(function() {
    return SM.get_session$(sm, session_id);
  })
  .then(function(session) {
    console.log("session is:", session); // session obj
    return SM.delete_session$(sm, session_id);
  })
  .then(function() {
    return SM.get_session$(sm, session_id);
  })
  .then(function(session) {
    console.log("session is:", session); // undefined
    console.log("====CREATE & GET & DELETE & GET DONE!\n\n");
  })
  .done();
}, 1000);


var session_id = service_id + "_002";

setTimeout(function() {
  console.log("\n\n====MESSAGE TRIGGER");
  var tasks = [];
  tasks.push(mnode_master.accept$("session_invoke_ret", function(msg, topic, from) {
    console.log("message accept", msg, topic, from);
  }));
  tasks.push(mnode_master.accept$("session_send", function(msg, topic, from) {
    console.log("message accept", msg, topic, from);
  }));
  Promise.all(tasks).then(function() {
    SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
      session_id, _new_id(), "start", {service_id:service_id});
  }).done();
}, 2000);

setTimeout(function() {
  SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
   session_id, _new_id(), "resume");
}, 2100);

setTimeout(function() {
  SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
   session_id, _new_id(), "after_resume");
}, 2200);

setTimeout(function() {
  SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
   session_id, _new_id(), "kernel", {IN:{num:1}});
}, 2300);

setTimeout(function() {
  SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
   session_id, _new_id(), "kernel", {IN:{num:1}});
}, 2400);

setTimeout(function() {
  SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
   session_id, _new_id(), "pause");
}, 2500);

setTimeout(function() {
  SM.send_invoke_cmd$(mnode_master, mnode_slave.id,
   session_id, _new_id(), "stop");
}, 2600);

