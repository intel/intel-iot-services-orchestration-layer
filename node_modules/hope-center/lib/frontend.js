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
var _ = require("lodash");
var B = require("hope-base");
var log = B.log.for_category("frontend");
var UIThing = require("./ui_thing");

var HOPE_TOKEN = "HOPE_token";

function _brief(o) {
  return {
    id: o.id,
    name: o.name,
    description: o.description
  };
}


function _remove_undefined(a) {
  return _.remove(a, function(x) {
    return _.isUndefined(x);
  });
}

function get_cookie(req, key) {
  var cs = req.headers.cookie;
  if (cs.length > 0) {
    var k = key + "=";
    var sidx = cs.indexOf(k);
    if (sidx !== -1) {
      sidx += k.length;
      var eidx = cs.indexOf(";", sidx);
      if (eidx === -1) {
        eidx = cs.length;
      }
      return decodeURIComponent(cs.substring(sidx, eidx));
    } 
  }
  return "";
}

function FrontEnd(center, web_app, handler_url) {
  B.check(web_app.$web_socket, "frontend", 
    "The web app for the frontend should have web socket enabled");
  this.center = center;
  this.web_app = web_app;
  this.socket = web_app.$web_socket;
  this.sub_sockets = {};
  this.api_handler = B.net.create_api_handler(web_app, handler_url);

  this.token_user = {};
}

// will create one if not setup yet
FrontEnd.prototype.get_socket = function(url_path) {
  var socket = this.sub_sockets[url_path];
  if (!socket) {
    socket = this.sub_sockets[url_path] = this.socket.of(url_path);
  }
  return socket;
};

FrontEnd.prototype.setup_app_socket = function(app_id) {
  var p = _socket_path_for_app(app_id);
  return this.get_socket(p);
};

FrontEnd.prototype.setup_graph_socket = function(graph_id) {
  var p = _socket_path_for_graph(graph_id);
  return this.get_socket(p);
};

FrontEnd.prototype.remove_app_socket = function(app_id) {
  delete this.sub_sockets[_socket_path_for_app(app_id)];
};

FrontEnd.prototype.remove_graph_socket = function(graph_id) {
  delete this.sub_sockets[_socket_path_for_graph(graph_id)];
};

FrontEnd.prototype.emit = function(url_path, event, data) {
  if (!this.socket) {
    return;
  }
  this.get_socket(url_path).emit(event, data);
};

FrontEnd.prototype.sys_emit = function(event, data) {
  this.emit("/__HOPE__SYSTEM__", event, data);

  if (this.$forward) {
    this.$forward.sys_emit(event, data);
  }
};

function _socket_path_for_app(id) {
  return "/__HOPE__APP__" + id;
}

FrontEnd.prototype.app_emit = function(app_id, event, data) {
  return this.emit(_socket_path_for_app(app_id), event, data);
};

function _socket_path_for_graph(id) {
  return "/__HOPE__GRAPH__" + id;
}

FrontEnd.prototype.graph_emit = function(graph_id, event, data) {
  return this.emit(_socket_path_for_graph(graph_id), event, data);
};


// Ensure related sockets are created
FrontEnd.prototype.add_socket_for_app = function(app_id) {
  if (!this.socket) {
    return;
  }
  var p = _socket_path_for_app(app_id);
  if (!this.sub_sockets[p]) {
    this.sub_sockets[p] = this.socket.of(p);
  }
};
FrontEnd.prototype.remove_socket_for_app = function(app_id) {
  if (!this.socket) {
    return;
  }
  var p = _socket_path_for_app(app_id);
  delete this.sub_sockets[p];
};



// This would add all functions that starts with api
// it would convert __ to . as well
// so api_app__list would be an api "app.list"
FrontEnd.prototype.init$ = function() {
  var self = this;
  _.forIn(this, function(v, k) {
    // skip private functions
    if (!_.startsWith(k, "api_")) {
      return;
    }
    var f = self[k];
    if (!_.isFunction(f)) {
      return;
    }
    f = f.bind(self);
    if (k[k.length - 1] === "$") {    // remove ending $
      k = k.slice(0, -1);
    }
    k = k.slice(4);   // remove app_
    k = k.replace("__", ".");   // __ to .
    self.api_handler.define_api(k, f);
  });

  return Promise.resolve();
};



