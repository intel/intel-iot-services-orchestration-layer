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
//
// GraphStore is a singleton that manages GraphView.
// 
// TODO: Although currently we always assume that only one GraphView in 
// the system, but we might change (with some refactor) to allow multiple 
// graph views be shown.
//
// 
//////////////////////////////////////////////////////////////////

import {EventEmitter} from "events";
import ui_manager from "../lib/ui";

class WidgetData {
  constructor(app_id, widget_id) {
    this.app_id = app_id;
    this.widget_id = widget_id;
    this.data = [];
    this.state = 10;
    // whether it needs to fetch the data from the provider
    this.need_fetch_data = true;
  }
  get_widget() {
    return ui_manager.get_widget(this.widget_id);
  }
  get_spec() {
    return $hope.app.stores.spec.get_spec(this.get_widget().spec);
  }
  clear_data() {
    this.data = [];
  }
  // d is an array, ordered by hrtime
  // data in format of {
  //   data: data
  //   hrtime: hrtime
  // }
  add_data(d) {
    if (!_.isObject(d) || _.isEmpty(d)) {
      return;
    }
    if (!_.isArray(d)) {
      d = [d];
    }
    // merge the d and the this.data
    var res = [], _data = this.data, i = 0, j = 0, 
    max_pos_of_using_new_data = -1, _pos = -1;
    // return t1 means using new data
    function _next() {
      _pos ++;
      var t1 = i < d.length ? d[i] : null;
      var t2 = j < _data.length ? _data[j] : null;
      if (!t1 && !t2) {
        return null;
      }
      if (!t1) {
        j++;
        return t2;
      }
      if (!t2) {
        i++;
        max_pos_of_using_new_data = _pos;
        return t1;
      }
      if (t1.hrtime < t2.hrtime) {
        i++;
        max_pos_of_using_new_data = _pos;
        return t1;
      } else if (t1.hrtime > t2.hrtime) {
        j++;
        return t2;
      } else {
        i++;
        j++;
        return t2;
      }
    }
    var _x = _next();
    while (_x) {
      res.push(_x);
      _x = _next();
    }
    this.data = res;

    var data_cache_size = 10;

    var widget = this.get_widget();
    if (widget) {
      data_cache_size = widget.$get_data_cache_size();
    }

    // whether changed data remains in cache
    var is_changed = max_pos_of_using_new_data >= (this.data.length - data_cache_size);
    if (data_cache_size > 0) {
      while (this.data.length > data_cache_size) {
        this.data.shift();
      }
    }
    if (is_changed) {
      this.state ++;
      if (this.state >= 1000000) {
        this.state = 10;
      }
    }
  }
  get_data() {
    return this.data.map(d => d.data);
  }
  // used for checking whether the consumer state is different vs. latest state
  // if not the same, then consumer need to get_data() and update its status
  get_state() {
    return this.state;
  }
}

class WidgetDataProvider {
  // get intial data of a widget, it returns an array of data
  get_widget_data$(app_id, widget_id) {}
  // send data of a widget
  send_widget_data$(app_id, widget_id, data) {};
  // get notified for widget data updates
  // cb(e), e in format of {
  //   widget_id: ...
  //   data: [{
  //     port_x: ...
  //   }]
  // }
  // NOTE that the data is an array
  // TODO this should be improved to only listen apps it cares (and has permissions)
  listen$(cb) {}
  unlisten$(cb) {}
}

class HopeWidgetDataProvider extends WidgetDataProvider {
  constructor() {
    super();
    this.event = new EventEmitter();
  }

  get_widget_data$(app_id, widget_id) {
    return $hope.app.server.app.get_widget_data$(app_id, widget_id);
  }

  send_widget_data$(app_id, widget_id, data) {
    return $hope.app.server.app.send_widget_data$(app_id, widget_id, data);
  }

  listen$(cb) {
    var d = $Q.defer();
    this.event.on("data", cb);
    d.resolve();
    return d.promise;
  }

