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
var log = B.log.for_category("hub");
var exec = require("child_process").exec;
var _ = require("lodash");

var Hub =
module.exports = function(config) {
  config = config || {};
  this.id = config.id || B.unique_id("HOPE_HUB_");
  this.name = config.name || this.id;
  this.description = config.description || this.name;
  this.mnode = B.check(config.mnode, "hub", "Should have a mnode there");
  this.em = B.check(config.entity_manager,
    "hub", "Should have a entity_manager to create");
  this.config = config;
  // could be builtin (the built_in_hub of center) or others ...
  this.type = this.config.type || "normal";
  this.config_path = config.config_path;
  config.heartbeat = config.heartbeat || {};
  this.heartbeat_interval = config.heartbeat.interval || 60000;
  this.sm = config.session_manager;
  this.user_proxy = this.load_user_proxy();

  if (this.type === "builtin") {
    return;
  }

  var self = this;
  B.set_exception_hook(function(e, category, msg) {
    var stack = B.get_raw_stack(e);
    var err = {
      time: new Date(),
      subsystem: self.name,
      category: category,
      type: B.err.CHECK_FAIL,
      message: msg,
      stack: stack.slice(1)
    };
    self.mnode.publish$(P.ANNOUNCE_ERROR, err).done();
  });
};

// Full details of the hub
Hub.prototype.get_info = function() {
  return {
    id: this.id,
    mnode_id: this.mnode.id
  };
};

// Brief details of the hub
Hub.prototype.get_brief = function() {
  return {
    id: this.id,
    mnode_id: this.mnode.id
  };
};

Hub.prototype.init$ = function() {
  var self = this;
  return Promise.resolve()
  .then(function() {
    return self._call_init_script$();
  })
  .then(function() {
    return self._init_em$();
  })
  .then(function() {
    return self._subscribe_topics$();
  })
  .then(function() {
    return self.mnode.publish$(P.CLAIM_AS_HUB, self.get_info());
  }).then(function() {
    //subscribe events
    self._subscribe_events();
    // start the heartbeat
    self.hb_timer = setInterval(function() {
      self.mnode.publish$(P.HEARTBEAT, {
        id: self.id,
        em_timestamp: {
          now: self.em.timestamp,
          last: self.em.timestamp_old
        },
        mnode_id: self.mnode.id
      });
    }, self.heartbeat_interval);
  }).then(function() {
    //define rpc
    return self.define_rpc$();
  });

};

Hub.prototype._call_init_script$ = function() {
  var self = this;
  if (_.isUndefined(self.config.init_script_path)) {
    log("no init script");
    return;
  }
  var init_script_path = B.path.abs(self.config.init_script_path, self.config_path);
  if (!B.fs.file_exists(init_script_path)) {
    log.warn("init script not found", init_script_path);
    return;
  }
  log("call init script:", init_script_path);
  return self.sm.run_hub_script$(init_script_path);
};


Hub.prototype._init_em$ = function() {
  var self = this;
  return Promise.resolve()
  .then(function() {
    var myhub = {
      id: self.id,
      name: self.name,
      description: self.description,
      mnode: self.mnode.id,
      type: self.type,
      things: []
    };
    return self.em.hub__add$(myhub);
  })
  .then(function() {
    var tasks = [];
    var spec_bundle = {
      id: "SpecBundle" + self.id,
      name: "default_bundle"
    };
    //for hope-service
    if (self.config.thingbundle_path) {
      var thingbundle_path = B.path.abs(self.config.thingbundle_path, self.config_path);
      tasks.push(self.em.thing__load_from_bundle$(thingbundle_path, spec_bundle, self.id));
    }

    if (self.config.specbundle_path) {
      var specbundle_path = B.path.abs(self.config.specbundle_path, self.config_path);
      tasks.push(self.em.spec__load_from_localbundle$(specbundle_path));
    }

    if (self.config.noderedbundle_path) {
      var spec_nodered_bundle = {
        id: "SpecNodeRedBundle" + self.id,
        name: "default_nodered_bundle"
      };
      var noderedbundle_path = B.path.abs(self.config.noderedbundle_path, self.config_path);
      tasks.push(self.em.service__load_nodered_from_bundle$(noderedbundle_path, spec_nodered_bundle, self.id));
    }

    if (self.config.grove_config) {
      B.check(self.config.grove_config.grovebundle_path, "hub", "should have grove bundle");
      self.config.grove_config.grovebundle_path = B.path.abs(self.config.grove_config.grovebundle_path, self.config_path);
      tasks.push(self.em.thing__load_grove_thing_via_login$(self.config.grove_config, self.id));
    }

    return Promise.all(tasks);
  });
};

