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
var Hub = require("hope-hub");
var UIThing = require("./ui_thing");
var _ = require("lodash");

/**
 * Create the built-in Hub for a Center
 * @param  {Object} _center The center to host this built-in hub
 * @return {Object}         The created hub
 */
exports.create$ = function(_center) {
  var id = _center.id + "__built_in_hub__";
  var assemble = B.fs.read_json(B.path.resolve(__dirname, "./built_in_hub.json"));
  assemble.mnode.$params[1].id = id + "__mnode__";
  var hub;
  return Hub.start$({
    id: id, 
    assemble: assemble,
    config_path: B.path.abs("./built_in_hub.json", module.filename)
  }).then(function(objs) {
    hub = objs.hub;
    return hub;
  });
};


function add_app_socket(center, app_id) {
  if (center.frontends.dev) {
    center.frontends.dev.add_socket_for_app(app_id);
  }
  if (center.frontends.user) {
    center.frontends.user.add_socket_for_app(app_id);
  }
}

function remove_app_socket(center, app_id) {
  if (center.frontends.dev) {
    center.frontends.dev.remove_socket_for_app(app_id);
  }
  if (center.frontends.user) {
    center.frontends.user.remove_socket_for_app(app_id);
  }
}


/**
 * Initialize a hub as a builtin hub
 * @param  {Object} hub    The hub to intialize
 * @param  {Object} center The center for that hub
 */
exports.init$ = function(hub, center) {
  hub.ui_things = {};

  hub.get_ui_thing_from_app_id = function(app_id) {
    return hub.ui_things[UIThing.app_id_to_thing_id(hub, app_id)];
  };

  return center.em.app__list$().then(function(apps) {
    apps = apps || [];
    return Promise.all(apps.map(function(app) {
      add_app_socket(center, app.id);
      return UIThing.create$(center, app.id);
    }));
  }).then(function() {
    center.em.event.on("changed", function(changed) {
      var to_change = [], to_remove = [];

      Promise.all(changed.list.map(function(c) {
        var ids = c.id || [];
        if (!_.isArray(ids)) {
          ids = [ids];
        }
        if (c.type === "app") {
          if (c.cmd === "set") {
            ids.forEach(function(id) {
              add_app_socket(center, id);
            });
            to_change = _.union(to_change, ids);
          } else if (c.cmd === "delete") {
            to_remove = _.union(to_remove, ids);
            ids.forEach(function(id) {
              remove_app_socket(center, id);
            });
          }
        } else if (c.type === "ui") {
          return center.em.ui__get$(ids).then(function(uis) {
            var _app_ids = _.pluck(uis || [], "app");
            if (c.cmd === "set") {
              to_change = _.union(to_change, _app_ids);
            } else if (c.cmd === "delete") {
              to_remove = _.union(to_remove, _app_ids);
            }            
          });
        }
      })).then(function() {
        to_change.forEach(function(x) {
          var u = UIThing.get_for_app(center, x);
          if (u) {
            u.update_services$().done();
          } else {
            UIThing.create$(center, x).done();
          }
        });
        to_remove.forEach(function(x) {
          var u = UIThing.get_for_app(center, x);
          if (u) {
            u.remove$().done();
          }
        });
      }).done();
    });
  });
};