  unlisten$(cb) {
    var d = $Q.defer();
    this.event.removeListener("data", cb);
    d.resolve();
    return d.promise;
  }

  on_data_received(data) {
    this.event.emit("data", data);
  }
}


class WidgetDataManager {
  constructor() {
    this.data = {};
    this.data_provider = null;
    this.listener = this.on_data_received.bind(this);
  }

  set_data_provider(p) {
    if (p === this.data_provider) {
      return;
    }
    if (this.data_provider) {
      this.data_provider.unlisten$(this.listener);
    }
    this.data_provider = p;
    if (p) {
      p.listen$(this.listener);
    }
    // ensure it to fetch latest data from new provider upon get data
    _.forOwn(this.data, d => {
      d.clear_data();
      d.need_fetch_data = true;
    });
  }

  create_widget(app_id, widget_id) {
    if (!this.data[widget_id]) {
      this.data[widget_id] = new WidgetData(app_id, widget_id);
    }
    var w = this.data[widget_id];
    $hope.check(app_id === w.app_id, "Same widget id used in multiple apps");
    return w;
  }

  get_widget(widget_id) {
    return this.data[widget_id];
  }

  // this may trigger the fetch data for related widget
  get_data(widget_id) {
    var w = this.get_widget(widget_id);
    if (!w) {
      $hope.log.warn("widget", "failed to get widget with id when get_data", widget_id);
      return;
    }
    // trigger fetch data, NOTE that this data comes later so the data
    // now returned would be stale data
    // however, the consumers eventually get updated because on_data_receive()
    // emits the notification
    if (w.need_fetch_data && this.data_provider) {
      $hope.log("widget", "really fetch widget data:", widget_id);
      this.data_provider.get_widget_data$(w.app_id, w.widget_id).then(data => {
        if (data && data.length > 0) {
          this.on_data_received({
            widget_id: w.widget_id,
            data: data
          });
          w.need_fetch_data = false;
        }
      });
    }
    return w.get_data();
  }

  get_state(widget_id) {
    return this.get_widget(widget_id).get_state();
  }

  // TODO we might add buffered receive in the future
  // i.e. send an array of data instead of one by one
  on_data_received(e) {
    $hope.log("widget", "widget data received:", e);
    // only add to these cared about
    if (this.data[e.widget_id]) {
      this.data[e.widget_id].add_data(e.data);
      ui_store.emit("ui", {type: "widget", id: e.widget_id, event: "data/received"});
    }
  }

  // TODO we may batch add / remove widgets based on app
  // i.e. when open an app, its widgets are added
  // and they are removed upon leaving the app
  remove_widget(widget_id) {
    delete this.data[widget_id];
  }

  send_data$(widget_id, data) {
    var w = this.get_widget(widget_id);
    if (!w) {
      $hope.log.warn("widget", "failed to get widget with id when send data", widget_id);
      return;
    }

    if (this.data_provider) {
      return this.data_provider.send_widget_data$(w.app_id, w.widget_id, data);
    }

    var d = $Q.defer();
    d.reject("No data provider.");
    return d.promise;
  }
}

class UIView {
  constructor(ui_id) {
    this.id = ui_id;
    this.selected_widgets = {};
  }

  get_ui() {
    return ui_manager.get_ui(this.id);
  }

  get_app_id() {
    var ui = this.get_ui();
    if (ui && ui.app) {
      return ui.app;
    }
    var app = $hope.app.stores.app.get_app_by_ui_id(this.id);
    if (app) {
      return app.id;
    }
    return undefined;
  }

  get_app() {
    var appstore = $hope.app.stores.app;
    var ui = this.get_ui();
    if (ui && ui.app) {
      return appstore.get_app(ui.app);
    }
    return appstore.get_app_by_ui_id(this.id);
  }