// some fields in an object only stores the id as an array
// this helper would use em_method_to_get to get the real data into this field
// it may only use brief in case of is_brief
// the promsie resovles with obj
FrontEnd.prototype._fill_field$ = function(log_action, obj, field_to_fill, em_method_to_get, is_brief) {
  B.check(_.isObject(obj), "frontend/_fill_field", "Not an object", obj);
  B.check(_.isFunction(this.center.em[em_method_to_get]), "frontend/_fill_field",
    "Not a function of em", em_method_to_get);
  var items = obj[field_to_fill] = obj[field_to_fill] || [];
  return this.center.em[em_method_to_get](items).then(function(datums) {
    var unfound = _remove_undefined(datums);
    if (unfound.length > 0) {
      log.error(log_action, field_to_fill, "not found:", unfound, "for", obj);
    }
    obj[field_to_fill] = is_brief ? datums.map(function(o) {
      return _brief(o);
    }) : datums;
    return obj;    
  });
};


//----------------------------------------------------------------
// Shared APIs
//----------------------------------------------------------------
// return widget data  {
//   app: app_id,
//   widget: widget_id,
// }
FrontEnd.prototype.api_app__get_widget_data = function(data) {
  var ui_thing = UIThing.get_for_app(this.center, data.app);
  B.check(ui_thing, "frontend/send_widget_data", "Failed to get ui_thing for", data);
  return ui_thing.cache[data.widget] || [];
};


// accept widget data from user {
//   app: app_id,
//   widget: widget_id,
//   data: ...
// }
FrontEnd.prototype.api_app__send_widget_data = function(data) {
  var ui_thing = UIThing.get_for_app(this.center, data.app);
  B.check(ui_thing, "frontend/send_widget_data", "Failed to get ui_thing for", data);
  ui_thing.on_data_from_client(data.widget, data.data);
};

FrontEnd.prototype.api_sys__get_config = function(req, res) {
  if (this.center.config.auth) {
    var tk = get_cookie(req, HOPE_TOKEN);
    if (!tk || !this.token_user[tk]) {
      res.clearCookie(HOPE_TOKEN);
    }
  }
  var frontends = this.center.frontends;
  var ret = {};

  if (frontends.dev) {
    ret.ui_dev_port = frontends.dev.web_app.$$port;
  }
  if (frontends.user) {
    ret.ui_user_port = frontends.user.web_app.$$port;
  }
  ret.ui_auth_required = !!this.center.config.auth;
  return ret;
};

FrontEnd.prototype.get_uid_from_cookie = function(req, res) {
  var uid = null;
  if (this.center.config.auth) {
    var tk = get_cookie(req, HOPE_TOKEN);
    if (!tk || !this.token_user[tk]) {
      res.clearCookie(HOPE_TOKEN);
      return undefined;
    }
    uid = this.token_user[tk];
  }
  return uid;
};

FrontEnd.prototype.api_user__register = function(data) {
  B.check(_.isObject(data) && data.name && _.isString(data.passwd),
    "frontend/user_register", "Failed to register for", data);
  var id = B.unique_id("USER_");
  var self = this;

  data.id = id;
  data.appbundle_path = B.path.join(self.center.appbundle_path, id);

  return self.center.em.user__find$(data.name, null).then(function(user) {
    if (user) {
      throw new Error("User name already exists");
    }
    return self.center.em.user__add$(data);
  });
};

FrontEnd.prototype.api_user__remove = function(id, req, res) {
  var self = this;
  var uid = this.get_uid_from_cookie(req, res);
  if (uid === undefined) {
    return "__HOPE_LOGIN_REQUIRED__";
  }
  if (id === uid) {
    return false;
  }
  return self.center.em.user__remove$(id).then(function() {
    return true;
  });
};

FrontEnd.prototype.api_user__login = function(name, pwd, req, res) {
  var self = this;
  return this.center.em.user__find$(name, pwd).then(function(user) {
    var ret = {
      authenticated: false
    };
    if (user) {
      var tk = B.unique_id();
      self.token_user[tk] = user.id;
      ret.authenticated = true;
      ret.id = user.id;
      ret.role = user.role || "guest";

      res.cookie(HOPE_TOKEN, tk, { expires: new Date(Date.now() + 24 * 60 * 60 * 1000)});
    }
    return ret;
  });
};

FrontEnd.prototype.api_user__logout = function(req, res) {
  var tk = get_cookie(req, HOPE_TOKEN);
  if (tk) {
    var uid = this.token_user[tk];
    delete this.token_user[tk];
    res.clearCookie(HOPE_TOKEN);
    return !!uid;
  }
  return false;
};

