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
/**
 * Parse and handle the config files to raw files
 */

var B = require("hope-base");
var _ = require("lodash");

var reldir = B.fs.dir_exists(__dirname + "/../../ui-widgets") ? "../.." : "../../..";

exports.process = function(file_path) {
  return new Config(file_path);
};

function Config(file_path) {
  this.path = B.path.resolve(file_path);
  this.json = B.fs.read_json_with_comments(this.path);
  this.to_assemble = {};
  this.generated_config = {
    assemble: this.to_assemble
  };

  this.enable_log();

  this.parse_basic();

  this.gen_shared();

  if (this.type === "center") {
    this.gen_center_specific();
  } else if (this.type === "hub") {
    this.gen_hub_specific();
  }

}


Config.prototype.parse_basic = function() {
  this.type = this.json.type;
  B.check(_.includes(["center", "hub"], this.type), "The type of configuration is", 
    this.type, "while it can only be one of", ["center", "hub"]);

  this.name = this.json.name;
  if (!this.name) {
    this.name = (this.type === "center" ? "Center" : "anonymous");
  }

  this.id = this.json.id;

  if (this.id) {
    this.generated_config.id = this.id;
  }

  this.generated_config.config_path = this.path;
};


Config.prototype.enable_log = function() {
  var log = this.json.log || {
    enabled: false
  };
  log.levels = log.levels || {
    debug: false,
    info: true,
    warn: true,
    error: true
  };
  var categories = log.categories || {
    "*": false
  };
  delete log.categories;

  B.log.configure_options(log);
  B.log.configure_categories(categories);

};

Config.prototype.gen_shared = function() {
  B.check(_.isObject(this.json.broker), "Missing broker configuration");
  _.assign(this.to_assemble, {
    mnode: {
      $type: "MNode",
      $params: {
        name: this.name,
        brokers: this.json.broker
      }
    },

    hub_store: {
      $type: "HubStore",
      $params: "memory"
    },
    thing_store: {
      $type: "ThingStore",
      $params: "memory"
    },
    service_store: {
      $type: "ServiceStore",
      $params: "memory"
    },
    spec_store: {
      $type: "SpecStore",
      $params: "memory"
    },
    specbundle_store: {
      $type: "SpecBundleStore",
      $params: "memory"
    },
    session_store: {
      $type: "SessionStore",
      $params: "memory"
    },
    graph_store: {
      $type: "GraphStore",
      $params: "memory"
    },
    app_store: {
      $type: "AppStore",
      $params: "memory"
    },    
    ui_store: {
      $type: "UiStore",
      $params: "memory"
    },

    entity_manager: {
      $type: "EntityManager",
      $params: [{
        hub_store: "$hub_store",
        thing_store: "$thing_store",
        service_store: "$service_store",
        spec_store: "$spec_store",
        specbundle_store: "$specbundle_store",
        session_store: "$session_store",
        graph_store: "$graph_store",
        app_store: "$app_store",
        ui_store: "$ui_store"
      }]
    }
  });
};

Config.prototype.gen_center_specific = function() {

  this.to_assemble.entity_manager.$params[0].user_store = "$user_store";

  _.assign(this.to_assemble, {
    appbundle_path: this.json.appbundle_path || "./appbundle",
    user_json_path: this.json.user_json_path || "./user.json",

    user_store: {
      $type: "UserStore",
      $params: ["file", {
        path: "$user_json_path"
      }]
    },


    dev_web_app: {
      $type: "WebApp",
      $params: {
        port: _.get(this.json, "web_for_developer.port", 8080),
        static: [
          _.get(this.json, "static_ui_dev_path", reldir + "/ui-dev") + "/public",
          _.get(this.json, "static_doc_path", reldir + "/doc") + "/html",
          _.get(this.json, "static_ui_widgets_path", reldir + "/ui-widgets")
        ],
        web_socket: true
      }
    },

    user_web_app: {
      $type: "WebApp",
      $params: {
        port: _.get(this.json, "web_for_end_users.port", 3000),
        static: [
          _.get(this.json, "static_ui_user_path", reldir + "/ui-user") + "/public",
          _.get(this.json, "static_ui_widgets_path", reldir + "/ui-widgets")
        ],
        web_socket: true
      }
    },

    center: {
      $type: "Center",
      $params: {
        id: "$id",
        name: this.name,
        mnode: "$mnode",
        config_path: "$config_path",
        entity_manager: "$entity_manager",
        appbundle_path: "$appbundle_path",
        dev_web_app: "$dev_web_app",
        user_web_app: "$user_web_app",
        auth: this.json.authenticate ? true : false,

        workflow_engine: {
          $type: "WorkflowEngine",
          $params: {
            "mnode": "$mnode",
            "em": "$entity_manager"
          }
        },
        heartbeat_server: {
          store: {
            $type: "Store",
            $params: "memory"
          },
          check_interval: _.get(this.json, "heartbeat_server.check_interval", 30000),
          drop_threshold: _.get(this.json, "heartbeat_server.drop_threshold", 120000)
        }
      }
    }
  });
};


Config.prototype.gen_hub_specific = function() {
  _.assign(this.to_assemble, {
    thingbundle_path: this.json.thingbundle_path || "./thing_bundle",

    session_manager: {
      $type: "SessionManager",
      $params: {
        mnode : "$mnode",
        em : "$entity_manager"
      }
    },

    hub: {
      $type: "Hub",
      $params: {
        id: "$id",
        name : this.name,
        config_path : "$config_path",
        mnode: "$mnode",
        entity_manager: "$entity_manager",
        thingbundle_path: "$thingbundle_path",
        session_manager: "$session_manager",
        heartbeat: {
          interval: _.get(this.json, "heartbeat.interval", 20000)
        }
      }
    }
  });

  if (this.json.init_script) {
    this.to_assemble.hub.$params.init_script_path = this.json.init_script;
  }

  if (this.json.destroy_script) {
    this.to_assemble.hub.$params.destroy_script_path = this.json.destroy_script;
  }

  if (this.json.specbundle_path) {
        this.to_assemble.hub.$params.specbundle_path = this.json.specbundle_path;
  }

  // special handling for grove
  if (_.isObject(this.json.grove_config)) {
    this.to_assemble.hub.$params.grove_config = this.json.grove_config;
  }
};