  add_widget(json) {
    json.id = json.id || $hope.uniqueId("WIDGET_");
    var w = this.get_ui().$add_widget(json);
    ui_store.emit("ui", {type: "widget", id: w.id, event: "widget/added"});
  }

  change_widgets(items) {
    var ui = this.get_ui();
    items.map(w => {
      _.merge(ui.$get_widget(w.id), w);
    });
    ui_store.emit("ui", {type: "widget", event: "widget/changed"});
  }

  //////////////////////////////////////////////////////////////////
  // Selection Related
  //////////////////////////////////////////////////////////////////

  has_selections() {
    return !_.isEmpty(this.selected_widgets);
  }

  is_selected(id) {
    return this.selected_widgets[id];
  }

  select(id, is_selected, is_multiple_select) {
    var o = this.get_ui().$get_widget(id);
    if (!o) {
      return;
    } 
    var items = this.selected_widgets;
    if (is_selected && !is_multiple_select) {
        this.unselect_all();
    }
    if (is_selected && !items[id]) {
      items[id] = o;
      ui_store.emit("ui", {id: id, type: "widget", event: "selected"});
    } else if (!is_selected && items[id]) {
      delete items[id];
      ui_store.emit("ui", {id: id, type: "widget", event: "unselected"});
    }
    this.update_inspector();
  }

  unselect_all() {
    _.forOwn(this.selected_widgets, (k, n) => {
      this.select(n, false);
    });
  }

  update_inspector() {
    $hope.app.stores.ui_ide.update_inspector();
  }

  //////////////////////////////////////////////////////////////////
  // Action Handlers
  //////////////////////////////////////////////////////////////////

  _remove_items_action(widgets) {
    // need to clone
    var widgets_to_remove = {};
    _.forOwn(widgets, n => widgets_to_remove[n.id] = n);

    _.forOwn(widgets_to_remove, w => {
      delete this.selected_widgets[w.id];
      this.get_ui().$remove_widget(w.id);
    });
    
    ui_store.emit("ui", {id: this.id, type: "ui", event: "changed"});
    this.update_inspector();
  }

  send_data(widget_id, data) {
    ui_store.data.send_data$(widget_id, data).then(() => {
      ui_store.emit("ui", {id: this.id, type: "ui", event: "data/sended"});
    }).catch(err => {
      $hope.notify("error", __("Failed to send the data because"), err);
    }).done();
  }

  handle_action(action, data) {

    switch(action) {
      case "ui/add_widget":
        this.add_widget(data.widget);
        break;
      case "ui/change_widgets":
        this.change_widgets(data.widgets);
        break;
      case "ui/unselect/all":
        this.unselect_all();
        break;
      case "ui/select/widget":
        this.select(data.id, true, data.is_multiple_select);
        break;
      case "ui/unselect/widget":
        this.select(data.id, false);
        break;
      case "ui/remove/selected":
        this._remove_items_action(this.selected_widgets);
        break;
      case "ui/remove/widget":
        this._remove_items_action([this.get_ui().$get_widget(data.id)]);
        break;
      case "ui/send_data":
        this.send_data(data.id, data.data);
        break;
    }

  }

}

class UIStore extends EventEmitter {
  constructor() {
    super();

    this.manager = ui_manager;
    this.data = new WidgetDataManager();
    this.views = {};
    this.active_view = null;
    this.no_active_reason = "";

    var self = this;
    function _register(action_names) {
      var items = {};
      _.forOwn(action_names, n => {
        items[n] = self.handle_action.bind(self, n); 
      });
      $hope.register_action_handler(items);    
    }

    _register([
      "ui/set_active",
      "ui/add_widget",
      "ui/change_widgets",
      "ui/close",
      "ui/save",
      "ui/remove",
      "ui/send_data",
      "ui/unselect/all",
      "ui/select/widget",
      "ui/unselect/widget",
      "ui/remove/selected",
      "ui/remove/widget"
    ]);


  }

  
  get_widget(widget_id) {
    return this.manager.get_widget(widget_id);
  }

