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
var B = require("hope-base");
var P = require("hope-hub-center-shared").protocol;
var log = B.log.for_category("center");
var _ = require("lodash");
var FE = require("./frontend");
var HeartBeatServer = require("./heartbeat_server");
var BuiltinHub = require("./built_in_hub");

var Center =
module.exports = function(config) {
  config = config || {};
  this.type = "Center";
  this.id = config.id || B.unique_id("HOPE_CENTER_");
  this.name = config.name || this.id;
  this.description = config.description || this.name;
  this.mnode = B.check(config.mnode, "center", "Should have a mnode to create");
  this.em = B.check(config.entity_manager,
    "center", "Should have a entity_manager to create");
  this.config = config;
  this.config_path = config.config_path;
  B.check(config.appbundle_path, "center", "should have an app bundle");
  this.appbundle_path = B.path.abs(config.appbundle_path, this.config_path);
  this.user_setting = this.load_user_setting();
  this.frontends = {};

  this.errors = [];

  var self = this;
  B.set_exception_hook(function(e, category, msg, type) {
    var stack = B.get_raw_stack(e);
    var err = {
      time: new Date(),
      subsystem: self.name,
      category: category,
      type: type || B.err.CHECK_FAIL,
      message: msg,
      stack: stack.slice(1)
    };
    e.$type = err.type;
    self.announce_error(err);
  });

  B.net.set_exception_hook(function(err) {
    if (_.isError(err)) {
      if (!err.$check) {
        var stack = B.get_raw_stack(err);
        err.$type = B.err.UNHANDLED_EXCEPTION;
        self.announce_error({
          time: new Date(),
          subsystem: self.name,
          category: "Unhandled Exception",
          type: B.err.UNHANDLED_EXCEPTION,
          message: err.message,
          stack: stack
        });
      }
      return err.$type;
    }

    return to_string(err);
  });

  if (config.dev_web_app) {
    this.frontends.dev = new FE.DevFrontEnd(this, config.dev_web_app);

    //TODO: Export to session-manager
    global.$hope__dev_webapp = this.frontends.dev.web_app;
  }
  if (config.user_web_app) {
    this.frontends.user = new FE.UserFrontEnd(this, config.user_web_app);
  }

  if (this.frontends.dev) {
    this.frontends.dev.$forward = this.frontends.user;
  }

  if (config.heartbeat_server) {
    this.heartbeat_server = new HeartBeatServer(this, config.heartbeat_server);
  }

  this.built_in_hub = null;
  this.workflow_engine = config.workflow_engine;
  var self = this;
  this.workflow_engine.event.on("debug", function(data) {
    if (self.frontends.dev) {
      self.frontends.dev.graph_emit(data.workflow_id, "debug", data);
    }
  });
  this.workflow_engine.event.on("workflow_load", function(data) {
    _.forOwn(self.frontends, function(f) {
      f.setup_graph_socket(data.id);
    });
  });
};

Center.create$ = function(config) {
  var center = new Center(config);
  return center.init$().then(function() {
   return center;
 });
};

Center.prototype.get_info = function() {
  return {
    id: this.id,
    mnode_id: this.mnode.id
  };
};

Center.prototype.get_brief = function() {
  return {
    id: this.id,
    mnode_id: this.mnode.id
  };
};