Hub.prototype.leave$ = function() {
  var self = this;
  if (!_.isUndefined(self.hb_timer)) {
    clearInterval(self.hb_timer);
  }
  this._unsubscribe_events();
  return this.undefine_rpc$()
  .then(function() {
    return self.sm.clear_all_sessions$();
  })
  .then(function() {
    return self.sm.clear_all_services$();
  })
  .then(function() {
    return self._unsubscribe_topics$();
  })
  .then(function() {
    return self.mnode.publish$(P.HUB_LEAVE, self.get_brief());
  })
  .then(function() {
    return self.mnode.dispose$();
  })
  .finally(function() {
    return self._call_destroy_script$();
  });
};

Hub.prototype._call_destroy_script$ = function() {
  var self = this;
  if (_.isUndefined(self.config.destroy_script_path)) {
    log("no destroy script");
    return;
  }
  var destroy_script_path = B.path.abs(self.config.destroy_script_path, self.config_path);
  if (!B.fs.file_exists(destroy_script_path)) {
    log.warn("destroy script not found", destroy_script_path);
    return;
  }
  log("call destroy script:", destroy_script_path);
  return self.sm.run_hub_script$(destroy_script_path);
};


/**
 * 1, send CLAIM_AS_HUB to the new sensor
 * 2, clear all sessions related with the center, in case the center shut down
 * before by accident
 */
Hub.prototype.on_center_claimed = function(center_info) {
  log("Center Claimed", center_info);
  this.mnode.send$(center_info.mnode_id, P.CLAIM_AS_HUB, this.get_info()).done();
  this.sm.clear_sessions_with_mnode$(center_info.mnode_id).done();
};

/**
 * clear all sessions related with the center
 */
Hub.prototype.on_center_leave = function(center_brief) {
  log("Center Leaved", center_brief);
  this.sm.clear_sessions_with_mnode$(center_brief.mnode_id).done();
};


Hub.prototype.on_center_need_em_fullinfo = function(center_info) {
  log("Center need em_fullinfo", center_info);
  this.em.get_full_info$(center_info.mnode_id).done();
};


Hub.create$ = function(config) {
  var hub = new Hub(config);
  return hub.init$().then(function() {
    return hub;
  });
};

Hub.prototype._subscribe_events = function() {
  var self = this;
  this.em.event.on("changed", function(data) {
    data = self._prepare_emchanged_data(data);
    self.mnode.publish$(P.EM_CHANGED, data).done();
  });
  this.em.event.on("full_info", function(data) {
    data.hub = self.id;
    var target = data.target_mnode_id;
    delete data.target_mnode_id;
    self.mnode.send$(target, P.EM_FULLINFO, data).done();
  });
};

Hub.prototype._unsubscribe_events = function() {
  this.em.event.removeAllListeners("changed");
  this.em.event.removeAllListeners("full_info");
};

Hub.prototype._unsubscribe_topics$ = function() {
  var tasks = [];
  tasks.push(this.mnode.clean_subscribe_all$());
  tasks.push(this.mnode.clean_subscribe$());
  tasks.push(this.mnode.clean_accepts$());
  return Promise.all(tasks);
};

Hub.prototype._subscribe_topics$ = function() {
  var tasks = [];
  tasks.push(this.mnode.subscribe_all$(P.CLAIM_AS_CENTER, this.on_center_claimed.bind(this)));
  tasks.push(this.mnode.subscribe_all$(P.CENTER_LEAVE, this.on_center_leave.bind(this)));
  tasks.push(this.mnode.accept$(P.NEED_EM_FULLINFO, this.on_center_need_em_fullinfo.bind(this)));
  return Promise.all(tasks);
};

/**
 * user proxy related including
 * get_user_proxy => {http_proxy:"",https_proxy:""}
 * load_user_proxy =>{http_proxy:"",https_proxy:""}
 * set_user_proxy
 *
 */
Hub.prototype.get_user_proxy = function() {
  return this.user_proxy;
};

Hub.prototype.load_user_proxy = function() {
  if(this.type === "builtin") return;
  var json_path = B.path.abs("./user_proxy.json", this.config_path);
  var user_proxy = {};
  if(B.fs.file_exists(json_path)) {
    var json_content = B.fs.read_json(json_path);
    user_proxy = json_content?json_content:{};
  } else {
    B.fs.write_json(json_path, {});
    user_proxy = {};
  }
  return user_proxy;
};


Hub.prototype.npm_set_proxy = function(type, value) {
  return new Promise(function(resolve, reject) {
    exec("npm config set "+type+" "+value +" -g", function(err) {
      if(err) return reject(err);
      resolve();
    });
  });
};

Hub.prototype.set_user_proxy = function(value) {
  this.user_proxy = value;
  var json_path = B.path.abs("./user_proxy.json", this.config_path);
  B.fs.write_json(json_path, value);
  var tasks = [];
  if(value.http_proxy) {
    tasks.push(this.npm_set_proxy("proxy", value.http_proxy));
  }
  if(value.https_proxy) {
    tasks.push(this.npm_set_proxy("https-proxy", value.https_proxy));
  }
  return Promise.all(tasks);
};

