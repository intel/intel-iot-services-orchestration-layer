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


// see center/index.js function start
// TODOw workaround so far

var G = require("../../globals");
var _ = require("lodash");

var center = G.center;
if (!center) {
  throw new Error("Should have the center");
}
var frontends = [];
if (center.frontends.dev) {
  frontends.push(center.frontends.dev);
}
if (center.frontends.user) {
  frontends.push(center.frontends.user);
}


if (!center) {
  throw new Error("Failed to get Center");
}

var hub = _.get(center, "built_in_hub");
if (!hub) {
  throw new Error("Failed to get built_in_hub of Center");
}

var ui_thing = hub.get_ui_thing_from_app_id(CONFIG.app_id);
if (!ui_thing) {
  throw new Error("Failed to get ui_thing with app_id" + CONFIG.app_id);
}


function Listener(cb) {
  this.cb = cb;
}

Listener.prototype.start = function() {
  ui_thing.empty_cache();
  ui_thing.event.on(CONFIG.widget_id, this.cb);  
};

Listener.prototype.stop = function() {
  ui_thing.event.removeListener(CONFIG.widget_id, this.cb);  
};

var now = Date.now(); //ms from 1970-1-1-0:0:0
var now_hrtime = [Math.floor(now / 1000), now % 1000 * 1000000];
var base_hrtime = process.hrtime();

function abs_hrtime() {
  var t = process.hrtime();
  return (t[0] - base_hrtime[0] + now_hrtime[0]) * 1000000000 + 
            t[1] - base_hrtime[1] + now_hrtime[1]; 
}

service_shared.widget_emit = function(data) {
  data = {
    data: data,
    hrtime: abs_hrtime()
  };
  var hrtime = abs_hrtime();
  ui_thing.on_data_from_service(CONFIG.widget_id, data, CONFIG.cache_size);
  frontends.forEach(function(fe) {
    fe.app_emit(CONFIG.app_id, "widget", {
      widget_id: CONFIG.widget_id,
      data: [data]
    });
  });
};


service_shared.create_listener = function(cb) {
  return new Listener(cb);
};



done();
