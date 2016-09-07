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
var E = require("../index.js");
var ES = require("../../entity-store");
var B = require("hope-base");
var _ = require("lodash");
var assert = require("assert");



describe("app/graph/ui add/remove/list/get", function() {
  //create app_store,graph_store,ui_store
  var appstore;
  var graphstore;
  var uistore;
  var em;

  before("create_entity_manager", function(d) {
    ES.create_appstore$("memory").then(function(obj1) {
      appstore = obj1;
      return ES.create_graphstore$("memory");
    }).then(function(obj2) {
      graphstore = obj2;
      return ES.create_uistore$("memory");
    }).then(function(obj3) {
      uistore = obj3;
      em = E.create_entity_manager({
        app_store : appstore,
        graph_store : graphstore,
        ui_store : uistore
      });
      d();
    }).done();
  });

  var appbundle_path = B.path.join(__dirname, "./app_bundle");


  //app_add and app_remove
  var app_add_array = {};

  var new_app1 = {
    id: 'new_app_1',
    name: 'newapp1',
    //description: undefined,
    path: B.path.join(appbundle_path, '/new_app_1'),
   
   // main_ui: undefined,
    graphs: [],
    uis: [],
    is_builtin: false
  };

  var new_app2 = 
  {
    id: 'new_app_2',
    name: 'newapp1',
    //description: undefined,
    path: B.path.join(appbundle_path, '/new_app_2'),
    //main_ui: undefined,
    graphs: [],
    uis: [],
    is_builtin: false 
  };

  var new_app3 =
  {
    id: 'new_app_3',
    name: 'newapp1',
    //description: undefined,
    path: B.path.join(appbundle_path, '/new_app_3'),
    //main_ui: undefined,
    graphs: [],
    uis: [],
    is_builtin: false
  };

  var app_in_store_0 = 
  {
    new_app_1: new_app1
  };

  var app_in_store_1 = 
  {
    new_app_1: new_app1, 
    new_app_2: new_app2
  };


  var app_in_store_2 = 
  {
    new_app_1: new_app1,
    new_app_2: new_app2,
    new_app_3: new_app3
  };

  var app_in_store_array = [app_in_store_0, app_in_store_1, app_in_store_2];
  var app_in_store_array1 = [new_app1, new_app2, new_app3];

  it("app__add$", function(d) {
      app_add_array = [
      {
        id: "new_app_1",
        name: "newapp1"
      },
      {
        id: "new_app_2",
        name: "newapp1"
      },
      {
        id: "new_app_3",
        name: "newapp1"
      }
    ];

    var count = 0;
    for (var i = 0; i < app_add_array.length; i++) {
      (function(index) {
        em.app__add$(app_add_array[index], appbundle_path).then(function() {
          em.app__get$(app_add_array[index].id).then(function(v) {
            assert.equal(_.isEqual(v, app_in_store_array1[index]), true);
          });
          assert.equal(_.isEqual(em.app_store.store.db, app_in_store_array[index]), true);
          assert.equal(_.isEqual(em.graph_store.store.db, {}), true);
          assert.equal(_.isEqual(em.ui_store.store.db, {}), true);
          count++;
          if (count === app_add_array.length)
            d();
        }).done();
      })(i);
    }
  });


  it("app_remove$", function(d) {
    
    var count = 0;
    for (var i = app_add_array.length - 1; i >= 0; i--) {
      (function(index) {
        em.app__remove$(app_add_array[index].id).then(function() { 
          count++;
          if (index !== 0) {
            assert.equal(_.isEqual(em.app_store.store.db, app_in_store_array[index - 1]), true);
            
          }
          else {
            assert.equal(_.isEqual(em.app_store.store.db, {}), true);
          }
          assert.equal(_.isEqual(em.graph_store.store.db, {}), true);
          assert.equal(_.isEqual(em.ui_store.store.db, {}), true);
          if (count === app_add_array.length)
            d();
        }).done();
      })(i);
    }
  });


  var graph_in_store = {};
  var ui_in_store = {};
  var app_in_store = {};
  it("app_load_from_bundle$", function(d) {
    
    app_in_store = { 
    app1: 
    {
      id: 'app1',
      name: 'myapp1',
      //description: undefined,
      path: B.path.join(appbundle_path, '/app1'),
      //main_ui: undefined,
      graphs: [ 'graph_001', 'graph_002' ],
      uis: [ 'ui_001', 'ui_002' ],
      is_builtin: false 
    },
    app2: 
    {
      id: 'app2',
      name: 'myapp2',
      //description: undefined,
      path: B.path.join(appbundle_path, '/app2'),
      //main_ui: undefined,
      graphs: [ 'graph_003', 'graph_004' ],
      uis: [ 'ui_003', 'ui_004' ],
      is_builtin: false 
    }
  };

   graph_in_store = { graph_001: 
   { id: 'graph_001',
     name: 'mygraph001',
     app: 'app1',
     path: B.path.join(appbundle_path, '/app1/graphs/graph_001.json') },
  graph_002: 
   { id: 'graph_002',
     name: 'mygraph002',
     app: 'app1',
     path: B.path.join(appbundle_path, '/app1/graphs/graph_002.json') },
  graph_003: 
   { id: 'graph_003',
     name: 'mygraph003',
     app: 'app2',
     path: B.path.join(appbundle_path, '/app2/graphs/graph_003.json') },
  graph_004: 
   { id: 'graph_004',
     name: 'mygraph004',
     app: 'app2',
     path: B.path.join(appbundle_path, '/app2/graphs/graph_004.json') } 
  };

  ui_in_store = { 
  ui_001: 
   { id: 'ui_001',
     name: 'myui001',
     path: B.path.join(appbundle_path, '/app1/uis/ui_001.json'),
     app: 'app1' },
  ui_002: 
   { id: 'ui_002',
     name: 'myui002',
     path: B.path.join(appbundle_path, '/app1/uis/ui_002.json'),
     app: 'app1' },
  ui_003: 
   { id: 'ui_003',
     name: 'myui003',
     path: B.path.join(appbundle_path, '/app2/uis/ui_003.json'),
     app: 'app2' },
  ui_004: 
   { id: 'ui_004',
     name: 'myui004',
     path: B.path.join(appbundle_path, '/app2/uis/ui_004.json'),
     app: 'app2' }
   };

    em.app__load_from_bundle$(appbundle_path, null).then(function() {
      assert.equal(_.isEqual(em.app_store.store.db, app_in_store), true);
      assert.equal(_.isEqual(em.graph_store.store.db, graph_in_store), true);
      assert.equal(_.isEqual(em.ui_store.store.db, ui_in_store), true);
      d();
    }).done();
  });

  
  //app__get$ test
  it("app_get app_ids is not array", function(d) {
    var app_ids = ["app1", "app2"];
    var count = 0;
    for (var i = 0; i < app_ids.length; i++) {
      (function(index) {
        em.app__get$(app_ids[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, app_in_store["app" + (index + 1)]), true);
          if (count === app_ids.length) {
            d();
          }
        }).done();
      })(i);
    }
  });

  it("app__get$ app_ids is array", function(d) {
    var app_get_value = [];
    app_get_value.push(app_in_store.app1);
    app_get_value.push(app_in_store.app2);
    var app_id_arr = ["app1", "app2"];
    em.app__get$(app_id_arr).then(function(v) {
      assert.equal(_.isEqual(v, app_get_value), true);
      d();
    }).done();
  });


  //app__list$ test
  it("app__list$", function(d) {
    var max_length = 1;
    if (max_length > 2)
      max_length = 2;
    var app_list_value = [];
    for (var i = 0; i < max_length; i++) {
      app_list_value.push(app_in_store["app" + (i + 1)]);
    }
    em.app__list$(max_length).then(function(v) {
      assert.equal(_.isEqual(v, app_list_value), true);
      d();
    }).done();
  });

  //app_list_graphs$ test
  it("app__list_graphs$", function(d) {

    var app1_graphs = [ 
    { id: 'graph_001',
      name: 'mygraph001',
      app: 'app1',
      path: B.path.join(appbundle_path, '/app1/graphs/graph_001.json') 
    },
    { id: 'graph_002',
      name: 'mygraph002',
      app: 'app1',
      path: B.path.join(appbundle_path, '/app1/graphs/graph_002.json') 
    } ];

    var app2_graphs = [ 
    { id: 'graph_003',
      name: 'mygraph003',
      app: 'app2',
      path: B.path.join(appbundle_path, '/app2/graphs/graph_003.json') 
    },
    { id: 'graph_004',
      name: 'mygraph004',
      app: 'app2',
      path: B.path.join(appbundle_path, '/app2/graphs/graph_004.json') 
    }];

    var app_graphs_arr = [app1_graphs, app2_graphs];


    var graphs_of_app_id = ["app1", "app2"];
    var count = 0;
    for (var i = 0; i < graphs_of_app_id.length; i++) {
      (function(index) {
        em.app__list_graphs$(graphs_of_app_id[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, app_graphs_arr[index]), true);
          if (count === graphs_of_app_id.length)
            d();
        }).done(); 
      })(i);
    }
  });
  
  //app__list_uis$ test
  it("app__list_uis$", function(d) {
    var app1_uis = [ 
    { id: 'ui_001',
      name: 'myui001',
      path: B.path.join(appbundle_path, '/app1/uis/ui_001.json'),
      app: 'app1' 
    },
    { id: 'ui_002',
      name: 'myui002',
      path: B.path.join(appbundle_path, '/app1/uis/ui_002.json'),
      app: 'app1' 
    }];

    var app2_uis = [ 
    { id: 'ui_003',
      name: 'myui003',
      path: B.path.join(appbundle_path, '/app2/uis/ui_003.json'),
      app: 'app2' 
    },
    { id: 'ui_004',
      name: 'myui004',
      path: B.path.join(appbundle_path, '/app2/uis/ui_004.json'),
      app: 'app2' 
    }];

    var app_uis_arr = [app1_uis, app2_uis];
    var uis_of_app_id = ["app1", "app2"];

    var count = 0;
    for (var i = 0; i < uis_of_app_id.length; i++) {
      (function(index) {
        em.app__list_uis$(uis_of_app_id[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, app_uis_arr[index]), true);
          if (count === uis_of_app_id.length)
            d();
        }).done();
      })(i);
    }
  });



  //graph add and remove test
  var graph_add_arr = [
    {
      id: "new_graph_1",
      name: "newgraph1",
      app: "app1"
    },
    {
      id: "new_graph_2",
      name: "newgraph2",
      app: "app1"
    },
    {
      id: "new_graph_3",
      name: "newgraph3",
      app: "app2"
    }
  ];

  var graph_add_0 = {
      id: "new_graph_1",
      name: "newgraph1",
      app: "app1",
      path: B.path.join(appbundle_path, '/app1/graphs/new_graph_1.json')
    };

  var graph_add_1 = {
    id: 'new_graph_2',
    name: 'newgraph2',
    app: 'app1',
     path: B.path.join(appbundle_path, '/app1/graphs/new_graph_2.json') 
   };
  var graph_add_2 = {
    id: 'new_graph_3',
    name: 'newgraph3',
    app: 'app2',
    path: B.path.join(appbundle_path, '/app2/graphs/new_graph_3.json')
  };

  var graph_add_parray = [graph_add_0, graph_add_1, graph_add_2];



  it("graph__add$", function(d) {
    var count = 0;
    var graph_in_store_ch = _.clone(graph_in_store);
    
    for (var i = 0; i < graph_add_arr.length; i++) {
      (function(index) {
        em.graph__add$(graph_add_arr[index]).then(function() {
        count++;

        graph_in_store_ch[graph_add_arr[index].id] = _.clone(graph_add_parray[index]);
        assert.equal(_.isEqual(em.graph_store.store.db, graph_in_store_ch), true);
        if (count === graph_add_arr.length)
          d();
        }).done();
      })(i);
    }
  });

  it("graph__remove$", function(d) {
    var count = 0;
    for (var i = graph_add_arr.length - 1; i >= 0; i--) {
      (function(index) {
        em.graph__remove$(graph_add_arr[index].id).then(function() {
          count++;
          var graph_in_store_ch = _.clone(graph_in_store);
          for (var j = 0; j < index; j++) {
            graph_in_store_ch[graph_add_arr[j].id] = _.clone(graph_add_parray[j]);
          }
          assert.equal(_.isEqual(em.graph_store.store.db, graph_in_store_ch), true);         
          if (count === graph_add_arr.length)
            d();
        }).done();
      })(i);
    }
  });




  //graph__get$ test
  it("graph__get$", function(d) {
    var graphs_arr = [
      { id: 'graph_001',
        name: 'mygraph001',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/graphs/graph_001.json')
      },
      { id: 'graph_002',
        name: 'mygraph002',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/graphs/graph_002.json')
      },
      { id: 'graph_003',
        name: 'mygraph003',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/graphs/graph_003.json') 
      },
      { id: 'graph_004',
        name: 'mygraph004',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/graphs/graph_004.json') 
      }
    ];

    var graphs_id = ["graph_001", "graph_002", "graph_003", "graph_004"];
    var count = 0;
    for (var i = 0; i < graphs_id.length; i++) {
      (function(index) {
        em.graph__get$(graphs_id[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, graphs_arr[index]), true);
          if (count === graphs_id.length) 
            d();
        }).done();
      })(i);
    }
  });

  //graph__list$ test
  it("graph__list$", function(d) {
    var graph_list_value = [ 
      { id: 'graph_001',
        name: 'mygraph001',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/graphs/graph_001.json') 
      },
      { id: 'graph_002',
        name: 'mygraph002',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/graphs/graph_002.json') 
      },
      { id: 'graph_003',
        name: 'mygraph003',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/graphs/graph_003.json') 
      },
      { id: 'graph_004',
        name: 'mygraph004',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/graphs/graph_004.json') 
      }];

      var max_length = 2;
      if (max_length > graph_list_value.length) {
        max_length = graph_list_value.length;
      }
      em.graph__list$(max_length).then(function(v) {
        assert.equal(_.isEqual(v, graph_list_value.slice(0, max_length)), true);
        d();
    }).done();
  });

  //graph__get_app$ test
  it("graph__get_app$", function(d) {
    var graphs_id = ["graph_001", "graph_002", "graph_003", "graph_004"];
    var count = 0;
    var app_values = [
      { id: 'app1',
        name: 'myapp1',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app1'),
       // main_ui: undefined,
        graphs: [ 'graph_001', 'graph_002' ],
        uis: [ 'ui_001', 'ui_002' ],
        is_builtin: false 
      },
      { id: 'app1',
        name: 'myapp1',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app1'),
        //main_ui: undefined,
        graphs: [ 'graph_001', 'graph_002' ],
        uis: [ 'ui_001', 'ui_002' ],
        is_builtin: false 
      },
      { id: 'app2',
        name: 'myapp2',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app2'),
        //main_ui: undefined,
        graphs: [ 'graph_003', 'graph_004' ],
        uis: [ 'ui_003', 'ui_004' ],
        is_builtin: false
      },
      { id: 'app2',
        name: 'myapp2',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app2'),
        //main_ui: undefined,
        graphs: [ 'graph_003', 'graph_004' ],
        uis: [ 'ui_003', 'ui_004' ],
        is_builtin: false
      }
    ];

    for (var i = 0; i < graphs_id.length; i++) {
      (function(index) {
        em.graph__get_app$(graphs_id[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, app_values[index]), true);
          if (count === graphs_id.length) {
            d();
          }
        }).done();
      })(i);
    }
  });


  
  //ui add and remove test
  var ui_add_arr = [
    {
      id: "new_ui_1",
      name: "newui1",
      app: "app1"
    },
    {
      id: "new_ui_2",
      name: "newui2",
      app: "app1"
    },
    {
      id: "new_ui_3",
      name: "newui3",
      app: "app2"
    }
  ];

  var ui_add_0 = {
      id: "new_ui_1",
      name: "newui1",
      app: "app1",
      path: B.path.join(appbundle_path, '/app1/uis/new_ui_1.json')
    };

  var ui_add_1 = {
    id: 'new_ui_2',
    name: 'newui2',
    app: 'app1',
     path: B.path.join(appbundle_path, '/app1/uis/new_ui_2.json') 
   };
  var ui_add_2 = {
    id: 'new_ui_3',
    name: 'newui3',
    app: 'app2',
    path: B.path.join(appbundle_path, '/app2/uis/new_ui_3.json')
  };

  var ui_add_parray = [ui_add_0, ui_add_1, ui_add_2];

  it("ui__add$", function(d) {
    var count = 0;
    var ui_in_store_ch = _.clone(ui_in_store);
    
    for (var i = 0; i < ui_add_arr.length; i++) {
      (function(index) {
        em.ui__add$(ui_add_arr[index]).then(function() {
        count++;

        ui_in_store_ch[ui_add_arr[index].id] = _.clone(ui_add_parray[index]);
        assert.equal(_.isEqual(em.ui_store.store.db, ui_in_store_ch), true);
        if (count === ui_add_arr.length)
          d();
        }).done();
      })(i);
    }
  });

  it("ui__remove$", function(d) {
    var count = 0;
    for (var i = ui_add_arr.length - 1; i >= 0; i--) {
      (function(index) {
        em.ui__remove$(ui_add_arr[index].id).then(function() {
          count++;
          var ui_in_store_ch = _.clone(ui_in_store);
          for (var j = 0; j < index; j++) {
            ui_in_store_ch[ui_add_arr[j].id] = _.clone(ui_add_parray[j]);
          }
          assert.equal(_.isEqual(em.ui_store.store.db, ui_in_store_ch), true);         
          if (count === ui_add_arr.length)
            d();
        }).done();
      })(i);
    }
  });

  //ui__get$ test
  it("ui__get$", function(d) {
    var ui_arr = [
      { id: 'ui_001',
        name: 'myui001',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/uis/ui_001.json')
      },
      { id: 'ui_002',
        name: 'myui002',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/uis/ui_002.json')
      },
      { id: 'ui_003',
        name: 'myui003',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/uis/ui_003.json') 
      },
      { id: 'ui_004',
        name: 'myui004',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/uis/ui_004.json') 
      }
    ];

    var uis_id = ["ui_001", "ui_002", "ui_003", "ui_004"];
    var count = 0;
    for (var i = 0; i < uis_id.length; i++) {
      (function(index) {
        em.ui__get$(uis_id[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, ui_arr[index]), true);
          if (count === uis_id.length) 
            d();
        }).done();
      })(i);
    }
  });

  //ui__list$ test
  it("ui__list$", function(d) {
    var ui_list_value = [ 
      { id: 'ui_001',
        name: 'myui001',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/uis/ui_001.json') 
      },
      { id: 'ui_002',
        name: 'myui002',
        app: 'app1',
        path: B.path.join(appbundle_path, '/app1/uis/ui_002.json') 
      },
      { id: 'ui_003',
        name: 'myui003',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/uis/ui_003.json') 
      },
      { id: 'ui_004',
        name: 'myui004',
        app: 'app2',
        path: B.path.join(appbundle_path, '/app2/uis/ui_004.json') 
      }];

      var max_length = 2;
      if (max_length > ui_list_value.length) {
        max_length = ui_list_value.length;
      }
      em.ui__list$(max_length).then(function(v) {
        assert.equal(_.isEqual(v, ui_list_value.slice(0, max_length)), true);
        d();
    }).done();
  });

  //ui__get_app$ test
  it("ui__get_app$", function(d) {
    var ui_id = ["ui_001", "ui_002", "ui_003", "ui_004"];
    var count = 0;
    var app_values = [
      { id: 'app1',
        name: 'myapp1',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app1'),
        //main_ui: undefined,
        graphs: [ 'graph_001', 'graph_002' ],
        uis: [ 'ui_001', 'ui_002' ],
        is_builtin: false 
      },
      { id: 'app1',
        name: 'myapp1',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app1'),
        uis: [ 'ui_001', 'ui_002' ],
        //main_ui: undefined,
        graphs: [ 'graph_001', 'graph_002' ],
        is_builtin: false 
      },
      { id: 'app2',
        name: 'myapp2',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app2'),
        //main_ui: undefined,
        graphs: [ 'graph_003', 'graph_004' ],
        uis: [ 'ui_003', 'ui_004' ],
        is_builtin: false
      },
      { id: 'app2',
        name: 'myapp2',
        //description: undefined,
        path: B.path.join(appbundle_path, '/app2'),
        //main_ui: undefined,
        graphs: [ 'graph_003', 'graph_004' ],
        uis: [ 'ui_003', 'ui_004' ],
        is_builtin: false
      }
    ];

    for (var i = 0; i < ui_id.length; i++) {
      (function(index) {
        em.ui__get_app$(ui_id[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, app_values[index]), true);
          if (count === ui_id.length) {
            d();
          }
        }).done();
      })(i);
    }
  });
});



