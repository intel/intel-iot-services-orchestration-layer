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
 * Each Application would have a UIThing on built_in_hub
 */

var B = require("hope-base");
var _ = require("lodash");
var EventEmitter = require("eventemitter3");

module.exports = UIThing;

function UIThing(center, app_id) {
  this.center = center;
  this.app_id = app_id;
  this.hub = B.check(this.center.built_in_hub, "ui/create_ui_thing", 
    "The center should have built_in_hub");
  this.id = UIThing.app_id_to_thing_id(this.center.built_in_hub, this.app_id);

  if (!this.hub.ui_things) {
    this.hub.ui_things = {};
  }
  this.hub.ui_things[this.id] = this;

  this.event = new EventEmitter();
  this.cache = {};
}

UIThing.prototype.init$ = function() {
  return this.update_services$();
};

UIThing.create$ = function(center, app_id) {
  return (new UIThing(center, app_id)).init$();
};

UIThing.app_id_to_thing_id = function(hub, app_id) {
  return "HOPE_UI_THING__" + hub.id + app_id;
};

UIThing.get_for_app = function(center, app_id) {
  return center.built_in_hub.ui_things[UIThing.app_id_to_thing_id(
    center.built_in_hub, app_id)];
};

UIThing.prototype.on_data_from_client = function(widget_id, data) {
  this.event.emit(widget_id, data);
};


UIThing.prototype.on_data_from_service = function(widget_id, data, cache_size) {
  cache_size = cache_size || 1;
  if (cache_size < 1) {
    cache_size = 1;
  }

  var cache = this.cache[widget_id];
  if (!cache) {
    cache = this.cache[widget_id] = [];
  }

  cache.push(data);

  while (cache.length > cache_size) {
    cache.shift();
  }
};



UIThing.prototype.remove$ = function() {
  var self = this;
  return this.hub.em.thing__remove_in_store$(this.id).then(function() {
    delete self.hub.ui_things[self.app_id];
  });
};

UIThing.prototype.widget_id_to_service_id = function(widget_id) {
  return "UI_SERVICE__" + widget_id;
};

UIThing.prototype.service_id_to_widget_id = function(service_id) {
  return service_id.slice("UI_SERVICE__".length);
};


UIThing.prototype._gen_service_jsons_for_widgets$ = function(widgets) {
  var self = this;
  return Promise.all(widgets.map(function(w) {
    return Promise.resolve().then(function() {
      if (_.isObject(w.spec)) {
        return w.spec;
      }
      return self.center.em.spec__get$(w.spec);
    }).then(function(spec) {
      return {
        id: self.widget_id_to_service_id(w.id),
        name: "HOPE UI Service for Widget: " + w.name,
        spec: w.spec,
        thing: self.id,
        type: "ui_service",
        path: B.path.abs("../lib/service_templates/ui", module.filename),
        is_connect: true,
        is_ui: true,
        own_spec: false,
        config: {
          widget_id: w.id,
          app_id: self.app_id,
          cache_size: spec.default_cache_size || 10
        }
      };
    });
  }));
};


UIThing.prototype.update_services$ = function() {
  var center_em = this.center.em, hub_em = this.hub.em, self = this;
  return center_em.app__get$(this.app_id).then(function(app) {
    return center_em.ui__get$(app.uis || []).then(function(uis) {
      var widget_idx = {};
      (uis || []).forEach(function(ui) {
        (ui.widgets || []).forEach(function(w) {
          widget_idx[w.id] = w;
        });
      });
      return hub_em.thing__get$(self.id).then(function(thing) {
        if (!thing) {
          return self._gen_service_jsons_for_widgets$(_.values(widget_idx)).then(function(jsons) {
            return hub_em.thing__add_with_services$({
              id: self.id,
              hub: self.hub.id,
              name: "HOPE UI Thing for App: " + self.app_id,
              services: jsons,
              is_connect: true,
              type: "ui_thing",
              is_builtin: true
            });
          });
        } 
        var widget_ids_for_stored_thing = (thing.services || []).map(function(x) {
          return self.service_id_to_widget_id(x);
        });
        var to_add_ids = _.difference(Object.keys(widget_idx), widget_ids_for_stored_thing);
        var to_remove_ids = _.difference(widget_ids_for_stored_thing, Object.keys(widget_idx));
        return Promise.resolve().then(function() {
          if (to_add_ids.length > 0) {
            return self.add_services_for_widgets$(to_add_ids.map(function(i) {
              return widget_idx[i];
            }));
          }
        }).then(function() {
          if (to_remove_ids.length > 0) {
            return self.remove_services_for_widgets$(to_remove_ids);
          }
        });
      });
    }); 
  });
};

UIThing.prototype.add_services_for_widgets$ = function(widgets) {
  var self = this;
  return this._gen_service_jsons_for_widgets$(widgets).then(function(jsons) {
    return self.hub.em.raw_add_children$("thing", self.id,
      "service", "services", jsons);
  });
};

UIThing.prototype.remove_services_for_widgets$ = function(widget_ids) {
  var self = this;
  return this.hub.em.raw_remove_children$("thing", this.id,
    "service", "services", widget_ids.map(function(w) {
      return self.widget_id_to_service_id(w);
    }));
};

