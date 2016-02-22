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
var B = require("hope-base");
var P = require("hope-hub-center-shared").protocol;
var log = B.log.for_category("hub");
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
  B.check(config.thingbundle_path, "hub", "should have an thingbundle");
  this.config = config;
  // could be builtin (the built_in_hub of center) or others ...
  this.type = this.config.type || "normal";
  this.config_path = config.config_path;
  config.heartbeat = config.heartbeat || {};
  this.heartbeat_interval = config.heartbeat.interval || 60000;
  this.thingbundle_path = B.path.abs(this.config.thingbundle_path, this.config_path);
  this.sm = config.session_manager;
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

//TODO: we should support remote thing/spec discovery
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

    tasks.push(self.em.thing__load_from_bundle$(self.thingbundle_path, spec_bundle, self.id));
    
    if (self.config.specbundle_path) {
      var specbundle_path = B.path.abs(self.config.specbundle_path, self.config_path);
      tasks.push(self.em.spec__load_from_localbundle$(specbundle_path));
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
    return self.destroy_related_webapp();
  });
};

Hub.prototype.destroy_related_webapp = function() {
  this.mnode.destroy_its_webapp();
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
      return self.em.thing__add_hope_thing$(thing, self.thingbundle_path)
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
    mnode.define_rpc("read_service_file", function(service_id, file_path) {
      return self.em.service__read_file$(service_id, file_path);
    });
    mnode.define_rpc("write_service_file", function(service_id, file_path, content) {
      return self.em.service__write_file$(service_id, file_path, content);
    });
    mnode.define_rpc("remove_service_file", function(service_id, file_path) {
      return self.em.service__remove_file$(service_id, file_path);
    });
    mnode.define_rpc("clear_session", function(session_id) {
      return self.sm.clear_session$(session_id);
    });
    mnode.define_rpc("reload_service", function(service_id) {
      return self.sm.reload_service$(service_id);
    });
  });
};

Hub.prototype.undefine_rpc$ = function() {
  var mnode = this.mnode;
  mnode.undefine_rpc("add_hope_thing");
  mnode.undefine_rpc("update_hope_thing");
  mnode.undefine_rpc("remove_hope_thing");
  mnode.undefine_rpc("add_hope_service");
  mnode.undefine_rpc("update_hope_service");
  mnode.undefine_rpc("remove_hope_service");
  mnode.undefine_rpc("list_service_files");
  mnode.undefine_rpc("read_service_file");
  mnode.undefine_rpc("write_service_file");
  mnode.undefine_rpc("remove_service_file");
  mnode.undefine_rpc("clear_session");
  mnode.undefine_rpc("reload_service");
  return mnode.disable_rpc$();
};


Hub.prototype._prepare_emchanged_data = function(data) {
  data.hub = this.id;
  data.hub_mnode_id = this.mnode.id;
  return data;
};