Center.prototype.init$ = function() {
  var tasks = [];
  var self = this;
  tasks.push(this._init_em$());
  tasks.push(this.mnode.accept$(P.EM_FULLINFO, this.on_entities_fullinfo.bind(this)));
  tasks.push(this.mnode.accept$(P.CLAIM_AS_HUB, this.on_hub_claimed.bind(this)));
  tasks.push(this.mnode.subscribe_all$(P.ANNOUNCE_ERROR, this.announce_error.bind(this)));
  tasks.push(this.mnode.subscribe_all$(P.CLAIM_AS_HUB, this.on_hub_claimed.bind(this)));
  tasks.push(this.mnode.subscribe_all$(P.HUB_LEAVE, this.on_hub_left.bind(this)));
  tasks.push(this._init_frontends$());

  return Promise.all(tasks).then(function() {
    if (self.heartbeat_server) {
      self.heartbeat_server.enable();
    }
    return self.mnode.publish$(P.CLAIM_AS_CENTER, self.get_info());
  }).then(function() {
    return BuiltinHub.create$(self).then(function(hub) {
      self.built_in_hub = hub;
      return BuiltinHub.init$(hub, self);
    });
  }).then(function() {
    return self.mnode.enable_rpc$();
  }).then(function() {
    return self.em.app_store.list$().then(function(ids) {
      _.forEach(ids, function(id) {
        _.forOwn(self.frontends, function(f) {
          f.setup_app_socket(id);
        });
      });
    });
  }).then(function() {
    return self.em.graph_store.list$().then(function(ids) {
      _.forEach(ids, function(id) {
        _.forOwn(self.frontends, function(f) {
          f.setup_graph_socket(id);
        });
      });
    });
  });
};




Center.prototype.leave$ = function() {
  var self = this;

  return this.built_in_hub.leave$()
  .then(function() {
    self.mnode.disable_rpc$();
  })
  .then(function() {
    if (self.heartbeat_server) {
      self.heartbeat_server.disable();
    }
    var tasks = [];
    tasks.push(self.mnode.publish$(P.CENTER_LEAVE, self.get_brief()));
    tasks.push(self.mnode.clean_subscribe_all$());
    tasks.push(self.mnode.clean_subscribe$());
    tasks.push(self.mnode.clean_accepts$());
    return Promise.all(tasks);
  }).then(function() {
    return self.destroy_related_webapp$();
  }).finally(function() {
    return self.mnode.dispose$();
  });
};

Center.prototype.destroy_related_webapp = function() {
  var all = [];
  if (this.config.user_web_app) {
    all.push(this.config.user_web_app.$destroy());
  }
  if (this.config.dev_web_app) {
    all.push(this.config.dev_web_app.$destroy());
  }
  return Promise.all(all);
};

Center.prototype.on_hub_claimed = function(hub_info) {
  log("Hub Claimed", hub_info);
  var self = this;
  var hub_id = hub_info.id;
  var hub_mnode_id = hub_info.mnode_id;
  self.beat$(hub_id).done();//beat
  this.make_lock(hub_id).lock_as_promise$(function() {
    return self.em.hub__get$(hub_id)
    .then(function(hub) {
      if (_.isUndefined(hub)) {
        log("Found New Hub", hub_info);
        var tasks = [];
        tasks.push(self.mnode.subscribe$(hub_mnode_id, P.EM_CHANGED, self.on_entities_changed.bind(self)));
        tasks.push(self.mnode.send$(hub_mnode_id, P.NEED_EM_FULLINFO, self.get_info()));

        return Promise.all(tasks);
      }
    });
  }).done();
};

Center.prototype.force_hub_leave = function(hub_id) {
  var self = this;
  this.make_lock(hub_id).lock_as_promise$(function() {
    return self.em.hub__get$(hub_id).then(function(hub) {
      if (hub) {
        self.on_hub_left({
          id: hub_id,
          mnode_id: hub.mnode
        });
      }
    });
  }).done();
};

Center.prototype.on_hub_left = function(hub_brief) {
  log("Hub Left", hub_brief);
  var self = this;
  this.make_lock(hub_brief.id).lock_as_promise$(function() {
    return self.em.hub__remove$(hub_brief.id)
    .then(function() {
      if (self.heartbeat_server) {
        return self.heartbeat_server.leave$(hub_brief.id);
      }
    })
    .then(function() {
      var tasks = [];
      tasks.push(self.mnode.clean_subscribe$(hub_brief.mnode_id));
      return Promise.all(tasks);
    });
  }).done();
};

