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


var ES = require("../../entity-store");
var E = require("../../entity");
var M = require("../../message");
var B = require("hope-base");
var S = require("../../store");

var SM = require("../index");
var log = B.log.for_category("sm_sample");

//create mnode
var route_table = M.create_route_table(S.create_store("memory"));
var router = M.create_router(route_table);
var mnode_master = M.create_mnode(router);
var mnode_slave = M.create_mnode(router);

//create the em, service_store and service_obj, hub_store, hub_object
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
var hub_object = {
  id: "sm_hub1",
  name: "sm_hub",
  things: [],
  mnode: mnode_slave.id
};
var service_store = ES.create_servicestore("memory");
service_store.set$(service_obj.id, service_obj).done();
var hub_store = ES.create_hubstore("memory");
hub_store.set$(hub_object.id, hub_object).done();

var em = E.create_entity_manager({service_store:service_store, hub_store:hub_store});



var sm;
var wa;
//create sm
SM.create_session_manager$({em:em, mnode:mnode_slave})
.then(function(obj) {
  sm = obj;
}).done();
//create wfe_agent
SM.create_wfe_agent$({em:em, mnode:mnode_master})
.then(function(obj) {
  wa = obj;
}).done();



//create handler
var workflow_id = "wid";
var session_id = "sm_case1_001";
var bindings = {
  hub_id: "sm_hub1",
  thing_id: "no_need",
  service_id: "sm_case1"
};
var handler_object = {};
handler_object.out_handler = function(value) {
  console.log("out value:", value);
};
handler_object.err_handler = function(value) {
  console.log("err value", value);
};
handler_object.install_handler = function(value) {
  console.log("install value", value);
};
handler_object.uninstall_handler = function(value) {
  console.log("uninstall value", value);
};
handler_object.pause_handler = function(value) {
  console.log("pause value", value);
};
handler_object.resume_handler = function(value) {
  console.log("resume value", value);
};



setTimeout(function () {
  wa.register_cb(workflow_id, session_id, handler_object);
  wa.install(workflow_id, session_id, bindings); //value: 1000
}, 100);

setTimeout(function () {
  wa.resume(workflow_id, session_id, bindings); // value: resume
}, 200);

setTimeout(function () {
  wa.after_resume(workflow_id, session_id, bindings); //OUT: agterResume
}, 300);

setTimeout(function () {
  var msg = {};
  msg.meta = {};
  msg.meta.bindings = bindings;
  msg.meta.wid = workflow_id;
  msg.meta.tags = {A:"aaa", B:"bbb"};
  msg.meta.cid = session_id;
  msg.meta.wid = workflow_id;
  msg.payload = {IN:{num:2}};
  wa.kernel(msg);
}, 400); //OUT: 1002
          //ERR: case1hubab
setTimeout(function () {
  var msg = {};
  msg.meta = {};
  msg.meta.bindings = bindings;
  msg.meta.wid = workflow_id;
  msg.meta.tags = {A:"aaa", B:"bbb"};
  msg.meta.cid = session_id;
  msg.meta.wid = workflow_id;
  msg.payload = {IN:{num:2}};
  wa.kernel(msg);
}, 500); //OUT: 1004
          //ERR: case1case1hubabab

setTimeout(function () {
  wa.pause(workflow_id, session_id, bindings); //value: undefined
}, 600);

setTimeout(function () {
  wa.uninstall(workflow_id, session_id, bindings); //value:case1case1hubabab
}, 700);




