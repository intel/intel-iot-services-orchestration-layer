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


var appstore = ES.create_appstore("memory");
var graphstore = ES.create_graphstore("memory");
var uistore = ES.create_uistore("memory");
var em = E.create_entity_manager({
  app_store:appstore,
  graph_store:graphstore,
  ui_store:uistore
});

var appbundlepath = B.path.join(__dirname, "./appbundle");

em.app__load_from_bundle$(appbundlepath)
.then(function(list) {
  console.log("==== load bundle ===");
  console.log("[changed_list]", list);
  console.log("[app_store]:", em.app_store.store.db);
  console.log("[graph_store]:", em.graph_store.store.db);
  console.log("[ui_store]:", em.ui_store.store.db);
  console.log("=============\n\n");
}).done(); // 2 apps and 4 graphs

setTimeout(function add_graph() {
  var graph = {
    id: "new_graph_1",
    name: "newgraph1",
    app: "app_001"
  };
  em.graph__add$(graph).then(function(list) {
    var graph_obj = em.graph_store.store.db[graph.id];
    console.log("==== add graph new_graph_1 ===");
    console.log("[changed_list]", list);
    console.log("[the app_001]:", em.app_store.store.db["app_001"]);//3 graphs
    console.log("[new graph in store]:", graph_obj);
    console.log("[new graph in disk]:", B.fs.read_json(graph_obj.path));
    console.log("=============\n\n");
  }).done();
}, 100);

setTimeout(function update_graph() {
  var graph = {
    id: "new_graph_1",
    name: "name_modified",
    description: "add description now",
    app: "app_001"
  };
  em.graph__update$(graph).then(function(list) {
    var graph_obj = em.graph_store.store.db[graph.id];
    console.log("==== update graph new_graph_1 ===");
    console.log("[changed_list]", list);
    console.log("[new graph in store]:", graph_obj);
    console.log("[new graph in disk]:", B.fs.read_json(graph_obj.path));
    console.log("=============\n\n");
  }).done();
}, 200);// name and description should be changed

setTimeout(function remove_graph() {
  em.graph__remove$("new_graph_1").then(function(list) {
    var graph_obj = em.graph_store.store.db["new_graph_1"];
    console.log("==== remove graph new_graph_1 ===");
    console.log("[changed_list]", list);
    console.log("[the graph]:", graph_obj);//undefiend
    console.log("[the app_001]:", em.app_store.store.db["app_001"]);//2 graphs
    console.log("=============\n\n");
  }).done();
}, 300);

setTimeout(function add_ui() {
  var ui = {
    id: "new_ui_1",
    name: "newui1",
    app: "app_001"
  };
  em.ui__add$(ui).then(function(list) {
    var ui_obj = em.ui_store.store.db[ui.id];
    console.log("==== add ui new_ui_1 ===");
    console.log("[changed_list]", list);
    console.log("[the app_001]:", em.app_store.store.db["app_001"]);//two uis
    console.log("[new ui in store]:", ui_obj);
    console.log("[new ui in disk]:", B.fs.read_json(ui_obj.path));
    console.log("=============\n\n");
  }).done();
}, 400);

setTimeout(function update_ui() {
  var ui = {
    id: "new_ui_1",
    name: "name_modified",
    description: "add description now",
    app: "app_001"
  };
  em.ui__update$(ui).then(function(list) {
    var ui_obj = em.ui_store.store.db[ui.id];
    console.log("==== update ui new_ui_1 ===");
    console.log("[changed_list]", list);
    console.log("[new ui in store]:", ui_obj);
    console.log("[new ui in disk]:", B.fs.read_json(ui_obj.path));
    console.log("=============\n\n");
  }).done();
}, 500);// name and description should be changed

setTimeout(function remove_ui() {
  em.ui__remove$("new_ui_1").then(function(list) {
    var ui_obj = em.ui_store.store.db["new_ui_1"];
    console.log("==== remove ui new_ui_1 ===");
    console.log("[changed_list]", list);
    console.log("[the ui]:", ui_obj);//undefiend
    console.log("[the app_001]:", em.app_store.store.db["app_001"]);//2 graphs
    console.log("=============\n\n");
  }).done();
}, 600);

setTimeout(function add_app() {
  var app = {
    id: "new_app_1",
    name: "newapp1"
  };
  var graph = {
    id: "new_graph_2",
    name: "newgraph2",
    app: "new_app_1"
  };
  var ui = {
    id: "new_ui_2",
    name: "newui2",
    app: "new_app_1"
  };
  em.app__add$(app, appbundlepath)
  .then(function(list) {
    console.log("==== add app new_app_1 ===");
    console.log("[changed_list]", list);
    var tasks = [];
    tasks.push(em.graph__add$(graph));
    tasks.push(em.ui__add$(ui));
    return Promise.all(tasks);
  })
  .then(function() {
    console.log("[new app in store]:", em.app_store.store.db[app.id]);
    console.log("=============\n\n");
  })
  .done();
}, 700);


setTimeout(function update_app() {
  var app = {
    id: "new_app_1",
    name: "newname!",
    description: "add the description!!"
  };
  em.app__update$(app)
  .then(function(list) {
    console.log("==== update app new_app_1 ===");
    console.log("[changed_list]", list);
    console.log("[updated app in store]:", em.app_store.store.db[app.id]);
    console.log("=============\n\n");
  })
  .done();// the name and description should be changed
}, 800);

setTimeout(function remove_app() {
  var app_id = "new_app_1";
  em.app__remove$(app_id)
  .then(function(list) {
    console.log("==== remove app new_app_1 ===");
    console.log("[changed_list]", list);
    console.log("[remove app in store]:", em.app_store.store.db[app_id]);
    console.log("=============\n\n");
  })
  .done();// undefined
}, 900);