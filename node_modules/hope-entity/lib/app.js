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
/**
 * App Manager Module
 * handle app and graph
 * @module entity/app
 */

var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/app");
var check = B.check;
var check_warn = B.check_warn;
var fs = require("fs");

/**
 * NOTE: All the path infos are in the store. They are generated during loading jsons.
 * The path info in json file is useless. 
 */

/**
 * load apps from the appbundle in harddisk
 * 1, readdir the bundle and do _load_app for each app path
 * 2, in _load_app
 *    2.1: read app.json, create app object based on the json
 *    2.2: load each graph.json, create graph object and push the graph_id into app.graphs.
 *    2.3: set ap_obj and graph_obj into store. 
 * @param  {String} bundle_path the bundle full path
 * @param  {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise}            
 */
exports.load_apps$ = function(uid, bundle_path, em, changed_list) {
  log("load_apps", bundle_path);
  if (!check_warn(B.fs.dir_exists(bundle_path),
   "entity/app", "dir doesnt exsits", bundle_path)) {
    return Promise.reject(bundle_path + "not found");
  }
  var tasks = [];
  fs.readdirSync(bundle_path).forEach(function(relative_path) {
    var p = B.path.join(bundle_path, relative_path);
    var jsonp = B.path.join(p, "app.json");
    if (fs.statSync(p).isDirectory() && B.fs.file_exists(jsonp)) {
      tasks.push(_load_app$(uid, p, em, changed_list));
    }
  });
  return Promise.all(tasks);
};

function _load_app$(uid, app_path, em, changed_list) {
  log("load_app", app_path);
  return Promise.resolve()
  .then(function create_app_from_json() {
    var json_path = B.path.join(app_path, "app.json");
    check(B.fs.file_exists(json_path), "entity/app", "app.json not found in", json_path);
    var app_json = B.fs.read_json(json_path);
    var app_obj = _create_app(app_json, app_path);
    app_obj.uid = uid;
    return app_obj;
  })
  .then(function load_graphs_uis(app) {
    var graphs_path = B.path.join(app_path, "graphs");
    check(B.fs.dir_exists(graphs_path), "entity/app", "graphs not exsit", graphs_path);
    var uis_path = B.path.join(app_path, "uis");
    check(B.fs.dir_exists(uis_path), "entity/app", "uis not exsit", uis_path);
    var tasks = [];
    fs.readdirSync(graphs_path).forEach(function(relative_path) {
      var p = B.path.join(graphs_path, relative_path);
      if (!B.path.ext(p) === ".json") {
        return;
      }
      log("load_graph", p);
      var graph_json = B.fs.read_json(p);
      var graph = _create_graph(graph_json, p, app.id);
      app.graphs.push(graph.id); //add graph_id to app
      tasks.push(em.graph_store.set$(graph.id, graph, changed_list));
    });
    fs.readdirSync(uis_path).forEach(function(relative_path) {
      var p = B.path.join(uis_path, relative_path);
      log("load_ui", p);
      check(B.path.ext(p) === ".json", "entity/app", "file is not json", p);
      var ui_json = B.fs.read_json(p);
      var ui = _create_ui(ui_json, p, app.id);
      app.uis.push(ui.id); //add ui_id to app
      tasks.push(em.ui_store.set$(ui.id, ui, changed_list));
    });
    tasks.push(em.app_store.set$(app.id, app, changed_list));
    return Promise.all(tasks);
  });  
}

/*

var app = {
    id: json.id,
    name: json.name,
    description: json.description,
    path: app_path,
    uis: [],
    main_ui: json.main_ui,
    graphs: [],
    is_builtin: !!json.is_builtin
  };
*/
function _create_app(json, app_path) {
  check(_.isString(json.id) && _.isString(json.name), "entity/app", 
    "app json must have id and name", json);
  var app = {};
  _.merge(app, json);
  app.path = app_path;
  app.graphs = [];
  app.uis = [];
  app.is_builtin = !!json.is_builtin;


  return app;
}

function _create_graph(json, graph_path, app_id) {
  check(_.isString(json.id) && _.isString(json.name), "entity/app", 
    "graph json must have id and name", json);
  json.path = graph_path;
  json.app = app_id;
  return json;
}