FrontEnd.prototype.api_user__change_passwd = function(oldpass, newpass, req, res) {
  B.check(_.isString(oldpass) && _.isString(newpass),
    "frontend/user_change_passwd", "Failed to change passwd for", oldpass, newpass);
  var self = this;
  var uid = this.get_uid_from_cookie(req, res);
  if (uid === undefined) {
    return "__HOPE_LOGIN_REQUIRED__";
  }

  return self.center.em.user__get$(uid).then(function(user) {
    if (!user || user.passwd !== oldpass) {
      return false;
    }
    var u = {
      id: user.id,
      passwd: newpass
    };
    return self.center.em.user__update$(u).then(function() {
      return true;
    });
  });
};

FrontEnd.prototype.api_user__update$ = function(data, req, res) {
  B.check(_.isObject(data) && data.id && _.isString(data.id),
    "frontend/user_update", "Failed to update user for", data);
  var uid = this.get_uid_from_cookie(req, res);
  if (uid === undefined) {
    return "__HOPE_LOGIN_REQUIRED__";
  }

  return this.center.em.user__update$(data);
};

FrontEnd.prototype.api_user__list$ = function(req, res) {
  var uid = this.get_uid_from_cookie(req, res);
  if (uid === undefined) {
    return "__HOPE_LOGIN_REQUIRED__";
  }
  return this.center.em.user__list$();
};


FrontEnd.prototype.api_app__list$ = function(req, res) {
  var self = this;
  var uid = this.get_uid_from_cookie(req, res);
  if (uid === undefined) {
    return "__HOPE_LOGIN_REQUIRED__";
  }

  return this.center.em.app__list$(uid).then(function(apps) {
    var ids = _.map(apps, "id");
    return self.api_app__get$(ids);
  });
};


// [app_id_1, app_id_2, ...]
FrontEnd.prototype.api_app__get$ = function(ids) {
  var self = this;
  return this.center.em.app__get$(ids).then(function(apps) {
    apps = apps || [];
    return Promise.all(apps.map(function(app, idx) {
      if (!app) {
        log.error("app_get", "app not found:", ids[idx]);
        return Promise.resolve(app);
      }
      return self._fill_field$("app_get", app, "graphs", "graph__get$", true).then(function() {
        return self._fill_field$("app_get", app, "uis", "ui__get$", true);
      });
    }));
  });
};



// [ui_id_1, ui_id_2, ...]
FrontEnd.prototype.api_ui__get$ = function(ids) {
  return this.center.em.ui__get$(ids);
};

// [graph_id_1, graph_id_2, ...]
FrontEnd.prototype.api_graph__get$ = function(ids) {
  return this.center.em.graph__get$(ids);
};


FrontEnd.prototype.api_spec_bundle__list$ = function() {
  return this.center.em.specbundle__list$().then(function(bundles) {
    bundles = bundles || [];
    return bundles.map(function(b) {
      return _brief(b);
    });
  });
};


// [spec_bundle_id_1, spec_bundle_id_2, ...]
FrontEnd.prototype.api_spec_bundle__get$ = function(ids) {
  var self = this;
  return this.center.em.specbundle__get$(ids).then(function(bundles) {
    bundles = bundles || [];
    return Promise.all(bundles.map(function(b, idx) {
      if (!b) {
        log.error("spec_bundle_get", "bundle not found:", ids[idx]);
        return Promise.resolve(b);
      }
      return self._fill_field$("spec_bundle_get", b, "specs", "spec__get$");
    }));
  });
};


// [spec_id_1, spec_id_2, ...]
FrontEnd.prototype.api_spec_bundle__get_for_specs$ = function(spec_ids) {
  var self = this;
  return this.center.em.spec__get$(spec_ids).then(function(specs) {
    var needed = {};
    specs.forEach(function(spec, idx) {
      if (!spec) {
        log.error("spec_bundle_for_specs", "spec not found:", spec_ids[idx]);
        return;
      }
      if (!needed[spec.specbundle]) {
        needed[spec.specbundle] = true;
      }
    });
    return self.api_spec_bundle__get$(Object.keys(needed));
  });
};



FrontEnd.prototype.api_hub__list$ = function() {
  return this.center.em.hub__list$().then(function(hubs) {
    hubs = hubs || [];
    return hubs.map(function(hub) {
      return _brief(hub);
    });
  });
};


// [hub_id_1, hub_id_2, ...]
FrontEnd.prototype.api_hub__get$ = function(ids) {
  var self = this;
  return this.center.em.hub__get$(ids).then(function(hubs) {
    hubs = hubs || [];
    return Promise.all(hubs.map(function(hub, idx) {
      if (!hub) {
        log.error("hub_get", "hub not found:", ids[idx]);
        return Promise.resolve(hub);
      }

      return self._fill_field$("hub_get", hub, "things", "thing__get$").then(function() {

        // we shouldn't return these UI things
        _.remove(hub.things, function(thing) {
          return thing.thing_type === "ui";
        });

        return Promise.all(hub.things.map(function(thing) {
          return self._fill_field$("hub_get", thing, "services", "service__get$");
        }));

      }).then(function() {
        return hub;
      });

    }));
  });
};