Center.prototype.on_entities_changed = function(data) {
  var hub_id = data.hub;
  var hub_mnode_id = data.hub_mnode_id;
  var list = data.list;
  var time = data.time;
  var self = this;
  self.beat$(hub_id).done();//beat
  log("EM_CHANGED From Hub", hub_id, data);
  this.make_lock(hub_id).lock_as_promise$(function() {
    return self.em.hub__get$(hub_id)
    .then(function(hub) {
      if (_.isUndefined(hub)) {
        log("EM_CHANGED hub not exist", hub_id);
        return self.mnode.send$(hub_mnode_id, P.NEED_EM_FULLINFO, self.get_info());
      }
      else if (check_emchanged_time_match(time, hub.timestamp)) {
        log("EM_CHANGED match", hub_id, time, "existing timestamp:", hub.timestamp);
        return self.em.update$(list)
        .then(function() {
          return self.em.hub__get$(hub_id);
        })
        .then(function(new_hub) {
          return self._set_hub_timestamp$(new_hub, time);
        });
      }
      else if (check_emchanged_time_new(time, hub.timestamp)) {
        log("EM_CHANGED ahead", hub_id, time, "existing timestamp:", hub.timestamp);
        return self.mnode.send$(hub_mnode_id, P.NEED_EM_FULLINFO, self.get_info());
      }
      else {
        log("EM_CHANGED old", hub_id, time, "existing timestamp:", hub.timestamp);
        return;
      }
    });
  }).done();
};

Center.prototype.on_entities_fullinfo = function(data) {
  var hub_id = data.hub;
  var list = data.list;
  var time = data.time;
  var self = this;
  self.beat$(hub_id).done();//beat
  log("EM_FULLINFO From Hub", hub_id);
  this.make_lock(hub_id).lock_as_promise$(function() {
    return self.em.hub__get$(hub_id)
    .then(function(hub) {
      if (_.isUndefined(hub)) {
        log("FULLINFO of New Hub", hub_id, time);
        return self.em.update$(list)
        .then(function() {
          return self.em.hub__get$(hub_id);
        })
        .then(function(new_hub) {
          return self._set_hub_timestamp$(new_hub, time);
        });
      }
      else if (check_fullinfo_time(time, hub.timestamp)) {
        log("FULLINFO of Existing Hub", hub_id, time, "existing timestamp:", hub.timestamp);
        return self.em.hub__remove$(hub_id)
        .then(function() {
          return self.em.update$(list);
        })
        .then(function() {
          return self._set_hub_timestamp$(hub, time);
        });
      }
      else {
        log("Old FULLINFO", hub_id, time, "existing timestamp:", hub.timestamp);
        return;
      }
    });
  }).done();
};

Center.prototype._ensure_user_exists$ = function(user, role, passwd) {
  var self = this;
  return self.em.user__find$(user, null).then(function(u) {
    if (u) {
      return false;
    }
    self.em.user__add$({
      id: user,
      name: user,
      role: role,
      passwd: passwd,
      appbundle_path: B.path.join(self.appbundle_path, user)
    });
    return true;
  });
};

Center.prototype._init_em$ = function() {
  var self = this;
  if (this.config.auth) {
    // default password is ""
    return self._ensure_user_exists$("admin", "admin", "LcCbizWvnANvw/Kc28Bfuw==").then(function(added) {
      if (!added) {
        // guest can be deleted
        return Promise.resolve();
      }
      return self._ensure_user_exists$("guest", "guest", "7lf26KynsWJIvOEM9QWHVQ==");
    });
  }
  return self.em.app__load_from_bundle$(self.appbundle_path, null);
};

Center.prototype._set_hub_timestamp$ = function(hub, timestamp) {
  hub.timestamp = timestamp;
  return this.em.hub_store.set$(hub.id, hub);
};

Center.prototype._init_frontends$ = function() {
  var tasks = [];

  if (this.frontends.dev) {
    tasks.push(this.frontends.dev.init$());
  }
  if (this.frontends.user) {
    tasks.push(this.frontends.user.init$());
  }
  return Promise.all(tasks);
};

Center.prototype.make_lock = function(key) {
  return B.lock.make("__HOPE__/CENTER/" + this.id + "/" +
    (_.isUndefined(key) ? "" : key));
};

