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
//////////////////////////////////////////////////////////////////
// This is a sample server
// 
// It's for illustration purpose, Error processing isn't seriously considered
//////////////////////////////////////////////////////////////////



var express = require("express");
var web_app = express();
var server = require("http").createServer(web_app); // http server
// var socket = require("socket.io")(server);  // web socket
var _ = require("lodash");
var util = require("util");

// config
var bodyParser = require("body-parser");
web_app.use(bodyParser.urlencoded({extended: true}));
web_app.use(bodyParser.json());

web_app.use(express.static("./public"));

web_app.all("*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // http://127.0.0.1:7000
  res.header("Access-Control-Allow-Headers", "origin, content-type, accept");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

//////////////////////////////////////////////////////////////////
// Data
//////////////////////////////////////////////////////////////////

function _hash_to_array(o) {
  var a = [];
  _.forOwn(o, function(item) {
    a.push(item);
  });
  return a;
}

function _array_to_hash(a, key_field) {
  key_field = key_field || "id";
  var o = {};
  _.each(a, function(item) {
    o[item[key_field]] = item;
  });
  return o;
}

function _brief(o) {
  return {
    id: o.id,
    name: o.name,
    description: o.description || ""
  };
}

var hope_apps = {
  sample: {
    id: "sample",
    is_builtin: true,
    name: "Hello World",
    description: "Testing Purpose",
    graphs: [],
    uis: []
  },
  test: {
    id: "test",
    name: "test",
    description: "test app created by user",
    graphs: [],
    uis: [],
    main_ui: "test_main_ui_id"
  }
};
var hope_app_storages = {
  sample: null,
  test: "./.local"
};

var hope_graphs = {};
var hope_uis = {};


var hope_bundles = _array_to_hash(JSON.parse(require("../ui/js/samples/spec_bundles")));

// load UI specs
var ui_bundle = require("../../ui-widgets/specs.js");
hope_bundles[ui_bundle.id] = ui_bundle;


var master_spec_bundle = {
  id: "__HOPE_MASTER_SPEC_BUNDLE__",
  name: "Master",
  description: "DEMO spec bundle for Master",
  specs: []
};
hope_bundles[master_spec_bundle.id] = master_spec_bundle;

var hope_hubs = _array_to_hash(JSON.parse(require("../ui/js/samples/hubs")));

var master = {
  id: "__HOPE_MASTER__",
  name: "Master",
  description: "Master in HOPE",
  things: []
};
hope_hubs[master.id] = master;

var sample_graph_files = [
  "../ui/js/samples/request_response.js",
  "../ui/js/samples/sensor_led.js"
];

var test_graph_files = [];
var test_ui_files = [];

var fs = require("fs");

function mkdir(path) {
  try {
    fs.mkdirSync(path);
  } catch (e) {
    console.log(e);
  }
}

function unlink(path) {
  try {
    var stat = fs.statSync(path);
    if (stat.isDirectory()) {
      return fs.rmdirSync(path);
    }
    return fs.unlinkSync(path);
  } catch (e) {
    console.log(e);
    return false;
  }
}

mkdir("./.local");
mkdir("./.local/ui");

if (!fs.existsSync("./.local/ui/test_main_ui_id.json")) {
  fs.writeFileSync("./.local/ui/test_main_ui_id.json", JSON.stringify({
    id: "test_main_ui_id"
  }));
}

_.each(fs.readdirSync("./.local"), function(p) {
  if (_.endsWith(p, ".json")) {
    test_graph_files.push("./.local/" + p);
  }
});

_.each(fs.readdirSync("./.local/ui"), function(p) {
  if (_.endsWith(p, ".json")) {
    test_ui_files.push("./.local/ui/" + p);
  }
});

var APPS_DIR = "./.local/apps";
mkdir(APPS_DIR);

_.each(fs.readdirSync(APPS_DIR), function(p) {
  var storage = APPS_DIR + "/" + p;
  
  try {
    var a = JSON.parse(fs.readFileSync(storage + "/package.json"));
  } catch (e) {
    return;
  }

  a.graphs = [];
  a.uis = [];
  hope_apps[a.id] = a;
  hope_app_storages[a.id] = storage;

  var graph_files = [];
  _.each(fs.readdirSync(storage), function(gp) {
    if (gp !== "package.json" && _.endsWith(gp, ".json")) {
      graph_files.push(storage + "/" + gp);
    }
  });

  _load_graphs(a.id, graph_files);

  var ui_files = [];
  _.each(fs.readdirSync(storage + "/ui"), function(up) {
    if (_.endsWith(up, ".json")) {
      ui_files.push(storage + "/ui/" + up);
    }
  });

  _load_uis(a.id, ui_files);
});


function _load_graphs(app, graphs) {
  var g;
  _.forOwn(graphs, function(p) {
    console.log("... loading graph: ", p);
    if (_.endsWith(p, ".js")) { // this only for samples because it exports strings
      g = require(p);
    } else {
      g = fs.readFileSync(p);
    }
    g = JSON.parse(g);
    hope_graphs[g.id] = g;
    _.remove(hope_apps[app].graphs, function(_g) {
      return _g.id === g.id;
    });
    hope_apps[app].graphs.push(_brief(g));
  });
}

_load_graphs("sample", sample_graph_files);
_load_graphs("test", test_graph_files);


function _load_uis(app, uis) {
  var g;
  _.forOwn(uis, function(p) {
    console.log("... loading ui: ", p);
    g = JSON.parse(fs.readFileSync(p));
    hope_uis[g.id] = g;
    _.remove(hope_apps[app].uis, function(_g) {
      return _g.id === g.id;
    });
    hope_apps[app].uis.push(_brief(g));
  });
}
_load_uis("test", test_ui_files);


function _get_app_for_graph(graph_id) {
  var a;
  _.forOwn(hope_apps, function(app) {
    if (_.findIndex(app.graphs, function(g) {
      return g.id === graph_id;
    }) !== -1) {
      a = app;
      return false;
    }
  });
  return a;
}


function _get_app_for_ui(ui_id) {
  var a;
  _.forOwn(hope_apps, function(app) {
    if (_.findIndex(app.uis, function(g) {
      return g.id === ui_id;
    }) !== -1) {
      a = app;
      return false;
    }
  });
  return a;
}


var component_base = "../demo/component";
var spec_storage = {};
var spec_scripts = [
  "init.js", "stop.js", "resume.js", "pause.js", "kernel.js", "after_resume.js"
];

_.each(fs.readdirSync(component_base), function(tp) {
  var stat = fs.statSync(component_base + "/" + tp);
  if (!stat.isDirectory()) {
    return;
  }

  var thing_base = component_base + "/" + tp;
  var thing = {
    id: "MASTER." + tp,
    name: tp,
    description: tp,
    services: []
  };

  try {
    var tj = JSON.parse(fs.readFileSync(thing_base + "/thing.json"));
    _.merge(thing, tj);
  } catch (e) {
    console.log(e);
  }

  master.things.push(thing);

  _.each(fs.readdirSync(thing_base), function(sp) {
    var stat2 = fs.statSync(thing_base + "/" + sp);
    if (!stat2.isDirectory()) {
      return;
    }
    
    var service_base = thing_base + "/" + sp;
    var service = {
      id: thing.id + "." + sp,
      name: sp,
      description: sp
    };

    try {
      var sj = JSON.parse(fs.readFileSync(service_base + "/service.json"));
      _.merge(service, sj);
      if (_.isObject(sj.spec) && sj.spec.id) {
        service.spec = sj.spec.id;
        thing.services.push(service);
        master_spec_bundle.specs.push(sj.spec);

        spec_storage[sj.spec.id] = service_base;
      }
      else if (_.isString(sj.spec)) {
        thing.services.push(service);
      }
    } catch (e) {
      console.log(e);
    }
  });
});



var hope_specs_index = {};
_.forOwn(hope_bundles, function(b) {
  _.each(b.specs, function(s) {
    hope_specs_index[s.id] = {
      bundle: b,
      spec: s
    };
  });
});

//////////////////////////////////////////////////////////////////
// Handler
//////////////////////////////////////////////////////////////////


function APIHandler(req, res) {
  this.req = req;
  this.res = res;
}

APIHandler.prototype.send = function(data) {
  this.res.send(data);
};
APIHandler.prototype.send_error = function(error) {
  this.res.status(500).send(error);
};

APIHandler.prototype.process = function(data) {
  console.log("API Request:", data.api, "with params:", data.params);
  var f = this[data.api.replace(".", "__")];
  var result;
  if (_.isFunction(f)) {
    try {
      result = f.apply(this, data.params);
      // client side is forced to receive a JSON
      // so we need to send back something always
      if (!result) {
        result = {result: "______HOPE_OK______"};
      }
      this.send(result);
    } catch (e) {
      console.log("Error Catched: ", e.toString());
      this.send_error("Error when execute api: " + data.api + " error: " + e.toString());
    }
  } else {
    this.send_error("Failed to find api: " + data.api);
  }
};

//----------------------------------------------------------------
// Services Here
//----------------------------------------------------------------
function _get_non_builtin_app(app_id) {
  var app = hope_apps[app_id];
  if (!app) {
    throw new Error("Cannot find the app with id: " + app_id);
  }
  if (app.is_builtin) {
    throw new Error("The app is builtin app and cannot change: " + app_id);
  }
  return app;
}


APIHandler.prototype.app__list = function() {
  return _hash_to_array(hope_apps);
};

APIHandler.prototype.app__create_ui = function(data) {
  var app = _get_non_builtin_app(data.app);
  var p = hope_app_storages[app.id] + "/ui/" + data.ui.id + ".json";
  fs.writeFileSync(p, JSON.stringify(data.ui));
  _load_uis(app.id, [p]);
};


APIHandler.prototype.ui__get = function(ids) {
  return ids.map(function(id) {
    return hope_uis[id];
  });
};

APIHandler.prototype.ui__update = function(ui) {
  var app = _get_app_for_ui(ui.id);
  app = _get_non_builtin_app(app ? app.id : null);
  var p = hope_app_storages[app.id] + "/ui/" + ui.id + ".json";
  fs.writeFileSync(p, JSON.stringify(ui));
  _load_uis(app.id, [p]);
};

APIHandler.prototype.ui__remove = function(ids) {
  return ids.map(function(id) {
    var app = _get_app_for_ui(id);
    if (app) {
      unlink(hope_app_storages[app.id] + "/ui/" + id + ".json");
      _.remove(app.uis, function(ui) {
        return ui.id === id;
      });
    }
    delete hope_uis[id];
  });
};


APIHandler.prototype.app__create_graph = function(data) {
  var app = _get_non_builtin_app(data.app);
  var p = hope_app_storages[app.id] + "/" + data.graph.id + ".json";
  fs.writeFileSync(p, JSON.stringify(data.graph));
  _load_graphs(app.id, [p]);
};

APIHandler.prototype.app__create = function(data) {
  if (!data || !data.name || data.name in hope_apps) {
    return { error: "invalid argument" };
  }
  var app_id;
  for (var i = 1; i < 10000; i++) {
    app_id = "app" + i;
    if (!(app_id in hope_apps)) {
      break;
    }
  }

  var now = new Date();
  var app = {
    id: app_id,
    name: data.name,
    description: data.desc,
    main_ui: "",
    modify_time: now.getTime(),
    create_time: now.getTime()
  };

  var storage = APPS_DIR + "/" + app_id;
  mkdir(storage);
  mkdir(storage + "/ui");

  hope_apps[app_id] = app;
  hope_app_storages[app_id] = storage;

  var p = storage + "/package.json";
  fs.writeFileSync(p, JSON.stringify(app));

  app.graphs = [];
  app.uis = [];
  return app;
};

APIHandler.prototype.app__remove = function(data) {
  var storage = hope_app_storages[data.app];
  if (!storage) {
    return { error: "No such app" };
  }
  delete hope_apps[data.app];
  delete hope_app_storages[data.app];

  _.each(fs.readdirSync(storage + "/ui"), function(p) {
    unlink(storage + "/ui/" + p);
  });
  _.each(fs.readdirSync(storage), function(p) {
    unlink(storage + "/" + p);
  });
  unlink(storage);
  return {};
};

APIHandler.prototype.app__update = function(data) {
  var app = hope_apps[data.app];
  if (!app) {
    return { error: "No such app" };
  }
  if (!data.props || ("id" in data.props)) {
    return { error: "Invalid arguments" };
  }

  _.merge(app, data.props);

  var now = new Date();
  app.modify_time = now.getTime();

  var copy = _.cloneDeep(app);
  delete copy.graphs;
  delete copy.uis;

  var p = hope_app_storages[data.app] + "/package.json";
  fs.writeFileSync(p, JSON.stringify(copy));
  return {};
};

APIHandler.prototype.graph__get = function(ids) {
  return ids.map(function(id) {
    return hope_graphs[id];
  });
};

APIHandler.prototype.graph__update = function(graph) {
  var app = _get_app_for_graph(graph.id);
  app = _get_non_builtin_app(app ? app.id : null);
  var p = hope_app_storages[app.id] + "/" + graph.id + ".json";
  fs.writeFileSync(p, JSON.stringify(graph));
  _load_graphs(app.id, [p]);
};

APIHandler.prototype.graph__remove = function(ids) {
  ids.map(function(id) {
    var app = _get_app_for_graph(id);
    if (app) {
      var p = hope_app_storages[app.id] + "/" + id + ".json";
      unlink(p);
      _.remove(app.graphs, function(_g) {
        return _g.id === id;
      });
    }
    delete hope_graphs[id];
  });
  return {};
};

APIHandler.prototype.graph__start = function(ids) {
  ids.map(function(id) {
    /**/
  });
  return {};
};

APIHandler.prototype.graph__stop = function(ids) {
  ids.map(function(id) {
    /**/
  });
  return {};
};

APIHandler.prototype.graph__get_records = function(ids) {
  var resp = [];
  var now = (new Date()).getTime();
  if (ids[0] !== "an_unique_id_req_res") {
    throw new Error("Cannot find the record with id: " + ids[0]);
  }

  var IP = "127.0.0.1", IP2 = "127.0.0.2";
  var DATA = "GET /index.html", DATA2 = "<html><body>Hello,World</body></html>";

  // Request
  var nr1 = {
    time: now,
    nodes: [{                 // record for Nodes
      id: "node_request_id",
      end: now + 500
    }]
  };

  // Request -> [Merge, Merge]
  var er1 = {
    time: now + 600,
    edges: [{                 // record for Edges
      id: "edge_id_1",
      data: IP
    }, {
      id: "edge_id_2",
      data: DATA
    }, {
      id: "edge_id_3",
      data: IP
    }, {
      id: "edge_id_4",
      data: DATA
    }]
  };

  // [Merge, Merge]
  var nr2 = {
    time: now + 610,
    nodes: [{
      id: "node_merge_id_1",
      end: now + 700
    }, {
      id: "node_merge_id_2",
      end: now + 700
    }]
  };

  // Merge -> [IP Processing, data Processing]
  var er2 = {
    time: now + 700,
    edges: [{
      id: "edge_id_5",
      data: IP
    }, {
      id: "edge_id_6",
      data: DATA
    }]
  };

  // Merge -> [IP Processing, data Processing]
  var er3 = {
    time: now + 700,
    edges: [{
      id: "edge_id_7",
      data: IP
    }, {
      id: "edge_id_8",
      data: DATA
    }]
  };

  // [IP Processing, data Processing]
  var nr3 = {
    time: now + 710,
    nodes: [{
      id: "node_ip_process_id_1",
      end: now + 710
    }, {
      id: "node_data_process_id_1",
      end: now + 900
    }]
  };

  // IP Processing:ip -> Response
  var er4 = {
    time: now + 711,
    edges: [{
      id: "edge_id_9",
      data: IP2
    }]
  };

  // [IP Processing, data Processing]
  var nr4 = {
    time: now + 710,
    nodes: [{
      id: "node_ip_process_id_2",
      end: now + 710
    }, {
      id: "node_data_process_id_2",
      end: now + 900
    }]
  };

  // IP Processing:data -> Response
  var er5 = {
    time: now + 711,
    edges: [{
      id: "edge_id_10",
      data: DATA2
    }]
  };

  // IP Processing -> Response
  var er6 = {
    time: now + 720,
    edges: [{
      id: "edge_id_11",
      data: IP2
    }, {
      id: "edge_id_12",
      data: DATA2
    }]
  };

  // Response
  var nr7 = {
    time: now + 900,
    nodes: [{
      id: "node_response_id",
      end: now + 1000
    }]
  };

  // Response
  var nr8 = {
    time: now + 950,
    nodes: [{
      id: "node_response_id",
      end: now + 1000
    }]
  };

  resp.push({
    id: ids[0],
    records:[nr1, er1, nr2, er2, er3, nr3, er4, nr4, er5, er6, nr7, nr8]
  });
  return resp;
};

APIHandler.prototype.spec_bundle__list = function() {
  var r = [];
  _.forOwn(hope_bundles, function(b) {
    r.push(_brief(b));
  });
  return r;
};

APIHandler.prototype.spec_bundle__get = function(ids) {
  return ids.map(function(id) {
    return hope_bundles[id];
  });
};

APIHandler.prototype.spec_bundle__get_for_specs = function(ids) {
  var bundles_needed = {}, bundle;
  _.each(ids, function(id) {
    bundle = hope_specs_index[id].bundle;
    bundles_needed[bundle.id] = bundle;
  });
  var r = [];
  _.forOwn(bundles_needed, function(b) {
    r.push(b);
  });
  return r;
};

APIHandler.prototype.hub__list = function() {
  var r = [];
  _.forOwn(hope_hubs, function(d) {
    r.push(_brief(d));
  });
  return r;
};

APIHandler.prototype.hub__get = function(ids) {
  return ids.map(function(id) {
    return hope_hubs[id];
  });
};


APIHandler.prototype.composer__load_spec = function(req) {
  if (!req.dev || !req.spec || req.dev !== master.id || !spec_storage[req.spec]) {
    throw new Error("Cannot load the spec with dev: " + req.dev + ", spec: " + req.spec);
  }
  var storage = spec_storage[req.spec];
  var exists = [];
  _.each(fs.readdirSync(storage), function(sp) {
    var stat2 = fs.statSync(storage + "/" + sp);
    if (!stat2.isDirectory() && sp !== "service.json") {
      exists.push(sp);
    }
  });

  //console.log("===> ", storage + "/service.json");
  var sj = JSON.parse(fs.readFileSync(storage + "/service.json"));
  if (_.isObject(sj.spec) && sj.spec.id) {
    return {
      spec: sj.spec,
      exists: exists,
      accepts: spec_scripts
    };
  }
  throw new Error("Invalid spec");
};

APIHandler.prototype.composer__load_files = function(req) {
  if (!req.dev || !req.spec || req.dev !== master.id || !spec_storage[req.spec]) {
    throw new Error("Cannot load files with dev: " + req.dev + ", spec: " + req.spec);
  }

  var res = [];
  _.forOwn(req.names, function(name) {
    var ctx = "";
    try {
      //console.log("===> ", spec_storage[req.spec] + "/" + name);
      ctx = String(fs.readFileSync(spec_storage[req.spec] + "/" + name));
    } catch(e) {
      console.log("Warning: fail to read file: " + name, "with error: ", e);
    }
    res.push({
      name: name,
      content: ctx
    });
  });
  return res;
};

APIHandler.prototype.composer__save_spec = function(req) {
  if (!req.dev || !req.spec || req.dev !== master.id || !spec_storage[req.spec]) {
    throw new Error("Cannot save spec with dev: " + req.dev + ", spec: " + req.spec);
  }

  try {
    var p = spec_storage[req.spec] + "/service.json";
    var sj = JSON.parse(fs.readFileSync(p));
    sj.spec = JSON.parse(req.content);
    fs.writeFileSync(p, JSON.stringify(sj, null, 4));
    var spec = _.find(master_spec_bundle.specs, "id", sj.spec.id);
    if (spec) {
      _.merge(spec, sj.spec);
    }
    else {
      master_spec_bundle.push(sj.spec);
    }
  } catch(e) {
    console.log("Warning: fail to write file: " + p, "with error: ", e);
  }
};

APIHandler.prototype.composer__save_files = function(req) {
  if (!req.dev || !req.spec || req.dev !== master.id || !spec_storage[req.spec]) {
    throw new Error("Cannot save files with dev: " + req.dev + ", spec: " + req.spec);
  }

  _.forOwn(req.files, function(file) {
    try {
      //console.log("===> ", spec_storage[req.spec] + "/" + name);
      fs.writeFileSync(spec_storage[req.spec] + "/" + file.name, file.content);
    } catch(e) {
      console.log("Warning: fail to write file: " + name, "with error: ", e);
    }
  });
};


//----------------------------------------------------------------
// Bootstrap
//----------------------------------------------------------------

web_app.post("/apis/dev", function(req, res) {
  var handler = new APIHandler(req, res);
  handler.process(req.body);
});

web_app.post("/apis/user", function(req, res) {
  var handler = new APIHandler(req, res);
  handler.process(req.body);
});


//////////////////////////////////////////////////////////////////
// Start
//////////////////////////////////////////////////////////////////

console.log("server started @ 8080");
server.listen(8080);

