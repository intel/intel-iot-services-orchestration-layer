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
//
// GraphStore is a singleton that manages GraphView.
// 
// TODO: Although currently we always assume that only one GraphView in 
// the system, but we might change (with some refactor) to allow multiple 
// graph views be shown.
//
// 
//////////////////////////////////////////////////////////////////

import {EventEmitter} from "events";
import Graph from "../lib/graph";
import GraphView from "../lib/graph_view";

class GraphStore extends EventEmitter {
  constructor() {
    super();

    this.views = {};
    this.active_view = null;
    this.no_active_reason = "";


    // FLUX
    var self = this;
    function _register(action_names) {
      var items = {};
      _.forOwn(action_names, n => {
        items[n] = self.handle_action.bind(self, n); 
      });
      $hope.register_action_handler(items);    
    }
    _register([
      "graph/set_active",
      "graph/close",
      "graph/save",
      "graph/remove",
      "graph/start",
      "graph/save_and_start",
      "graph/stop_replay",
      "graph/stop",
      "graph/replay",
      "graph/step",
      "graph/undo",
      "graph/redo",
      "graph/copy",
      "graph/paste",
      
      "graph/move",
      "graph/zoom",
      "graph/fit",
      "graph/autolayout",
      "graph/create/node",
      "graph/remove/node",
      "graph/change/node",
      "graph/merge_styles/node",
      "graph/move/node",
      "graph/resize/node",

      "graph/create/edge",
      "graph/remove/edge",
      "graph/change/edge",
      "graph/merge_styles/edge",

      "graph/unselect/all",
      "graph/select/node",
      "graph/unselect/node",
      "graph/select/edge",
      "graph/unselect/edge",
      "graph/remove/selected",
      "graph/select/port",

      "graph/animate/edge",
      "graph/unanimate/edge",
      "graph/animate/node",
      "graph/unanimate/node"

    ]);
  }

  // Get the view
  view(id) {
    return this.views[id];
  }

  set_active(id) {
    this.active_view = null;
    this.no_active_reason = "loading";
    this.ensure_graph_loaded$(id).then(view => {
      this.active_view = view;
      this.no_active_reason = "";
      this.emit("graph", {type: "graph", id: id, event: "set_active"});
    }).catch(err => {
      $hope.check_warn(false, "Graph", "failed due to", err);
      console.log(err.stack);
      this.no_active_reason = $hope.error_to_string(err);
      $hope.notify("error", __("Failed to show the workflow because"),
        this.no_active_reason);
      
      this.emit("graph", {type: "graph", id: id, event: "set_active"});
    }).done();
  }

  save_and_start() {
    var view = this.active_view;

    if (!view) {
      return;
    }
    this.save_active$().then(() => {
      view.set_modified(false);
      this.emit("graph", {type: "graph", id: view.id, event: "saved"});
      return $hope.app.server.graph.start$([view.id]);
    }).then(() => {
      this.emit("graph", {type: "graph", id: view.id, event: "started"});
    }).catch(err => {
      $hope.notify("error", __("Failed to start workflow because"), err.message);
    }).done();
  }

  start(ids, tracing) {
    $hope.app.server.graph.start$(ids, tracing).then(() => {
      ids.map(id => {
        this.emit("graph", {type: "graph", id: id, event: "started"});
      });
    }).catch(err => {
      $hope.notify("error", __("Failed to start workflow because"), err.message);
    }).done();
  }

  stop(ids) {
    return $hope.app.server.graph.stop$(ids).then(() => {
      ids.map(id => {
        this.emit("graph", {type: "graph", id: id, event: "stoped"});
      });
    }).catch(err => {
      $hope.notify("error", __("Failed to stop workflow because"), err.message);
    }).done();
  }

  replay(id) {
    var view = this.view(id);
    delete view.$logs;
    view.graph.nodes.forEach(node => {
      delete node.$time;
      delete node.$lasttim;
      delete node.$lastdat;
    });
    view.graph.edges.forEach(edge => {
      delete edge.$lastdat;
      delete edge.$lasttim;
    });

    $hope.app.server.graph.trace$([id]).then(data => {
      if (!_.isArray(data) || data.length < 1 || !_.isArray(data[0].trace) || data[0].trace.length < 1) {
        this.stop_replay();
        $hope.notify("warning", __("Workflow executed without tracing"));
        return;
      }
      view.$logs = data[0].trace;
      view.$logidx = 0;
      this.emit("graph", {id: id, type: "graph", event: "trace/loaded"});
    }).catch(err => {
      $hope.notify("error", __("Failed to get workflow trace because"), err.message);
    }).done();
  }

  stop_replay() {
    var view = this.active_view;

    if (!view) {
      return;
    }
    this.emit("graph", {type: "graph", id: view.id, event: "stoped"});
  }

  ensure_graph_loaded$(id) {
    var d = $Q.defer();  
    if (this.view(id)) {
      d.resolve(this.view(id));
    } else {
      $hope.app.stores.app.ensure_apps_loaded$().then(()=> {
        return this.load_graph$(id);
      }).then(view => d.resolve(view))
        .catch(err => d.reject(err)).done();
    }
    return d.promise;
  }