Center.prototype.beat$ = function(hub_id) {
  var self = this;
  return Promise.resolve()
  .then(function() {
    if (self.heartbeat_server) {
      return self.heartbeat_server.beat$(hub_id);
    }
  });
};
// -----------------------------------------------
// Workflow related. all lock the graph_id.
//              each operation is atomic
// -----------------------------------------------
Center.prototype.workflow_create$ = function(graph) {
  _.forOwn(this.frontends, function(f) {
    f.setup_graph_socket(graph.id);
  });
  return this.em.graph__add$(graph);
};

Center.prototype.workflow_create_nr$ = function(graph) {
  _.forOwn(this.frontends, function(f) {
    f.setup_graph_socket(graph.id);
  });
  return this.em.graph__add_nodered$(graph, this.built_in_hub.id);
};


Center.prototype.workflow_update$ = function(graph) {
  _.forOwn(this.frontends, function(f) {
    f.setup_graph_socket(graph.id);
  });
  return this.em.graph__update$(graph);
};

Center.prototype.workflow_start$ = function(graph_id, tracing) {
  log("workflow_start", graph_id);
  var self = this;
  var graph;
  return this.make_lock(graph_id).lock_as_promise$(function() {
    return self.em.graph__get$(graph_id)
    .then(function(graph_json) {
      var specid_array = [];
      graph_json.graph.nodes.forEach(function(node) {
        specid_array.push(node.spec);
      });
      graph = graph_json;
      return self.em.spec__get$(specid_array);
    })
    .then(function(specs) {
      graph = self.em.graph__remove_unused_nr_config_node(graph, specs);
      // The specs we got from database is an array
      // However, the engine expects a hashtable for the specs
      // so need index it first
      return self.workflow_engine.start$(graph,
        _.keyBy(specs, "id"), tracing);
    });
  });
};

Center.prototype.workflow_remove$ = function(id) {
  if (this.workflow_engine.workflows[id] &&
    this.workflow_engine.workflows[id].status === "enabled") {
    return Promise.reject(new Error("workflow " + id + " is still running and cannot remove!"));
  }
  delete this.workflow_engine.workflows[id];
  _.forOwn(this.frontends, function(f) {
    f.remove_graph_socket(id);
  });
  return this.em.graph__remove$(id);
};


Center.prototype.workflow_get_status = function(graph_id) {
  // need to interpret internal status to external
  switch (this.workflow_engine.get_status(graph_id)) {
    case "unloaded":
      return "Non-exist";
    case "enabled":
      return "Working";
    case "disabled":
      return "Paused";
    case "installed":
      return "Stopped";
    case "loaded":
      return "Idle";
  }
};

Center.prototype.workflow_get_trace = function(graph_id) {
  log("workflow_get_trace", graph_id);
  return this.workflow_engine.get_trace(graph_id).trace;
};

Center.prototype.workflow_get_debug_trace = function(graph_id) {
  log("workflow_get_debug_trace", graph_id);
  return this.workflow_engine.get_debug_trace(graph_id).trace;
};

Center.prototype.workflow_set_debug_for_node$ = function(graph_id, node_id, is_debug) {
  log("workflow_set_debug_for_node", graph_id);
  var self = this;
  // We need to persistent this change as well
  return this.make_lock(graph_id).lock_as_promise$(function() {
    self.workflow_engine.set_debug_for_node(graph_id, node_id, is_debug);
    return self.workflow_update$(
      self.workflow_engine.ensure_get_workflow(graph_id).json);
  });
};


Center.prototype.workflow_stop$ = function(graph_id) {
  log("workflow_stop", graph_id);
  var self = this;
  return this.make_lock(graph_id).lock_as_promise$(function() {
    return self.workflow_engine.stop$(graph_id);
  });
};

Center.prototype.workflow_pause$ = function(graph_id) {
  log("workflow_pause", graph_id);
  var self = this;
  return this.make_lock(graph_id).lock_as_promise$(function() {
    return self.workflow_engine.pause$(graph_id);
  });
};