Hub.prototype.define_rpc$ = function() {
  var self = this;
  var mnode = this.mnode;
  var spec_bundle = {
    id: "SpecBundle" + self.id,
    name: "default_bundle"
  };
  return mnode.enable_rpc$()
  .then(function() {
    mnode.define_rpc("add_hope_thing", function(thing) {
      return self.em.thing__add_hope_thing$(thing, B.path.abs(self.config.thingbundle_path, self.config_path))
      .then(function(data) {
        return self._prepare_emchanged_data(data);
      });
    });
    mnode.define_rpc("install_hope_thing", function(name, version, hub_id) {
      return self.em.thing__install_hope_thing$(name, version, B.path.abs(self.config.thingbundle_path, self.config_path), hub_id)
        .then(function(data) {
          return self._prepare_emchanged_data(data);
        });
    });
    mnode.define_rpc("update_hope_thing", function(thing) {
      return self.em.thing__update_hope_thing$(thing)
      .then(function(data) {
        return self._prepare_emchanged_data(data);
      });
    });
    mnode.define_rpc("remove_hope_thing", function(thing_id) {
      return self.em.thing__remove_hope_thing$(thing_id)
      .then(function(data) {
        return self._prepare_emchanged_data(data);
      });
    });
    mnode.define_rpc("add_hope_service", function(service) {
      return self.em.service__add_hope_service$(service, spec_bundle)
      .then(function(data) {
        return self._prepare_emchanged_data(data);
      });
    });
    mnode.define_rpc("install_hope_service", function(name, version, thing_id) {
      return self.em.thing__install_hope_service$(name, version, thing_id, spec_bundle)
        .then(function(data) {
          return self._prepare_emchanged_data(data);
        })
    });
    mnode.define_rpc("update_hope_service", function(service) {
      return self.em.service__update_hope_service$(service, spec_bundle)
      .then(function(data) {
        return self._prepare_emchanged_data(data);
      });
    });
    mnode.define_rpc("remove_hope_service", function(service_id) {
      return self.em.service__remove_hope_service$(service_id)
      .then(function(data) {
        return self._prepare_emchanged_data(data);
      });
    });
    mnode.define_rpc("list_service_files", function(service_id) {
      return self.em.service__list_files$(service_id);
    });
    mnode.define_rpc("publish_hope_service", function(service_id, package_json, settings) {
      return self.em.service__publish$(service_id, package_json, settings);
    });
    mnode.define_rpc("read_service_file", function(service_id, file_path) {
      return self.em.service__read_file$(service_id, file_path);
    });
    mnode.define_rpc("write_service_file", function(service_id, file_path, content) {
      return self.em.service__write_file$(service_id, file_path, content);
    });
    mnode.define_rpc("remove_service_file", function(service_id, file_path) {
      return self.em.service__remove_file$(service_id, file_path);
    });
    mnode.define_rpc("install_service_package", function(service_id, package_name, version) {
      return self.em.service__install_package$(service_id, package_name, version);
    });
    mnode.define_rpc("uninstall_service_package", function(service_id, package_name) {
      return self.em.service__uninstall_package$(service_id, package_name);
    });
    mnode.define_rpc("clear_session", function(session_id) {
      return self.sm.clear_session$(session_id);
    });
    mnode.define_rpc("reload_service", function(service_id) {
      return self.sm.reload_service$(service_id);
    });
    mnode.define_rpc("set_user_proxy", function(value) {
      return self.set_user_proxy(value);
    });
    mnode.define_rpc("get_user_proxy", function() {
      return self.get_user_proxy();
    });
  });
};

Hub.prototype.undefine_rpc$ = function() {
  var mnode = this.mnode;
  mnode.undefine_rpc("add_hope_thing");
  mnode.undefine_rpc("install_hope_thing");
  mnode.undefine_rpc("update_hope_thing");
  mnode.undefine_rpc("remove_hope_thing");
  mnode.undefine_rpc("add_hope_service");
  mnode.undefine_rpc("install_hope_service");
  mnode.undefine_rpc("update_hope_service");
  mnode.undefine_rpc("remove_hope_service");
  mnode.undefine_rpc("list_service_files");
  mnode.undefine_rpc("publish_hope_service");
  mnode.undefine_rpc("install_service_package");
  mnode.undefine_rpc("uninstall_service_package");
  mnode.undefine_rpc("read_service_file");
  mnode.undefine_rpc("write_service_file");
  mnode.undefine_rpc("remove_service_file");
  mnode.undefine_rpc("clear_session");
  mnode.undefine_rpc("reload_service");
  mnode.undefine_rpc("set_proxy");
  return mnode.disable_rpc$();
};


Hub.prototype._prepare_emchanged_data = function(data) {
  data.hub = this.id;
  data.hub_mnode_id = this.mnode.id;
  return data;
};