//----------------------------------------------------------------
// Dev Frontend
//----------------------------------------------------------------

var DevFrontEnd =
exports.DevFrontEnd = function(center, web_app) {
  FrontEnd.call(this, center, web_app, "/apis/dev");
};

B.type.inherit(DevFrontEnd, FrontEnd);

DevFrontEnd.prototype.init$ = function() {
  var self = this;
  // we should add the ui widgets into specs
  // TODO currently we hard code the path 
  try {
    var ub = require("../../ui-widgets/specs");
  } catch(e) {
    ub = require("../../../ui-widgets/specs");
  }
  return Promise.all([
    this.center.em.specbundle__add_with_specs$(_.cloneDeep(ub.builtin)),
    this.center.em.specbundle__add_with_specs$(_.cloneDeep(ub.addons))
    ]).then(function() {
    return FrontEnd.prototype.init$.call(self);
  }).then(function() {
    self.center.em.event.on("changed", function(changed_list) {
      self.sys_emit("entity/changed", changed_list);
    });
  });
};



// {
//   name: app_name
//   description: app_desc
// }
DevFrontEnd.prototype.api_app__create$ = function(data, req, res) {
  B.check(_.isObject(data), "frontend/app/create", "Should be a json for app", data);
  data.id = B.unique_id("HOPE_APP_");
  data.create_time = (new Date()).getTime();
  var self = this;
  var uid = this.get_uid_from_cookie(req, res);

  if (uid === undefined) {
    return "__HOPE_LOGIN_REQUIRED__";
  }
  return this.center.em.app__add$(data, this.center.appbundle_path, uid).then(function() {
    return self.api_app__get$([data.id]).then(function(apps) {
      self.setup_app_socket(data.id);
      return apps[0];
    });
  });
};


// {
//   app: app_id,
//   props: {...}
// }
// NOTE: this is a merge instead of directly save
DevFrontEnd.prototype.api_app__update$ = function(data) {
  B.check(_.isObject(data), "frontend/app/update", "Should be a json for app", data);
  B.check(_.isString(data.app), "frontend/app/update", "Should specify app id", data);
  var d = data.props || {};
  d.id = data.app;
  d.modify_time = (new Date()).getTime();
  return this.center.em.app__update$(d);
};

// {
//   app: app_id,
// }
DevFrontEnd.prototype.api_app__remove$ = function(data) {
  this.remove_app_socket(data.app);
  return this.center.em.app__remove$(data.app);
};

// {
//   app: app_id,
//   ui: ui
// }
DevFrontEnd.prototype.api_app__create_ui$ = function(data) {
  var ui = data.ui || {};
  ui.app = data.app;
  return this.center.em.ui__add$(ui);
};

// ui
DevFrontEnd.prototype.api_ui__update$ = function(ui) {
  return this.center.em.ui__update$(ui);
};

// [id_1, id_2, ...]
DevFrontEnd.prototype.api_ui__remove$ = function(ids) {
  var em = this.center.em;
  return Promise.all(ids.map(function(id) {
    return em.ui__remove$(id);
  }));
};


// {
//   app: app_id,
//   graph: graph
// }
DevFrontEnd.prototype.api_app__create_graph$ = function(data) {
  var graph = data.graph || {};
  graph.app = data.app;
  return this.center.workflow_create$(graph);
};

function return_thing(thing) {
  return {
    id: thing.id,
    name: thing.name,
    type: thing.type
  };
}

function return_service(service) {
  var spec_id;
  if (_.isArray(service.spec)) {
    spec_id = service.spec;
  }
  else {
    spec_id = service.spec.id;
  }
  return {
    id: service.id,
    name: service.name,
    type: service.type,
    spec: {
      id: spec_id
    }
  };
}
//{
//  hub: hubid
//  thing: thing object
//}
DevFrontEnd.prototype.api_hub__create_thing$ = function(data) {
  B.check(_.isString(data.hub), "frontend/hub/create_thing", "Should be a json for thing", data.hub);
  B.check(_.isObject(data.thing), "frontend/hub/create_thing", "Should be a json for thing", data.thing);
  var thing = data.thing;
  thing.id = thing.id || B.unique_id("HOPE_THING_");
  thing.type = thing.type || "hope_thing";
  thing.hub = data.hub;
  return  this.center.add_hope_thing$(thing)
  .then(function() {
    return return_thing(thing);
  });
};

