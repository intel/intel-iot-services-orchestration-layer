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
// It is a singleton
//////////////////////////////////////////////////////////////////


import {EventEmitter} from "events";

class AppStore extends EventEmitter {

  constructor() {
    super();

    this.manager = require("../lib/app");
    this.running_workflows = [];
    
    var self = this;
    function _register(action_names) {
      var items = {};
      _.forOwn(action_names, n => {
        items[n] = self.handle_action.bind(self, n); 
      });
      $hope.register_action_handler(items);    
    }

    _register([
      "app/create/app",
      "app/remove/app",
      "app/update/app"
    ]);
  }

  get_app_by_graph_id(id) {
    var app;
    _.forOwn(this.get_all_apps(), a => {
      _.forOwn(a.graphs, g => {
        if (g.id === id) {
          app = a;
          return false;
        }
      });
      if (app) {
        return false;
      }
    });
    return app;
  }

  get_app_by_ui_id(id) {
    var app;
    _.forOwn(this.get_all_apps(), a => {
      _.forOwn(a.uis, ui => {
        if (ui.id === id) {
          app = a;
          return false;
        }
      });
      if (app) {
        return false;
      }
    });
    return app;
  }

  get_app(id) {
    return this.manager.get_app(id);
  }

  get_all_apps() {
    return this.manager.apps;
  }

  ensure_apps_loaded$() {
    var apps = this.get_all_apps();
    var d = $Q.defer();  
    if (!_.isEmpty(apps)) {
      d.resolve(apps);
    } else {
      $hope.app.server.app.list$().then(data => {
        this.manager.update_all_apps(data);

        var reqs = [];
        _.forOwn(this.get_all_apps(), a => {
          reqs = reqs.concat(_.map(a.graphs, "id"));
        });

        $hope.app.server.graph.status$(reqs).then((sts) => {
          _.forEach(_.filter(sts, ["status", "Working"]), st => {
            this.running_workflows.push(st.graph);
          });
          d.resolve(this.get_all_apps());
        });
      }).catch(err => d.reject(err)).done();
    }
    return d.promise;
  }

  is_workflow_running(id) {
    return this.running_workflows.indexOf(id) >= 0;
  }

  create_app(name, desc) {
    $hope.app.server.app.create$(name, desc).done(data => {
      if (data.error) {
        $hope.notify("error", __("Failed to create app because"), data.error);
        return;
      }
      this.manager.create_app(data);
      this.emit("app", {type: "app", event: "created", appid: data.id});
    });
  }

  remove_app(id) {
    $hope.app.server.app.remove$(id).done(data => {
      if (data.error) {
        $hope.notify("error", __("Failed to delete app because"), data.error);
        return;
      }
      this.manager.remove_app(id);
      this.emit("app", {type: "app", event: "removed"});
    });
  }
  
  update_app(id, props) {
    $hope.app.server.app.update$(id, props).done(data => {
      if (data.error) {
        $hope.notify("error", __("Failed to update app because"), data.error);
        return;
      }
      this.manager.update_app(id, props);
      this.emit("app", {type: "app", event: "updated"});
    });
  }

  active_app(check) {
    if (!check) {
      this.emit("app", {type: "app", app: null, event: "actived"});
      return;
    }
    this.ensure_apps_loaded$().done(apps => {
      _.forOwn(apps, a => {
        if (check(a)) {
          this.emit("app", {type: "app", app: a, event: "actived"});
          return false;
        }
      });
    });
  }

  clear_cache() {
    this.running_workflows = [];
    this.manager.clear_cache();
  }

  handle_changed_event(started, stoped) {
    if (_.isArray(started)) {
      _.forEach(started, id => {
        if (this.running_workflows.indexOf(id) < 0) {
          this.running_workflows.push(id);
        }
      });
    }
    if (_.isArray(stoped)) {
      _.forEach(stoped, id => {
        _.pull(this.running_workflows, id);
      });
    }
    this.emit("wfe/changed", {});
  }


  handle_action(action, data) {
    switch(action) {
    case "app/create/app":
      this.create_app(data.name, data.description);
      break;

    case "app/remove/app":
      this.remove_app(data.id);
      break;

    case "app/update/app":
      this.update_app(data.id, data.props);
      break;
    }
  }
}



export default new AppStore();