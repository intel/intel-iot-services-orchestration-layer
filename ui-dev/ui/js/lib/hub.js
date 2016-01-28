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
// HubManager is a singleton, i.e. module.exports is an object
//
// format of a hub{
//    id: ...
//    name: ...
//    things: [{
//      id: ...
//      name: ...
//      specs_implemented: [...]
//    }, 
//    {id: ...}]
//    styles: { ... }
// }
// 
// detailed examples are in samples/hubs.js
// 
//////////////////////////////////////////////////////////////////

import g_spec_manager from "./spec";


// for each new hub we found, we would assign it a color_id
var _cur_color_id = 1;


// IMPORTANT: reference to spec should use ID instead of cached object
// And we should use the methods to access the details
// because the spec maybe hasn't resolved (this allows service
// to shown even if the spec isn't loaded yet)
class Service {
  constructor(thing, json) {
    _.merge(this, json);
    this.$thing = thing;
    this.$type = "service";
  }

  $get_spec() {
    if (this.spec) {
      return g_spec_manager.get(this.spec);
    }
  }

  $get(field) {
    var spec = this.$get_spec() || {};
    return this[field] || spec[field];
  }

  $name() {
    return __(this.$get("name"), this.i18n);
  }

  $description() {
    return __(this.$get("description"), this.i18n);
  }

  $doc() {
    return __(this.doc, this.i18n);
  }

  $icon() {
    return this.$get("icon");
  }

}


class Thing {
  constructor(hub, json) {
    _.merge(this, json);
    this.$hub = hub;
    this.$type = "thing";
    
    this.services = {};
    _.forOwn(json.services, s => {
      $hope.check(s.id, "Hub", "Service doesn't have an id", s);
      $hope.check(s.spec, "Hub", "Service doesn't have a spec", s);
      this.services[s.id] = new Service(this, s);
    });
  }

  $name() {
    return __(this.name, this.i18n);
  }

  $description() {
    return __(this.description, this.i18n);
  }

  $doc() {
    return __(this.doc, this.i18n);
  }
}

class Hub {
  constructor(json, force_to_add_ui_thing) {
    this.$type = "hub";
    _.merge(this, json);
    this.$color_id = _cur_color_id ++;
    // we don't need order of things so use it as a {} instead of []
    this.things = {};
    _.forOwn(json.things, t => {
      let thing = new Thing(this, t);
      if (thing.type === "ui_thing" && !force_to_add_ui_thing) {
        return;
      }
      $hope.check(!this.things[t.id], "HubManager", "Thing already added", t);
      this.things[t.id] = thing;
    });
    this.styles = this.styles || {};
    this.styles.things = this.styles.things || {};
  }

  $name() {
    return __(this.name, this.i18n);
  }

  $description() {
    return __(this.description, this.i18n);
  }

  $doc() {
    return __(this.doc, this.i18n);
  }

  get_all_things_using_spec(id) {
    var things = [];
    _.forOwn(this.things, thing => {
      _.forOwn(thing.services, svc => {
        if (svc.spec === id && things.indexOf(thing) === -1) {
          things.push(thing);
        }
      });
    });
    return things;
  }

  get_all_services_using_spec(id) {
    var services = [];
    _.forOwn(this.things, thing => {
      _.forOwn(thing.services, svc => {
        if (svc.spec === id && services.indexOf(svc) === -1) {
          services.push(svc);
        }
      });
    });
    return services;
  }

}



class HubManager {
  constructor() {
    this.hubs = {};
    this.center_built_in = null;    // the built_in_hub of center
  }

  // This collects all spec ids so we could load any missing one later
  // hub_array could be hub objects or just parsed_json, as they
  // share similar data hierarchy
  get_all_spec_ids_used_for_hub_array(hub_array) {
    var ids = [];
    _.forOwn(hub_array, d => {
      _.forOwn(d.things, t => {
        _.forOwn(t.services, s => {
          if (!ids[s.spec]) {
            ids.push(s.spec);
          }
        });
      });
    });
    return _.uniq(ids);
  }

  get_all_hub_ids_used() {
    var ids = [];
    _.forOwn(this.hubs, hub => {
      ids.push(hub.id);
    });
    return ids;
  }

  get_all_spec_ids_used() {
    return this.get_all_spec_ids_used_for_hub_array(
      $hope.hash_to_array(this.hubs)); 
  }


  // by default, we don't add UIThing
  // It is set to true only for debugging purpose normally
  add_hub(hub_json, force_to_add_ui_thing) {
    var d = new Hub(hub_json, force_to_add_ui_thing);
    if (d.type === "builtin") {
      $hope.check_warn(!this.center_built_in || 
        this.center_built_in.id === d.id, "HubManager", 
        "Multiple built_in_hub found");
      this.center_built_in = d;
    }
    var existing = this.hubs[d.id];
    $hope.check_warn(!existing, "HubManager", "Hub already added", d);
    // All external reference to hub, thing, service are through id
    // (i.e. only hub_view.x and this manager itself references objects directly)
    // so it is safe to directly replace it, but we need to keep color unchanged
    if (existing) {
      d.$color_id = existing.$color_id;
    } 
    this.hubs[d.id] = d;
    return d;
  }

  remove_hub(id) {
    delete this.hubs[id];
  }

  remove_thing(id) {
    _.forOwn(this.hubs, hub => {
      if (hub.things[id]) {
        delete hub.things[id];
        return false;
      }
    });
  }

  remove_service(id) {
    _.forOwn(this.hubs, hub => {
      let conti = true;
      _.forOwn(hub.things, t => {
        if (t.services[id]) {
          delete t.services[id];
          conti = false;
          return false;
        }
      });
      return conti;
    });
  }

  get_hub(hub_id) {
    return this.hubs[hub_id];
  }

  get_thing(hub_id, thing_id) {
    if (arguments.length === 1) {
      var th;
      _.forOwn(this.hubs, hub => {
        th = _.find(hub.things, "id", arguments[0]);
        if (th) {
          return false;
        }
      });
      return th;
    }
    var d = this.hubs[hub_id];
    if (d) {
      return d.things[thing_id];
    } 
    return undefined;
  }

  get_service(hub_id, thing_id, service_id) {
    if (arguments.length === 1) {
      var svc;
      _.forOwn(this.hubs, hub => {
        _.forOwn(hub.things, t => {
          svc = _.find(t.services, "id", arguments[0]);
          if (svc) {
            return false;
          }
        });
        if (svc) {
          return false;
        }
      });
      return svc;
    }
    var t = this.get_thing(hub_id, thing_id);
    if (t) {
      return t.services[service_id];
    }
    return undefined;
  }


  // Return the hub ids that aren't in manager yet
  find_unloaded_ids(hub_id_array) {
    var unloaded = [];
    _.forOwn(hub_id_array, id => {
      if (!this.get_hub(id)) {
        unloaded.push(id);
      }
    });
    return _.uniq(unloaded);
  }

}



export default new HubManager();