describe("app/graph/ui update", function() {
  var appstore;
  var graphstore;
  var uistore;
  var em;

  before("create_entity_manager",function(d) {
    ES.create_appstore$("memory").then(function(obj1) {
      appstore = obj1;
      return ES.create_graphstore$("memory");
    }).then(function(obj2) {
      graphstore = obj2;
      return ES.create_uistore$("memory");
    }).then(function(obj3) {
      uistore = obj3;
      em = E.create_entity_manager({
        app_store : appstore,
        graph_store : graphstore,
        ui_store : uistore
      });
      d();
    }).done();
  });

  var appbundle_path = B.path.join(__dirname, "./app_bundle");


   //app__update$ test
  it("app add", function(d) {
    var app = {
      id: "new_app_1",
      name: "newapp1"
    };
    em.app__add$(app, appbundle_path).then(function() {
      d();
    }).done();
  });

  it("app__update$", function(d) {
    var app = {
      id: "new_app_1",
      name: "newname!",
      description: "add the description!!"
    };

    var app_new_value = {
     new_app_1: 
      { id: 'new_app_1',
        name: 'newname!',
        path: B.path.join(appbundle_path, '/new_app_1'),
        //main_ui: undefined,
        graphs: [],
        uis: [],
        is_builtin: false,
        description: 'add the description!!' 
      } 
     };

    em.app__update$(app).then(function() {
      assert.equal(_.isEqual(em.app_store.store.db, app_new_value), true);
      d();
    }).done();
  });


  ////graph__update$ test
  it("add graph", function(d) {
    var graph = {
      id: "new_graph_1",
      name: "newgraph1",
      app: "new_app_1"
    };
    em.graph__add$(graph).then(function() {
      d();
    }).done();
  });


  it("graph__update$", function(d) {
    var graph = {
      id: "new_graph_1",
      name: "name_modified",
      description: "add description now",
      app: "new_app_1"
    };

    var graph_new_value =  { 
      new_graph_1: 
        { id: 'new_graph_1',
          name: 'name_modified',
          description: 'add description now',
          app: 'new_app_1',
          path: B.path.join(appbundle_path, '/new_app_1/graphs/new_graph_1.json') 
        } 
      };

    em.graph__update$(graph).then(function() {
      assert.equal(_.isEqual(em.graph_store.store.db, graph_new_value), true);
      d();
  }).done();
  });


  it("graph__remove", function(d) {
    em.graph__remove$("new_graph_1").then(function() {
    d();
  }).done();
  });


  ////ui__update$ test
  it("ui add", function(d) {
    var ui = {
      id: "new_ui_1",
      name: "newui1",
      app: "new_app_1"
    };
    em.ui__add$(ui).then(function() {
      d();
    }).done();
  });
  

  it("ui__update$", function(d) {
    var ui = {
      id: "new_ui_1",
      name: "name_modified",
      description: "add description now",
      app: "new_app_1"
    };

    var ui_new_value =  { 
      new_ui_1: 
        { id: 'new_ui_1',
          name: 'name_modified',
          description: 'add description now',
          app: 'new_app_1',
          path: B.path.join(appbundle_path, '/new_app_1/uis/new_ui_1.json') 
        } 
      };

    em.ui__update$(ui).then(function() {
      assert.equal(_.isEqual(em.ui_store.store.db, ui_new_value), true);
      d();
  }).done();
  });

  it("ui__remove$", function(d) {
    em.ui__remove$("new_ui_1").then(function() {
      d();
    }).done();
  });


  it("app__remove$", function(d) {
    var app_id = "new_app_1";
    em.app__remove$(app_id).then(function() {
      d();
    }).done();
  });
});




