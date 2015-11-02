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
/*eslint no-console:0*/
var B = require("hope-base");
var E = require("../index");
var ES = require("../../entity-store");


var specstore = ES.create_specstore("memory");
var specbundlestore = ES.create_specbundlestore("memory");
var hubstore = ES.create_hubstore("memory");
var thingstore = ES.create_thingstore("memory");
var servicestore = ES.create_servicestore("memory");
var graphstore = ES.create_graphstore("memory");
var appstore = ES.create_appstore("memory");
var uistore = ES.create_uistore("memory");

var em = E.create_entity_manager({
  spec_store:specstore, 
  specbundle_store:specbundlestore,
  hub_store:hubstore,
  thing_store:thingstore,
  service_store:servicestore,
  graph_store:graphstore,
  app_store:appstore,
  ui_store:uistore
});

var hub = {
  id: "hub1",
  name: "hub in sample",
  mnode: "no need",
  things: []
};

var specbundle = {
  name: "public specbundle in hub1",
  id: "public_specbundle1"
};

var thingbundle_path = B.path.join(__dirname, "./thingbundle");

em.hub_store.set$(hub.id, hub)
.then(function() {
  return em.thing__load_from_bundle$(thingbundle_path, specbundle, "hub1");
})
.then(function(list) {
  console.log("========= load from bundle =======");
  console.log("[changed_list]", list);
  console.log("[specbundle]:", em.specbundle_store.store.db);
  console.log("[spec]:", em.spec_store.store.db);
  console.log("[hub]:", em.hub_store.store.db);
  console.log("[thing]:", em.thing_store.store.db);
  console.log("[service]:", em.service_store.store.db);
}).done();

setTimeout(function() {
  em.thing__set_connect$("led1", false)
  .then(function(list) {
    console.log("========= set disconnect =======");
    console.log("[changed_list]", list);
    console.log("[thing]:", em.thing_store.store.db);
    console.log("[service]:", em.service_store.store.db);
  }).done();
}, 100);

setTimeout(function() {
  em.thing__remove_in_store$("led1")
  .then(function(list) {
    console.log("========= remove led1 =======");
    console.log("[changed_list]", list);
    console.log("[specbundle]:", em.specbundle_store.store.db);
    console.log("[spec]:", em.spec_store.store.db);
    console.log("[hub]:", em.hub_store.store.db);
    console.log("[thing]:", em.thing_store.store.db);
    console.log("[service]:", em.service_store.store.db);
  }).done();
}, 200);

/*
var service1 = {
  id: "new_service_001",
  name: "new_service_001",
  spec: {},
  thing: "sensor2",
  type: "hope_service"
};


setTimeout(function() {
  em.service__add_hope_service$(service1, specbundle)
  .then(function(list) {
    console.log("========= add_hope_service =======");
    console.log("[changed_list]", list);
    console.log("[specbundle]:", em.specbundle_store.store.db);
    console.log("[spec]:", em.spec_store.store.db);
    console.log("[thing]:", em.thing_store.store.db);
    console.log("[service]:", em.service_store.store.db);
  }).done();
}, 250);
*/

setTimeout(function() {
  em.get_full_info$()
  .then(function(list) {
    console.log("========= get full info =======");
    console.log("[full_list]", list);
    console.log("[specbundle]:", em.specbundle_store.store.db);
    console.log("[spec]:", em.spec_store.store.db);
    console.log("[hub]:", em.hub_store.store.db);
    console.log("[thing]:", em.thing_store.store.db);
    console.log("[service]:", em.service_store.store.db);
  }).done();
}, 300);


setTimeout(function() {
  em.hub__remove$("hub1")
  .then(function(list) {
    console.log("========= remove hub1 =======");
    console.log("[changed_list]", list);
    console.log("[specbundle]:", em.specbundle_store.store.db);
    console.log("[spec]:", em.spec_store.store.db);
    console.log("[hub]:", em.hub_store.store.db);
    console.log("[thing]:", em.thing_store.store.db);
    console.log("[service]:", em.service_store.store.db);
  }).done();
}, 400);


var hub2 = {
  id: "hub2",
  name: "hub2 in sample",
  mnode: "no need",
  things: []
};
setTimeout(function() {
  em.hub__add$(hub2)
  .then(function(list) {
    console.log("========= add hub2 =======");
    console.log("[changed_list]", list);
    console.log("[specbundle]:", em.specbundle_store.store.db);
    console.log("[spec]:", em.spec_store.store.db);
    console.log("[hub]:", em.hub_store.store.db);
    console.log("[thing]:", em.thing_store.store.db);
    console.log("[service]:", em.service_store.store.db);
  }).done();
}, 500);