DevFrontEnd.prototype.api_thing__create_service$ = function(data) {
  B.check(_.isString(data.thing), "frontend/thing/create_service", "Should be a string for thing", data.thing);
  B.check(_.isObject(data.service), "frontend/thing/create_service", "Should be a json for service", data.service);
  var service = data.service;
  service.id = service.id || B.unique_id("HOPE_SERVICE_");
  service.type = service.type || "hope_service";
  service.thing = data.thing;
  return  this.center.add_hope_service$(service)
  .then(function() {
    return return_service(service);
  });
};

DevFrontEnd.prototype.api_thing__update$ = function(thing) {
  return this.center.update_hope_thing$(thing);
};

DevFrontEnd.prototype.api_thing__remove$ = function(ids) {
  var center = this.center;
  return Promise.all(ids.map(function(id) {
    return center.remove_hope_thing$(id);
  }));
};

DevFrontEnd.prototype.api_service__update$ = function(service) {
  return this.center.update_hope_service$(service);
};

DevFrontEnd.prototype.api_service__remove$ = function(ids) {
  var center = this.center;
  return Promise.all(ids.map(function(id) {
    return center.remove_hope_service$(id);
  }));
};


DevFrontEnd.prototype.api_service__list_files$ = function(service_id) {
  return this.center.list_service_files$(service_id);
};

//date {
//      service_id:
//      file_path:
//      }
DevFrontEnd.prototype.api_service__read_file$ = function(data) {
  return this.center.read_service_file$(data.service_id, data.file_path);
};

//date {
//      service_id:
//      file_path:
//      content:
//      }
DevFrontEnd.prototype.api_service__write_file$ = function(data) {
  return this.center.write_service_file$(data.service_id, data.file_path, data.content);
};

//date {
//      service_id:
//      file_path:
//      }
DevFrontEnd.prototype.api_service__remove_file$ = function(data) {
  return this.center.remove_service_file$(data.service_id, data.file_path);
};



// graph
DevFrontEnd.prototype.api_graph__update$ = function(graph) {
  return this.center.workflow_update$(graph);
};

// [id_1, id_2, ...]
DevFrontEnd.prototype.api_graph__remove$ = function(ids) {
  var center = this.center;
  return Promise.all(ids.map(function(id) {
    return center.workflow_remove$(id);
  }));
};

// [id_1, id_2, ...]
DevFrontEnd.prototype.api_graph__start$ = function(ids, tracing) {
  var self = this;
  var center = this.center;
  return Promise.all(ids.map(function(id) {
    return center.workflow_start$(id, tracing);
  })).then(function () {
    self.sys_emit("wfe/changed", {
      started: ids
    });
  });
};

// [id_1, id_2, ...]
DevFrontEnd.prototype.api_graph__stop$ = function(ids) {
  var self = this;
  var center = this.center;
  return Promise.all(ids.map(function(id) {
    return center.workflow_stop$(id);
  })).then(function () {
    self.sys_emit("wfe/changed", {
      stoped: ids
    });
  });
};

// [id_1, id_2, ...]
DevFrontEnd.prototype.api_graph__status$ = function(ids) {
  var center = this.center;
  return ids.map(function(id) {
    return {
      graph: id,
      status: center.workflow_get_status(id)
    };
  });
};

DevFrontEnd.prototype.api_graph__trace = function(ids) {
  var center = this.center;
  return ids.map(function(id) {
    return {
      id: id,
      trace: center.workflow_get_trace(id)
    };
  });
};


DevFrontEnd.prototype.api_graph__debug_trace = function(ids, limit) {
  var center = this.center;
  return ids.map(function(id) {
    var recs = center.workflow_get_debug_trace(id);
    var max = Number(limit);
    if (max > 0 && recs.length > max) {
      recs = recs.slice(-max);
    }
    return {
      id: id,
      trace: recs
    };
  });
};


// data {
//  graph_id: ...,
//  node_id: ...,
//  is_debug: true / false
// }
DevFrontEnd.prototype.api_graph__set_debug_for_node$ = function(data) {
  return this.center.workflow_set_debug_for_node$(data.graph_id, data.node_id, data.is_debug);
};



//----------------------------------------------------------------
// User Frontend
//----------------------------------------------------------------

var UserFrontEnd =
exports.UserFrontEnd = function(center, web_app) {
  FrontEnd.call(this, center, web_app, "/apis/user");
};

B.type.inherit(UserFrontEnd, FrontEnd);

UserFrontEnd.prototype.init$ = function() {
  var self = this;
  return FrontEnd.prototype.init$.call(this).then(function() {
  });
};