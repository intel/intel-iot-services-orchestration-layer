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

class HubStore extends EventEmitter {
  constructor() {
    super();

    this.manager = require("../lib/hub");
    
    $hope.register_action_handler({
      "hub/add/hubs":         this.add_hubs.bind(this),
      "hub/change/color":     this.change_color.bind(this),
      "hub/create/thing":     this.create_thing.bind(this),
      "hub/remove/thing":     this.remove_thing.bind(this),
      "hub/update/thing":     this.update_thing.bind(this),
      "hub/create/service":   this.create_service.bind(this),
      "hub/remove/service":   this.remove_service.bind(this),
      "hub/update/service":   this.update_service.bind(this)
    });
  }

  get_all_hubs(using_spec) {
    if (!using_spec) {
      return this.manager.hubs;
    }

    var hubs = [];
    _.forOwn(this.manager.hubs, d => {
      _.forOwn(d.things, thing => {
        _.forOwn(thing.services, svc => {
          if (svc.spec === using_spec && hubs.indexOf(d) === -1) {
            hubs.push(d);
          }
        });
      });
    });
    return hubs;
  }

  get_all_unloaded_hubs(hub_ids) {
    return this.manager.find_unloaded_ids(hub_ids);
  }

  get_all_spec_ids_used() {
    return this.manager.get_all_spec_ids_used();
  }

  get_all_hub_ids_used() {
    return this.manager.get_all_hub_ids_used();
  }


  //////////////////////////////////////////////////////////////////
  // Writes
  //////////////////////////////////////////////////////////////////
  init$() {
    return $hope.app.server.hub.list$().then(items => {
      return this.ensure_hubs_loaded$(items.map(d => d.id));
    });
  }

  handle_change_event$(change_list) {
    var changed = [], removed = [], has_ui_change;
    (change_list || []).forEach(c => {
      var ids = c.id || [];
      if (!_.isArray(ids)) {
        ids = [ids];
      }
      if (c.cmd === "set") {
        switch (c.type) {
          case "hub": 
            // TODO in the future we may only add selected hubs instead of all
            changed = _.union(changed, ids);
            break;
          case "thing":
            if (_.isArray(c.obj)) {
              changed = _.union(changed, c.obj.map(t => t.hub));
            }
            else if (_.isObject(c.obj)) {
              changed = _.union(changed, [c.obj.hub]);
            }
            else {
              $hope.check(false, "HubStore", "handle_change_event$ got invalid notification");
            }
            break;
        }
      } else if (c.cmd === "delete") {
        switch (c.type) {
          case "hub":
            removed = _.union(removed, ids);
            break;
          case "thing":
            ids.forEach(id => {
              this.manager.remove_thing(id);
            });
            this.emit("hub", {event: "removed/things", ids: ids});
            break;
          case "service":
            ids.forEach(id => {
              this.manager.remove_service(id);
            });
            this.emit("hub", {event: "removed/services", ids: ids});
            break;
        }
      }
      if (c.type === "ui") {
        has_ui_change = true;
      }
    });
    if (has_ui_change && this.manager.center_built_in) {
      changed = _.union([this.manager.center_built_in.id]);
    }
    return $Q().then(() => {
      if (changed.length > 0) {
        return this.load_hubs$(changed);
      }
    }).then(() => {
      if (removed.length > 0) {
        this.remove_hubs(removed);
      }
    });
  }

  ensure_hubs_loaded$(hub_ids) {
    var d = $Q.defer();  
    var unloaded = this.get_all_unloaded_hubs(hub_ids);
    if (unloaded.length === 0) {
      d.resolve();
    } else {
      this.load_hubs$(unloaded).then(() => d.resolve())
          .catch(err => d.reject(err)).done();
    }
    return d.promise;
  }

  // we don't need all specs are loaded
  load_hubs$(ids) {
    var hubs;
    return $hope.app.server.hub.get$(ids).then(d_json_array => {
      $hope.check(d_json_array, "HubStore", "load_hubs$ returns nothing");
      hubs = [];
      var failed = [];
      d_json_array.forEach((d, idx) => {
        if (!d) {
          failed.push(ids[idx]);
        } else {
          hubs.push(d);
        }
      });
      if (failed.length > 0) {
        $hope.log.warn("hub", "Didn't find the hubs to load", failed);
      }
      // not return a promise
      // just ask to load the spec
      $hope.app.stores.spec.ensure_specs_loaded$(
         this.manager.get_all_spec_ids_used_for_hub_array(hubs));
    }).then(() => this.add_hubs(hubs));
  }

  add_hubs(hub_json_array) {
    var ids = [];
    _.forOwn(hub_json_array, json => {
      ids.push(this.manager.add_hub(json).id);
    });
    this.emit("hub", {event: "added/hubs", ids: ids});
  }

  remove_hubs(hub_ids) {
    var ids = [], self = this;
    hub_ids.forEach(id => {
      if (self.get_hub(id)) {
        ids.push(id);
        self.manager.remove_hub(id);
      }
    });
    if (ids.length > 0) {
      this.emit("hub", {event: "removed/hubs", ids: ids});
    }
  }


  change_color(data) {
    var d = this.manager.hubs[data.hub_id];
    if (d && d.$color_id !== data.color_id) {
      d.$color_id = data.color_id;
      this.emit("hub", {event: "changed/color", id: data.hub_id});
    }
  }

  create_thing(data) {
    $hope.app.server.hub.create_thing$(data.hub_id, data.name, data.description).then(res => {
      $hope.check(res && res.id, "HubStore", "create_thing$ returns invalid response");
      $hope.notify("success", __("Thing successfully created!"));
    }).catch(e => {
      $hope.notify("error", "Failed to create thing!", e.message);
    }).done();
  }

  remove_thing(data) {
    $hope.app.server.thing.remove$(data.ids).then(() => {
      $hope.notify("success", __("Thing successfully deleted!"));
    }).catch(e => {
      $hope.notify("error", "Failed to remove thing!", e.message);
    }).done();
  }

  update_thing(data) {
    $hope.app.server.thing.update$(data.thing).then(() => {
      $hope.notify("success", __("Thing successfully updated!"));
    }).catch(e => {
      $hope.notify("error", "Failed to update thing!", e.message);
    }).done();
  }


  create_service(data) {
    $hope.app.server.thing.create_service$(data.thing_id, data.name, data.description).then(res => {
      $hope.check(res && res.id, "HubStore", "create_service$ returns invalid response");
      $hope.notify("success", __("Service successfully created!"));
    }).catch(e => {
      $hope.notify("error", "Failed to create service!", e.message);
    }).done();
  }

  remove_service(data) {
    $hope.app.server.service.remove$(data.ids).then(() => {
      $hope.notify("success", __("Service successfully deleted!"));
    }).catch(e => {
      $hope.notify("error", __("Failed to update service!"), e.message);
    }).done();
  }

  update_service(data) {
    $hope.app.server.service.update$(data.service).then(() => {
      $hope.notify("success", __("Service successfully updated!"));
    }).catch(e => {
      $hope.notify("error", __("Failed to update service!"), e.message);
    }).done();
  }
}


export default new HubStore();