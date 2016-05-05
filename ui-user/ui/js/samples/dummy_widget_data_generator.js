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
// This generates faked UI widget data for testing purpose

import {EventEmitter} from "events";
import ui_manager from "../lib/ui";

function random_int(max) {    // [0, max)
  return Math.floor(Math.random() * max);
}

var alphabet = "abcdefghijklmnopqrstuvwxyz" +
               "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
               "0123456789" +
               "_-";
var alphabet_length = alphabet.length;


// lenth is len if is_fixed_len, otherwise in [1, len]
function random_str(len = 10, is_fixed_len) {
  if (!is_fixed_len) {
    len = random_int(len) + 1;
  }
  var s = "";
  for (var i = 0; i < len; i++) {
    s += alphabet[random_int(alphabet_length)];
  }
  return s;
}

function random_primitive(type) {
  switch (type) {
    case "number":
    case "int":       return random_int(100);
    case "string":    return random_str(10);
    case "boolean":   return random_int(100) >= 50;
    default:          return "__unknown_type_" + type + "__";
  }
}

function random_data_for_ports(ports_from_spec = []) {
  var data = {};
  _.forEach(ports_from_spec, p => {
    data[p.name] = random_primitive(p.type || "string");
  });
  return data;
}


class Generator extends EventEmitter {
  constructor() {
    super();
    this.ratio = 50;    // xx% widget would get new data generated each heartbeat
    this.interval = 500;  // gen data by every xx ms
    this.default_size_limit = 10;

    this.widgets = {};
    this.timer = null;
  }

  _randomly_gen_data_for_a_widget(widget_id) {
    if (random_int(100) > this.ratio) {
      return;
    }
    var spec = $hope.app.stores.ui.get_widget_spec(widget_id);
    // spec maybe not ready yet
    if (!spec) {
      return;
    }
    var limit;
    var widget = ui_manager.get_widget(widget_id);
    if (widget) {
      limit = widget.$get_data_cache_size();
    }
    else {
      limit = (spec && spec.data_cache_size) ? spec.data_cache_size : this.default_size_limit;
    }
    if (!spec.in || !spec.in.ports || spec.in.ports.length === 0) {
      return;
    }
    if (!this.widgets[widget_id]) {
      this.widgets[widget_id] = [];
    }
    var data = this.widgets[widget_id];
    var new_datum = random_data_for_ports(spec.in.ports);
    data.push(new_datum);
    this.emit("data", {widget_id: widget_id, data: new_datum});
    while (data.length > limit) {
      data.shift();
    }
  }

  get_widget_data(widget_id) {
    return this.widgets[widget_id];
  }

  _run() {
    _.forOwn(this.widgets, (w, id) => {
      this._randomly_gen_data_for_a_widget(id);
    });
    this.timer = setTimeout(this._run.bind(this), this.interval);
  }

  start() {
    if (this.timer) {
      return;
    }
    this._run();
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  add_widgets(ids) {
    if (!_.isArray(ids)) {
      ids = [ids];
    }
    ids.forEach(id => {
      if (!this.widgets[id]) {
        this.widgets[id] = [];
      }
    });
  }

  remove_widgets(ids) {
    if (!_.isArray(ids)) {
      ids = [ids];
    }
    ids.forEach(id => {
      delete this.widgets[id];
    });
  }
}


var generator = new Generator();
generator.start();

export default generator;