  // Load and add view
  // for graph, we need to load all specs it uses
  // but for hubs it uses, it's ok if we failed to get their information
  load_graph$(id) {
    var graph_json;
    return $hope.app.server.graph.get$([id]).then(g => {
      if (!_.isArray(g) || !g.length === 1 || !g[0]) { 
        throw new Error("No graph found for this id");
      }
      graph_json = g[0];
      // not return a promise
      // we only tries to load the hub but it is ok if not all hubs 
      // are loaded. Its result doesn't impact the later pipeline
      $hope.app.stores.hub.ensure_hubs_loaded$(
        Graph.get_all_hub_ids_used(graph_json)).catch((err) => {
          $hope.log.warn("Graph", "load_graph$", "has error when load hubs", err);
          $hope.trigger_action("notify", {
            level: "warning",
            message: err
          });
        });
    }).then(() => {
      return $hope.app.stores.spec.ensure_specs_loaded$(
        Graph.get_all_spec_ids_used(graph_json));
    }).then(() => {
      return $hope.app.stores.app.ensure_apps_loaded$();
    }).then(() => {
      var app = $hope.app.stores.app.get_app_by_graph_id(id);
      if (app) {
        return $hope.app.stores.ui.ensure_uis_loaded$(
          $hope.app.stores.ui.get_all_ui_ids_of_app(app.id));
      }
    }).then(() => {
      return $hope.app.server.graph.status$([id]);
    }).then((status) => {
      var view = new GraphView(new Graph(graph_json));
      this.views[view.id] = view;
      if (_.isArray(status) && status[0].graph === id) {
        switch(status[0].status) {
          case "Working":
            view.set_running();
            break;
          default:
            view.set_editing();
            break;
        }
      }
      return view;
    });
  }

  handle_changed_event(started, stoped) {
    if (_.isArray(started)) {
      _.forEach(started, id => {
        var v = this.view(id);
        if (v) {
          v.set_running();
          if (this.active_view && this.active_view.id === id) {
            this.emit("graph", {type: "graph", id: id, event: "status/changed"});
          }
        }
      });
    }
    if (_.isArray(stoped)) {
      _.forEach(stoped, id => {
        var v = this.view(id);
        if (v) {
          if (this.active_view && this.active_view.id === id) {
            this.emit("graph", {type: "graph", id: id, event: "status/changed"});
          }
          else {
            v.set_editing();
          }
        }
      });
    }
  }

  save_active$() {
    var d = $Q.defer();
    if (!this.active_view) {
      d.resolve();
    }
    var method, params, view = this.active_view;
    var data = view.graph.$serialize();
    var backend = $hope.app.server;

    method = backend.graph.update$.bind(backend.graph);
    params = [data];

    method(...params).then(() => d.resolve())
                     .catch(err => d.reject(err)).done();
    return d.promise;
  }

  save() {
    var view = this.active_view;

    if (!view) {
      return;
    }
    this.save_active$().then(() => {
      view.set_modified(false);
      this.emit("graph", {type: "graph", id: view.id, event: "saved"});
    }).catch(err => {
      $hope.notify("error", __("Failed to save workflow because"), err.message);
    }).done();
  }

  close(id) {
    var v = this.view(id);
    if (!v) {
      return;
    }

    if (v === this.active_view) {
      this.active_view = null;
      this.no_active_reason = "closing";
      this.emit("graph", {type: "graph", id: null, event: "set_active"});
    }

    delete this.views[id];
  }

  remove(ids) {
    ids.map(id => {
      if (this.views[id] === this.active_view) {
        this.active_view = null;
        this.no_active_reason = "closed";
      }
      delete this.views[id];
    });
    $hope.app.server.graph.remove$(ids).then(data => {
      if (data.error) {
        $hope.trigger_action("notify", {
            level: "warning",
            message: data.error
          });
        return;
      }

      ids.map(id => {
        this.emit("graph", {type: "graph", id: id, event: "removed"});
      });
    }).catch(err => {
      $hope.notify("error", __("Failed to delete workflow because"), err.message);
    }).done();
  }


  get_all_graph_ids_used() {
    var ids = [];
    _.forOwn(this.views, view => {
      ids.push(view.id);
    });
    return ids;
  }

  get_all_spec_ids_used() {
    var ids = [];
    _.forOwn(this.views, view => {
      ids = _.uniq(ids.concat(view.graph.get_all_spec_ids_used()));
    });
    return ids;
  }

  get_all_hub_ids_used() {
    var ids = [];
    _.forOwn(this.views, view => {
      ids = _.uniq(ids.concat(view.graph.get_all_hub_ids_used()));
    });
    return ids;
  }

  find_view(app_id, name) {
    var view = null;
    _.forOwn(this.views, v => {
      if (name === v.graph.name && app_id === v.get_app_id()) {
        view = v;
        return false;
      }
    });
    return view;
  }

  clear_cache() {
    this.views = {};
    this.active_view = null;
    this.no_active_reason = "";
  }

  // See graph_action.js for schema of data
  handle_action(action, data) {
    switch (action)
    {
      case "graph/set_active":
        this.set_active(data.graph_id);
        break;

      case "graph/save":
        this.save();
        break;

      case "graph/close":
        this.close(data.graph_id);
        break;
      
      case "graph/remove":
        this.remove(data.graphs);
        break;

      case "graph/start":
        this.start(data.graphs, data.tracing);
        break;

      case "graph/save_and_start":
        this.save_and_start();
        break;

      case "graph/stop_replay":
        this.stop_replay();
        break;

      case "graph/stop":
        this.stop(data.graphs);
        break;

      case "graph/replay":
        this.replay(data.graph_id);
        break;

      default:
        var view = this.view(data.graph_id);

        if (!view) {
          $hope.log.warn("GraphStore", "View not found when handle action", action,
            "with data", data);
          return; 
        }

        view.handle_action(action, data);
        break;
    }
  }

}

export default new GraphStore();