Center.prototype.workflow_resume$ = function(graph_id) {
  log("workflow_resume", graph_id);
  var self = this;
  return this.make_lock(graph_id).lock_as_promise$(function() {
    return self.workflow_engine.resume$(graph_id);
  });
};


// -------------------------------------------------
// Helper
// -------------------------------------------------
function check_fullinfo_time(coming_time, existing_time) {
  return B.time.compare_hrtime(coming_time.now, existing_time.now) === 1;
}

function check_emchanged_time_match(coming_time, existing_time) {
  return B.time.compare_hrtime(coming_time.last, existing_time.now) === 0;
}


function check_emchanged_time_new(coming_time, existing_time) {
  return B.time.compare_hrtime(coming_time.now, existing_time.now) === 1;
}

Center.prototype.get_user_proxy = function(type, hub_id) {
  var self = this;
  type = type || "Center";
  if(type === "Center") {
    return self.user_setting.proxy;
  } else {
    B.check(hub_id, "center", "get hub user proxy must provide hub_id");
    self.em.hub__get$(hub_id).then(function(hub) {
      return self.mnode.invoke_rpc$(hub.mnode, "get_user_proxy");
    });
  }
};

Center.prototype.set_user_proxy = function(value) {
  var self = this;
  var apply_to_all_hub = value.apply_to_all_hub;
  delete value['apply_to_all_hub'];
  this.user_setting.proxy = value;
  this.store_user_setting();
  if(apply_to_all_hub) {
    this.em.hub__list$().then(function(hubs) {
      hubs = hubs || [];
      hubs.map(function(hub) {
        if(hub.type !== "builtin") {
          self.mnode.invoke_rpc$(hub.mnode, "set_user_proxy", value);
        }
      });
    }).then(function() {
      return;
    });
  }
};

Center.prototype.get_npm_account = function() {
  return this.user_setting.npm;
};

Center.prototype.set_npm_account = function(value) {
  this.user_setting.npm = value;
  this.store_user_setting();
};
Center.prototype.load_user_setting = function() {
  var json_path = B.path.abs("./user_setting.json", this.config.config_path);
  var user_setting = {};
  if(B.fs.file_exists(json_path)) {
    var json_content = B.fs.read_json(json_path);
    user_setting = json_content?json_content:{};
  } else {
    user_setting = {npm:{},proxy:{}};
    B.fs.write_json(json_path, user_setting);
  }
  return user_setting;
};

Center.prototype.store_user_setting = function() {
  var json_path = B.path.abs("./user_setting.json", this.config.config_path);
  B.fs.write_json(json_path, this.user_setting);
};



// -------------------------------------------------
// rpc invoke
// -------------------------------------------------

Center.prototype.add_hope_thing$ = function(thing) {
  var self = this;
  return this.em.hub__get$(thing.hub)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "add_hope_thing", thing);
  })
  .then(function(data) {
    self.on_entities_changed(data);
    return;
  });
};

Center.prototype.install_hope_thing$ = function(hub_id, name, version) {
  var self = this;
  var send_hub = hub_id;
  return this.em.hub__get$(hub_id)
    .then(function(hub) {
      send_hub = hub;
      return self.mnode.invoke_rpc$(hub.mnode, "install_hope_thing", [name, version, hub_id]);
    })
    .then(function(data) {
      self.on_entities_changed(data);
      return;
    });
};

Center.prototype.update_hope_thing$ = function(thing) {
  var self = this;
  return this.em.thing__get_hub$(thing.id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "update_hope_thing", thing);
  })
  .then(function(data) {
    self.on_entities_changed(data);
    return;
  });
};

Center.prototype.remove_hope_thing$ = function(thing_id) {
  var self = this;
  return this.em.thing__get_hub$(thing_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "remove_hope_thing", thing_id);
  })
  .then(function(data) {
    self.on_entities_changed(data);
    return;
  });
};

Center.prototype.add_hope_service$ = function(service) {
  var self = this;
  return this.em.thing__get_hub$(service.thing)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "add_hope_service", service);
  })
  .then(function(data) {
    self.on_entities_changed(data);
    return;
  });
};