function _create_ui(json, ui_path, app_id) {
  check(_.isString(json.id) && _.isString(json.name), "entity/app", 
    "ui json must have id and name", json);
  json.path = ui_path;
  json.app = app_id;
  return json;
}

/**
 * Add a new graph in the backend. It will be stored in the graph_store and json_file.
 * 1, make sure the graph_id not exsit in the store
 * 2, get the app_id from graph, get the app_obj
 * 3, check whether it is builtin_app. push graph_id into app.graphs, and set the modified app
 * 4, write the graph json file. the filename is graph_id.
 * 5, set the graph in graphstore.
 * @param {Object} graph      the graph object from frontend
 * @param {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise} 
 */
exports.add_graph$ = function(graph, em, changed_list) {
  log("add graph", graph);
  var app_path;
  return Promise.resolve()
  .then(function() {
    return em.graph_store.has$(graph.id);
  })
  .then(function(ret) {
    check(!ret, "entity/graph", "graph already exsit", graph.id);
    var app_id = graph.app;
    return em.app_store.get_with_lock$(app_id,
      function(app) {
        check(!app.is_builtin, "entity/graph", "builtin_app cannot add graph", app);
        app.graphs.push(graph.id);
        app.graphs = _.uniq(app.graphs);
        app_path = app.path;
        return em.app_store.set$(app.id, app, changed_list);        
      });
  })
  .then(function() {
    var graph_filename = B.path.join(app_path, "graphs/" + graph.id + ".json");
    check(!B.fs.file_exists(graph_filename), "entity/graph",
     "the graph json already exsit!", graph_filename);
    B.fs.write_json(graph_filename, graph);
    var graph_obj = _create_graph(graph, graph_filename, graph.app);
    return em.graph_store.set$(graph_obj.id, graph_obj, changed_list);
  });
};

function prepare_update_graph(graph) {
  delete graph.app;
  delete graph.path;
}

function prepare_update_ui(ui) {
  delete ui.app;
  delete ui.path;
}

function prepare_update_app(app) {
  delete app.path;
  delete app.is_builtin;
  delete app.uis;
  delete app.graphs;
}

/**
 * Update the exsiting graph, including graphstore and graph_json.
 * 1, get the app_obj from app_store.
 *    make sure it is not builtin, and the graph belongs to the app
 * 2, get the old graph, find the graph path, rewrite the graph_json.
 * 3, graphstore.set new graph.
 * @param {Object} graph      the graph object from frontend
 * @param {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise} 
 */
exports.update_graph$ = function(graph, em, changed_list) {
  prepare_update_graph(graph);
  log("update graph", graph);
  return Promise.resolve()
  .then(function() {
    return em.graph_store.get$(graph.id)
    .then(function(obj) {
      return em.app_store.get$(obj.app);
    });
  })
  .then(function(app) {
    check(!app.is_builtin, "entity/graph", "builtin_app cannot update graph", app);
    check(app.graphs.indexOf(graph.id) !== -1, "entity/graph", "the graph not belong to the app", app);
    return em.graph_store.get_with_lock$(graph.id,
      function(oldgraph) {
        check(!_.isUndefined(oldgraph), "entity/graph", "the graph not exsit before", graph.id);
        B.fs.update_json(oldgraph.path, graph);
        var graph_obj = _.assign(oldgraph, graph);
        return em.graph_store.set$(graph_obj.id, graph_obj, changed_list);        
      });
  });
};

/**
 * remove the graph, including graphstore and graph_json.
 * 1, get rhe graph_obj from graphstore
 * 2, get the corresponding app_obj from appstore, and makesure it is not builtin
 * 3, remove the graph_id from app.graphs, and re-store the app
 * 4, remove the graph json file, and delete the graph from graphstore.
 * @param  {id} graphid    
 * @param  {object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise}            
 */
