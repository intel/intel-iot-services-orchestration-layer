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
import spec_manager from "./spec";


function get_spec_config(id) {
  var config = {};
  var spec = spec_manager.get(id);
  if (spec) {
    var items = spec.extra ? spec.config.concat(spec.extra) : spec.config;
    _.forOwn(items, item => {
      if (item.name && ("default" in item)) {
        config[item.name] = item.default;
      }
    });
  }
  return config;
}

//
// {
//   id: unique_id
//   name:
//   spec: widget_spec_id
//   x:
//   y:
//   width:
//   height:
//   initial_data: {}
//   config: {}
// }
//
class Widget {
  constructor(json) {
    _.merge(this, {config: get_spec_config(json.spec)}, json);
  }

  $get_spec() {
    return spec_manager.get(this.spec);
  }

  $get_data_cache_size(defval) {
    if ("data_cache_size" in this) {
      return this.data_cache_size;
    }
    var spec = this.$get_spec();
    if (spec && ("data_cache_size" in spec)) {
      return spec.data_cache_size;
    }
    return defval === undefined ? 1 : defval;
  }
}


//
// {
//   widgets: [...]
// }
// 
class UI {
  constructor(json) {
    _.merge(this, json);
    this.widgets = [];
    _.forOwn(json.widgets, widget_json => this.widgets.push(new Widget(widget_json)));

    this.$widgets_idx = $hope.array_to_hash(this.widgets, "id");
  }

  $get_widget(id) {
    return this.$widgets_idx[id];
  }

  $remove_widget(id) {
    var w = this.$get_widget(id);
    if (w) {
      delete this.$widgets_idx[id];
      _.remove(this.widgets, _w => _w.id === id);
    }
  }

  $find_widget(name) {
    return _.find(this.widgets, ["name", name]);
  }

  $alloc_widget_name(prefix) {
    prefix = _.camelCase(prefix);
    for (var i = 1; i < 10000; i++) {
      var name = prefix + i;
      var w = this.$find_widget(name);
      if (!w) {
        return name;
      }
    }
    $hope.error("UI", "Too many widget");
    return "";
  }

  $add_widget(json) {
    if (!json.name && json.spec) {
      var spec = spec_manager.get(json.spec);
      if (spec && spec.name) {
        json.name = this.$alloc_widget_name(spec.name);
      }
    }
    var w = new Widget(json);
    $hope.check_warn(!this.$get_widget(w.id), "UI", "Widget already exist", json);
    this.widgets.push(w);
    this.$widgets_idx[w.id] = w;
    return w;
  }

  $serialize() {
    return $hope.serialize(this, true);
  }
}



class UIManager {
  constructor() {
    this.uis = {};      
  }

  get_ui(ui_id) {
    return this.uis[ui_id];
  }

  remove_ui(ui_id) {
    delete this.uis[ui_id];
  }

  update_ui(ui_id, json, is_new) {
    var ui = new UI(json);
    if (is_new) {
      $hope.check_warn(!this.uis[ui_id], "UI", 
        "UI to add already exists:", ui_id);
    } else {
      $hope.check_warn(this.uis[ui_id], "UI",
        "UI to update doesn't exist:", ui_id);
    }
    this.remove_ui(ui_id);
    this.uis[ui_id] = ui;
    return ui;
  }

  add_ui(ui_id, json) {
    return this.update_ui(ui_id, json, true);
  }

  get_widget(widget_id) {
    var found;
    _.forOwn(this.uis, ui => {
      found = ui.$get_widget(widget_id);
      if (found) {
        return false;
      }
    });
    return found;
  }

  get_ui_by_widget(widget_id) {
    var found = null;
    _.forOwn(this.uis, ui => {
      if (ui.$get_widget(widget_id)) {
        found = ui;
        return false;
      }
    });
    return found;
  }

  clear_cache() {
    this.uis = {};
  }
}

var ui_manager = new UIManager();
export default ui_manager;