  get_widget_spec(widget_id) {
    var w = this.get_widget(widget_id);
    if (w) {
      return $hope.app.stores.spec.get_spec(w.spec);
    }
  }

  get_ui(ui_id) {
    return this.manager.get_ui(ui_id);
  }

  get_ui_by_widget(widget_id) {
    return this.manager.get_ui_by_widget(widget_id);
  }

  get_ui_id_by_widget(widget_id) {
    var ui = this.get_ui_by_widget(widget_id);
    return ui ? ui.id : null;
  }

  get_uis_of_app(app_id) {
    var app = $hope.app.stores.app.get_app(app_id);
    var uis = [];
    if (app && app.uis) {
      var loads = [];

      _.forEach(app.uis, u => {
        var ui = this.manager.get_ui(u.id);
        if (ui) {
          uis.push(ui);
        }
        else {
          loads.push(u.id);
        }
      });

      if (loads.length > 0) {
        this.load_uis(loads);
      }
    }
    return uis;
  }

  get_all_ui_ids_of_app(app_id) {
    var app = $hope.app.stores.app.get_app(app_id);
    var ids = [];
    if (app && app.uis) {
      _.forEach(app.uis, u => {
        ids.push(u.id);
      });
    }
    return ids;
  }

  get_widgets_of_app(app_id) {
    var r = [];
    var added = {};
    this.get_uis_of_app(app_id).map(u => {
      u.widgets.map(w => {
        if (!added[w.id]) {
          r.push(w);
          added[w.id] = true;
        }
      });
    });
    return r;
  }


  view(ui_id) {
    return this.views[ui_id];
  }


  set_active$(ui_id) {
    var d = $Q.defer(); 
    if (this.active_view && this.active_view.id === ui_id) {
      d.resolve();
    }

    this.active_view = null;
    this.no_active_reason = "loading";
    this.ensure_ui_loaded$(ui_id).then(view => {
      this.active_view = view;
      this.no_active_reason = "";
      this.emit("ui", {type: "ui", id: ui_id, event: "set_active"});
    }).catch(err => {
      $hope.check_warn(false, "ui", "failed due to", err);
      this.no_active_reason = $hope.error_to_string(err);
      $hope.notify("error", __("Failed to show the UI because"),
        this.no_active_reason);
      
      this.emit("ui", {type: "ui", id: ui_id, event: "set_active"});
      d.reject(err);
    }).done();

    return d.promise;

  }

  ensure_ui_bundles_ready$() {
    var ss = $hope.app.stores.spec;
    var d = $Q.defer();
    if(ss.get_ui_bundles().length !== 0) {
      d.resolve();
    }
    else {
      var t = setInterval(() => {
        if(ss.get_ui_bundles().length !== 0) {
          clearInterval(t);
          d.resolve();
        }
      }, 50);
    }
    return d.promise;
  }

  ensure_uis_loaded$(ids) {
    var d = $Q.defer();
    var unloaded = [];
    _.forEach(ids, id => {
      if (!this.view(id)) {
        unloaded.push(id);
      }
    });
    if (unloaded.length === 0) {
      d.resolve();
    } else {
      this.load_uis$(unloaded).then(() => { 
        d.resolve();
      }).catch(err => {
        $hope.log.error("spec", "Failed to load_uis$ for", unloaded, 
          "with error:", err);
        d.reject(err);
      }).done();
    }
    return d.promise;
  }

  ensure_ui_loaded$(ui_id) {
    var d = $Q.defer();  
    if (this.view(ui_id)) {
      d.resolve(this.view(ui_id));
    } else {
      this.ensure_ui_bundles_ready$().then(() => {
        return $hope.app.stores.app.ensure_apps_loaded$();
      }).then(() => {
        return this.load_ui$(ui_id);
      }).then(view => d.resolve(view))
        .catch(err => d.reject(err)).done();
    }
    return d.promise;
  }