Center.prototype.install_hope_service$ = function(thing, name, version) {
  var self = this;
  return this.em.thing__get_hub$(thing)
    .then(function(hub) {
      return self.mnode.invoke_rpc$(hub.mnode, "install_hope_service", [name, version, thing]);
    })
    .then(function(data) {
      self.on_entities_changed(data);
      return;
    });
};

Center.prototype.update_hope_service$ = function(service) {
  var self = this;
  return this.em.service__get_hub$(service.id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "update_hope_service", service);
  })
  .then(function(data) {
    self.on_entities_changed(data);
    return;
  });
};

Center.prototype.remove_hope_service$ = function(service_id) {
  var self = this;
  return this.em.service__get_hub$(service_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "remove_hope_service", service_id);
  })
  .then(function(data) {
    self.on_entities_changed(data);
    return;
  });
};

Center.prototype.list_service_files$ = function(service_id) {
  var self = this;
  return this.em.service__get_hub$(service_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "list_service_files", service_id);
  });
};

Center.prototype.read_service_file$ = function(service_id, file_path) {
  var self = this;
  return this.em.service__get_hub$(service_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "read_service_file", [service_id, file_path]);
  });
};

Center.prototype.write_service_file$ = function(service_id, file_path, content) {
  var self = this;
  var hub;
  B.check(!self.workflow_engine.has_started_workflows(), "center",
    "there still has started workflows, cannnot write_service_file");
  return this.em.service__get_hub$(service_id)
  .then(function(_hub) {
    hub = _hub;
    return self.mnode.invoke_rpc$(hub.mnode, "write_service_file", [service_id, file_path, content]);
  })
  .then(function() {
    return self.mnode.invoke_rpc$(hub.mnode, "reload_service", service_id);
  });
};

Center.prototype.remove_service_file$ = function(service_id, file_path) {
  var self = this;
  var hub;
  B.check(!self.workflow_engine.has_started_workflows(), "center",
    "there still has started workflows, cannnot remove_service_file");
  return this.em.service__get_hub$(service_id)
  .then(function(_hub) {
    hub = _hub;
    return self.mnode.invoke_rpc$(hub.mnode, "remove_service_file", [service_id, file_path]);
  })
  .then(function() {
    return self.mnode.invoke_rpc$(hub.mnode, "reload_service", service_id);
  });

};


Center.prototype.publish_hope_service$ = function(service_id, package_json) {
  var settings = {};
  var self = this;

  if (self.user_setting) {
    var proxy = self.user_setting.proxy;
    if (proxy && proxy.http_proxy) {
      settings.http = proxy.http_proxy;
    }
    if (proxy && proxy.https_proxy) {
      settings.https = proxy.https_proxy;
    }

    var npm = self.user_setting.npm;
    if (npm && npm.token) {
      settings.auth = {token: npm.token};
    }
    else if (npm && npm.username) {
      settings.auth = {username: npm.username, password: npm.password, email: npm.email};
    }
  }
  return this.em.service__get_hub$(service_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "publish_hope_service", [service_id, package_json, settings]);
  });
};

Center.prototype.install_service_package$ = function(service_id, package_name, version) {
  var self = this;
  return this.em.service__get_hub$(service_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "install_service_package", [service_id, package_name, version]);
  });
};

Center.prototype.uninstall_service_package$ = function(service_id, package_name) {
  var self = this;
  return this.em.service__get_hub$(service_id)
  .then(function(hub) {
    return self.mnode.invoke_rpc$(hub.mnode, "uninstall_service_package", [service_id, package_name]);
  });
};

var exc_seq = 1;

Center.prototype.announce_error = function(e) {
  e.seq = exc_seq++;
  if (this.frontends.dev) {
    this.frontends.dev.sys_emit("error", e);
  }
  if (this.errors.length > 200) {
    this.errors = this.errors.slice(-100);
  }
  this.errors.push(e);
  console.log(e);
};
