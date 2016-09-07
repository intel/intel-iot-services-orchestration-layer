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
/*eslint no-console:0*/
var B = require("hope-base");
var E = require("../index");
var ES = require("../../entity-store");
var Updater = require("../lib/update");
var log = B.log;

var appstore = ES.create_appstore("memory");
var graphstore = ES.create_graphstore("memory");
var uistore = ES.create_uistore("memory");
var specstore = ES.create_specstore("memory");
var specbundlestore = ES.create_specbundlestore("memory");
var servicestore = ES.create_servicestore("memory");
var thingstore = ES.create_thingstore("memory");
var hubstore = ES.create_hubstore("memory");

var em = E.create_entity_manager({
  app_store:appstore, 
  graph_store:graphstore,
  spec_store:specstore,
  specbundle_store:specbundlestore,
  service_store:servicestore,
  thing_store:thingstore,
  hub_store:hubstore,
  ui_store:uistore
});

var U = Updater.create_updater(em);

var original_list = [
  {
    type:"hub",
    cmd: "set",
    id: "hub1",
    obj: "hub1-first"
  },
  {
    type:"hub",
    cmd: "set",
    id: "hub2",
    obj: "hub2-first"
  },
  {
    type:"hub",
    cmd: "set",
    id: "hub1",
    obj: "hub1-second"
  },
  {
    type:"hub",
    cmd: "set",
    id: ["hub2", "hub3"],
    obj: ["hub2-second", "hub3-first"]
  },
  {
    type:"hub",
    cmd: "set",
    id: "hub3",
    obj: "hub3-second"
  },
  {
    type:"app",
    cmd: "set",
    id: "app1",
    obj: "app1-first"
  },
  {
    type:"app",
    cmd: "set",
    id: ["app2", "app3"],
    obj: ["app2-first", "app3-first"]
  },
  {
    type:"thing",
    cmd: "delete",
    id: "thing1",
    obj: "thing1-first"
  },
  {
    type:"thing",
    cmd: "delete",
    id: ["thing2", "thing3"],
    obj: ["thing2-first", "thing3-first"]
  },
  {
    type:"ui",
    cmd: "delete",
    id: ["ui1", "ui2"],
    obj: ["ui1-first", "ui2-first"]
  }
];

var optimized_list = U.organize_list(original_list);
log("sample", "optimized_list", optimized_list);






var list1 = [
  {
    type: "hub",
    cmd: "set",
    id: ["hub1", "hub2"],
    obj: [{
      id: "hub1",
      name: "hub1",
      things: ["thing1", "thing2"],
      mnode: "mnode"
    },
    {
      id: "hub2",
      name: "hub2",
      things: ["thing3"],
      mnode: "mnode"
    }]
  },
  {
    type: "app",
    cmd: "set",
    id: "app1",
    obj: {
      id: "app1",
      name: "app1",
      graphs: ["graph1"],
      uis: ["ui1"],
      is_builtin: true,
      path: "path1"
    }
  },
  {
    type: "graph",
    cmd: "set",
    id: "graph1",
    obj: {
      id: "graph1",
      name: "graph1",
      app: "app1",
      path: "path1"
    }
  },
  {
    type: "ui",
    cmd: "set",
    id: "ui1",
    obj: {
      id: "ui1",
      name: "ui1",
      app: "app1",
      path: "path1"
    }
  },
  {
    type: "spec",
    cmd: "set",
    id: "spec1",
    obj: {
      id: "spec1",
      name: "spec1",
      specbundle : "specbundle1",
      path: "path1"
    }
  },
  {
    type: "specbundle",
    cmd: "set",
    id: "specbundle",
    obj: {
      id: "specbundle",
      name: "specbundle",
      specs : ["spec1"],
      path: "path1"
    }
  },
  {
    type: "thing",
    cmd: "set",
    id: "thing1",
    obj: {
      id: "thing1",
      name: "thing1",
      services : ["service1"],
      hub: "hub1",
      path: "path1",
      is_connect: true
    }
  },
  {
    type: "thing",
    cmd: "set",
    id: "thing2",
    obj: {
      id: "thing2",
      name: "thing2",
      services : [],
      hub: "hub1",
      path: "path1",
      is_connect: true
    }
  },
  {
    type: "thing",
    cmd: "set",
    id: "thing3",
    obj: {
      id: "thing3",
      name: "thing3",
      services : [],
      hub: "hub2",
      path: "path1",
      is_connect: true
    }
  },
  {
    type: "service",
    cmd: "set",
    id: "service1",
    obj: {
      id: "service1",
      name: "service1",
      thing: "thing1",
      spec: "spec1",
      path: "path1",
      is_connect: true,
      own_spec: false
    }
  }
];
setTimeout(function() {
  var optimized_list1 = U.organize_list(list1);
  log("sample", "optimized_list1", optimized_list1);
  em.update$(optimized_list1)
  .then(function() {
    console.log("hub_store", em.hub_store.store.db);
    console.log("thing_store", em.thing_store.store.db);
    console.log("service_store", em.service_store.store.db);
    console.log("specbundle_store", em.specbundle_store.store.db);
    console.log("spec_store", em.spec_store.store.db);
    console.log("app_store", em.app_store.store.db);
    console.log("graph_store", em.graph_store.store.db);
    console.log("ui_store", em.ui_store.store.db);
  }).done();
}, 100);

var list2 = [
  {
    type: "hub",
    cmd: "set",
    id: ["hub1", "hub2"],
    obj: [
      {
        id: "hub1",
        name: "hub1",
        things: ["thing2"],
        mnode: "mnode"
      },
      {
        id: "hub2",
        name: "hub2",
        things: ["thing4"],
        mnode: "mnode"
      }]
  },
  {
    type: "thing",
    cmd: "delete",
    id: ["thing3", "thing1"]
  },
  {
    type: "service",
    cmd: "delete",
    id: "service1"
  },
  {
    type: "thing",
    cmd: "set",
    id: "thing4",
    obj: {
      id: "thing4",
      name: "thing4",
      services : [],
      hub: "hub2",
      path: "path1",
      is_connect: true
    }    
  }
];

setTimeout(function() {
    var optimized_list2 = U.organize_list(list2);
    log("sample", "optimized_list2", optimized_list2);
    em.update$(optimized_list2).then(function() {
      console.log("hub_store", em.hub_store.store.db);
      console.log("thing_store", em.thing_store.store.db);
      console.log("service_store", em.service_store.store.db);
      console.log("specbundle_store", em.specbundle_store.store.db);
      console.log("spec_store", em.spec_store.store.db);
      console.log("app_store", em.app_store.store.db);
      console.log("graph_store", em.graph_store.store.db);
  }).done();
}, 200);