exports.remove_graph$ = function(graphid, em, changed_list) {
  log("remove graph", graphid);
  var graph_path;
  var app_id;
  return Promise.resolve()
  .then(function() {
    return em.graph_store.get$(graphid);
  })
  .then(function(graph) {
    app_id = graph.app;
    graph_path = graph.path;
    return em.app_store.get_with_lock$(app_id, function(app) {
      check(!app.is_builtin, "entity/graph", "builtin_app cannot remove graph", app);
      _.remove(app.graphs, function(id) {
        return id === graphid;
      });
      return em.app_store.set$(app_id, app, changed_list);      
    });
  })
  .then(function() {
    fs.unlinkSync(graph_path);
    return em.graph_store.delete$(graphid, changed_list);
  });
};


/**
 * Add a new ui in the backend. It will be stored in the ui_store and json_file.
 * 1, make sure the ui_id not exsit in the store
 * 2, get the app_id from ui, get the app_obj
 * 3, check whether it is builtin_app. push ui_id into app.uis, and set the modified app
 * 4, write the ui json file. the filename is ui_id.
 * 5, set the ui in uistore.
 * @param {Object} ui      the ui object from frontend
 * @param {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise} 
 */
exports.add_ui$ = function(ui, em, changed_list) {
  log("add ui", ui);
  var app_path;
  return Promise.resolve()
  .then(function() {
    return em.ui_store.has$(ui.id);
  })
  .then(function(ret) {
    check(!ret, "entity/ui", "ui already exsit", ui.id);
    var app_id = ui.app;
    return em.app_store.get_with_lock$(app_id,
      function(app) {
        check(!app.is_builtin, "entity/ui", "builtin_app cannot add ui", app);
        app.uis.push(ui.id);
        app.uis = _.uniq(app.uis);
        app_path = app.path;
        return em.app_store.set$(app.id, app, changed_list);        
      });
  })
  .then(function() {
    var ui_filename = B.path.join(app_path, "uis/" + ui.id + ".json");
    check(!B.fs.file_exists(ui_filename), "entity/ui",
     "the ui json already exsit!", ui_filename);
    B.fs.write_json(ui_filename, ui);
    var ui_obj = _create_ui(ui, ui_filename, ui.app);
    return em.ui_store.set$(ui_obj.id, ui_obj, changed_list);
  });
};

/**
 * Update the exsiting ui, including uistore and ui_json.
 * 1, get the app_obj from app_store.
 *    make sure it is not builtin, and the ui belongs to the app
 * 2, get the old ui, find the ui path, rewrite the ui_json.
 * 3, uistore.set new ui.
 * @param {Object} ui      the ui object from frontend
 * @param {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise} 
 */
exports.update_ui$ = function(ui, em, changed_list) {
  prepare_update_ui(ui);
  log("update ui", ui);
  return Promise.resolve()
  .then(function() {
    return em.ui_store.get$(ui.id)
    .then(function(obj) {
      return em.app_store.get$(obj.app);
    });
  })
  .then(function(app) {
    check(!app.is_builtin, "entity/ui", "builtin_app cannot update ui", app);
    check(app.uis.indexOf(ui.id) !== -1, "entity/ui", "the ui not belong to the app", app);
    return em.ui_store.get_with_lock$(ui.id,
      function(oldui) {
        check(!_.isUndefined(oldui), "entity/ui", "the ui not exsit before", ui.id);
        B.fs.update_json(oldui.path, ui);
        var ui_obj = _.assign(oldui, ui);
        return em.ui_store.set$(ui_obj.id, ui_obj, changed_list);        
      });
  });
};

/**
 * remove the ui, including uistore and ui_json.
 * 1, get rhe ui_obj from uistore
 * 2, get the corresponding app_obj from appstore, and makesure it is not builtin
 * 3, remove the ui_id from app.uis, and re-store the app
 * 4, remove the ui json file, and delete the ui from uistore.
 * @param  {id} uiid    
 * @param  {object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise}            
 */