  load_ui$(ui_id) {
    return $hope.app.server.ui.get$([ui_id]).then(uis => {
      this.manager.add_ui(ui_id, uis[0]);
      let view = new UIView(ui_id);
      this.views[view.id] = view;    
      return view;
    }); 
  }

  load_uis(ui_ids) {
    this.load_uis$(ui_ids).then(() => {
      this.emit("ui", {type: "ui", event: "loaded"});
    });
  }

  load_uis$(ui_ids) {
    return $hope.app.server.ui.get$(ui_ids).then(uis => {
      _.forOwn(uis, ui => {
        this.manager.add_ui(ui.id, ui);
        let view = new UIView(ui.id);
        this.views[view.id] = view;
      });
    });
  }

  save_active$() {
    var d = $Q.defer();
    if (!this.active_view) {
      d.resolve();
    }

    var method, params, view = this.active_view;
    var data = view.get_ui().$serialize();
    var backend = $hope.app.server;

    method = backend.ui.update$.bind(backend.ui);
    params = [data];

    method(...params).then(() => d.resolve())
                     .catch(err => d.reject(err)).done();
    return d.promise;
  }

  save() {
    var view = this.active_view;

    if (!view) {
      return;
    }
    this.save_active$().then(() => {
      this.emit("ui", {type: "ui", id: view.id, event: "saved"});
    }).catch(err => {
      $hope.notify("error", __("Failed to save UI because"), err.toString());
    }).done();
  }

  remove_ui(ids) {
    ids.map(id => {
      var v = this.views[id];
      this.manager.remove_ui(id);
      delete this.views[id];
      if (v === this.active_view) {
        this.active_view = null;
        this.no_active_reason = "closing";
        this.emit("ui", {type: "ui", id: null, event: "set_active"});
      }
    });
    $hope.app.server.ui.remove$(ids).done(data => {
      if (data.error) {
        $hope.notify("error", __("Failed to delete UI because"), data.error);
        return;
      }
      ids.map(id => {
        this.emit("ui", {type: "ui", id: id, event: "removed"});
      });
    });
  }

  close(id) {
    var v = this.view(id);
    if (!v) {
      return;
    }

    if (v === this.active_view) {
      this.active_view = null;
      this.no_active_reason = "closing";
      this.emit("ui", {type: "ui", id: null, event: "set_active"});
    }

    delete this.views[id];
  }

  // We need to update whole window when start or stop any workflow
  // referenced to this widget in same app
  handle_changed_event(started, stoped) {
    if (!this.active_view) {
      return;
    }

    var need_update = false;
    var myappid = this.active_view.get_app_id();

    if (_.isArray(started)) {
      _.forEach(started, id => {
        var app = $hope.app.stores.app.get_app_by_graph_id(id);
        if (app && app.id === myappid) {
          need_update = true;
        }
      });
    }

    if (need_update) {
      location.reload();
    }
  }

  clear_cache() {
    this.views = {};
    this.active_view = null;
    this.no_active_reason = "";
    this.manager.clear_cache();
  }

  handle_action(action, data) {
    switch (action) {
      case "ui/set_active":
        this.set_active$(data.ui_id);
        break;

      case "ui/save":
        this.save();
        break;

      case "ui/close":
        this.close(data.ui_id);
        break;

      case "ui/remove":
        this.remove_ui(data.uis);
        break;

      default:
        var view = this.view(data.ui_id);

        if (!view) {
          $hope.log.warn("UIStore", "UI not found when handle action", action,
            "with data", data);
          return; 
        }

        view.handle_action(action, data);
        break;
    }
  }
}
var ui_store = new UIStore();
ui_store.data.$hope_widget_data_provider = new HopeWidgetDataProvider();
//TODO replacing test data
ui_store.data.set_data_provider(ui_store.data.$hope_widget_data_provider);
export default ui_store;