exports.remove_ui$ = function(uiid, em, changed_list) {
  log("remove ui", uiid);
  var ui_path;
  var app_id;
  return Promise.resolve()
  .then(function() {
    return em.ui_store.get$(uiid);
  })
  .then(function(ui) {
    app_id = ui.app;
    ui_path = ui.path;
    return em.app_store.get_with_lock$(app_id, function(app) {
      check(!app.is_builtin, "entity/ui", "builtin_app cannot remove ui", app);
      _.remove(app.uis, function(id) {
        return id === uiid;
      });
      return em.app_store.set$(app_id, app, changed_list);      
    });
  })
  .then(function() {
    fs.unlinkSync(ui_path);
    return em.ui_store.delete$(uiid, changed_list);
  });
};


/**
 * add an app to backend, including harddisk and appstore.
 * 1, make sure the app_id not exsit before, and it is not builtin.
 * 2, create a app dir, The dirname is app_id.
 * 3, create "graphs" and "ui" as sub-folders under app dir
 * 4, write app.json.
 * 5, appstore.set$.
 * @param {Object} appjson    app plainobject from frontend 
 * @param {String} bundlepath the path of app bundle
 * @param {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise} 
 */
exports.add_app$ = function(uid, appjson, bundlepath, em, changed_list) {
  log("add app", appjson);
  return Promise.resolve()
  .then(function() {
    check(!appjson.is_builtin, "entity/app", "it is builtin app", appjson);
    return em.app_store.has$(appjson.id);
  })
  .then(function(ret) {
    check(!ret, "entity/app", "app already exsit", appjson.id);
    var app_path = B.path.join(bundlepath, appjson.id);
    check(!B.fs.dir_exists(app_path), "entity/app",
     "the app path already exsit!", app_path);
    fs.mkdirSync(app_path);
    fs.mkdirSync(B.path.join(app_path, "graphs"));
    fs.mkdirSync(B.path.join(app_path, "uis"));
    B.fs.write_json(B.path.join(app_path, "app.json"), appjson);
    var app = _create_app(appjson, app_path);
    app.uid = uid;
    return em.app_store.set$(app.id, app, changed_list);
  });
};

/**
 * update an exsiting app, incliding app.json and appstore.
 * 1, get the old app from appstore, make sure it is exsiting and not bultin
 * 2, get the path from old_app, then re-write the app.json.
 * 3, appstore.set$.
 * @param {Object} appjson    app plainobject from frontend 
 * @param {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise} 
 */
exports.update_app$ = function(appjson, em, changed_list) {
  prepare_update_app(appjson);
  log("update app", appjson);
  return Promise.resolve()
  .then(function() {
    return em.app_store.get_with_lock$(appjson.id, function(app_obj) {
      check(!_.isUndefined(app_obj), "entity/app",
        "the app not exsit before", app_obj.id);
      check(!app_obj.is_builtin, "entity/graph",
        "builtin_app cannot be updated", app_obj);
      B.fs.update_json(B.path.join(app_obj.path, "app.json"), appjson);
      var new_app = _.assign(app_obj, appjson);
      return em.app_store.set$(new_app.id, new_app, changed_list);
    });
  });
};


/**
 * remove tha app.
 * Note that it includes the app and its all graphs/uis, in both harddisk and store
 * 1, get the old app from appstore, make sure it is exsiting and not builtin
 * 2, delete the app dir in hardisk
 * 3, graphstore.batch_delete all its graphs
 * 4, uistore.batch_delete all its uis
 * 5, appstore.delete
 * @param  {id} app_id     
 * @param  {Object} em
 * @param {Array} changed_list  record of changed items  
 * @return {Promise}            
 */
exports.remove_app$ = function(app_id, em, changed_list) {
  log("remove app", app_id);
  return Promise.resolve()
  .then(function() {
    return em.app_store.get$(app_id);
  })
  .then(function(app_obj) {
    check(!_.isUndefined(app_obj), "entity/app",
     "the app not exsit before", app_obj.id);
    check(!app_obj.is_builtin, "entity/app",
     "builtin_app cannot be removed", app_obj);
    B.fs.rm(app_obj.path);
    var tasks = [];
    tasks.push(em.graph_store.batch_delete$(app_obj.graphs, changed_list));
    tasks.push(em.ui_store.batch_delete$(app_obj.uis, changed_list));
    return Promise.all(tasks);
  })
  .then(function() {
    return em.app_store.delete$(app_id, changed_list);
  });
};


