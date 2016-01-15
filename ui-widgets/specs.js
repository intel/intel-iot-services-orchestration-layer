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
// This should comply with spec_bundle definition
var specs = [{
  id:           "hope/ui/text",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Text",
  description:  "Show Text",
  icon:         "text-width",

  use_ract:     true,
  data_cache_size: 3,   // how many data items would be cached to show the widget    
                        // 0 for using default, -1 means unliminted
  config: [{
    name: "defval",
    display: "Default",
    type: "string"
  }, {
    name: "align",
    type: "option",
    default: "left",
    options: ["left", "center", "right"]
  }, {
    name: "font_size",
    display: "Font Size",
    type: "string"
  }],

  in: {
    ports: [{
      name: "text",
      type: "string"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/button",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Button",
  description:  "Output a event if clicked",
  icon:         "square",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "caption",
    type: "string",
    default: "Command"
  }, {
    name: "action",
    type: "option",
    default: "event",
    options: [{
      name: "Message output",
      value: "event"
    }, {
      name: "UI switch",
      value: "ui"
    }]
  }, {
    name: "message",
    type: "string",
    depend: "$$.action === 'event'"
  }, {
    name: "target_ui",
    display: "Target UI",
    type: "option",
    options: "__HOPE_APP_UI_LIST__",
    depend: "$$.action === 'ui'"
  }],

  extra: [{
    name: "style",
    type: "option",
    default: "default",
    options: [{
      name: "Default",
      value: "default"
    }, {
      name: "Primary",
      value: "primary"
    }, {
      name: "Success",
      value: "success"
    }, {
      name: "Info",
      value: "info"
    }, {
      name: "Warning",
      value: "warning"
    }, {
      name: "Danger",
      value: "danger"
    }, {
      name: "Link",
      value: "link"
    }]
  }],

  in: {
    ports: []
  },
  out: {
    ports: [{
      name: "event",      // name of widget
      type: "string"
    }]
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/editbox",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Editbox",
  description:  "Text input box",
  icon:         "edit",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "type",
    type: "option",
    default: "sle",
    options: [{
      name: "Single Line",
      value: "sle"
    }]
  }, {
    name: "glyph",
    display: "Glyphicon",
    type: "glyphicon",
    default: "check",
    depend: "$$.type === 'sle'"
  }],

  extra: [{
    name: "placeholder",
    type: "string",
    depend: "$$.type === 'sle'"
  }, {
    name: "auto_submit",
    display: "Auto submit",
    type: "boolean",
    default: false
  }],

  in: {
    ports: [{
      name: "preset",
      type: "string"
    }]
  },
  out: {
    ports: [{
      name: "text",      // output text
      type: "string"
    }]
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/slider",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Slider",
  description:  "Input range slider",
  icon:         "sliders",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "step",
    type: "number",
    default: 1
  }, {
    name: "min",
    type: "number",
    default: 0
  }, {
    name: "max",
    type: "number",
    default: 100
  }],

  in: {
    ports: [{
      name: "preset",
      type: "number"
    }]
  },
  out: {
    ports: [{
      name: "output",      // output number
      type: "number"
    }]
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/combox",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Combo box",
  description:  "Combo box control",
  icon:         "list-alt",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "options",
    type: "object"
  }],

  in: {
    ports: [{
      name: "preset",
      type: "string"
    }]
  },
  out: {
    ports: [{
      name: "output",
      type: "string"
    }]
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/fan",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Fan",
  description:  "Animated fan",
  icon:         "cog",

  use_ract:     true,
  data_cache_size: 1,

  config: [],

  in: {
    ports: [{
      name: "state",      // state of fan
      type: "boolean"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/chart",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "LineChart",
  description:  "Area/Line charts",
  icon:         "line-chart",

  use_ract:     true,
  data_cache_size: 100,

  config: [{
    name: "type",
    type: "option",
    default: "line",
    options: [{
      name: "Line Chart",
      value: "line"
    }, {
      name: "Area Chart",
      value: "area"
    }]
  }, {
    name: "bezier",
    display: "Bezier Curve",
    type: "boolean",
    default: true
  }],

  in: {
    ports: [{
      name: "series1",
      type: "number"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/pie",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "PieChart",
  description:  "Pie/Doughnut charts",
  icon:         "pie-chart",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "type",
    type: "option",
    default: "Pie",
    options: ["Pie", "Doughnut"]
  }, {
    name: "percentageInnerCutout",
    display: "Inner percent",
    type: "number",
    default: 50,
    depend: "$$.type === 'Doughnut'"
  }, {
    name: "colors",
    type: "object",
    sub_type: "color",
    headers: ["Label", "Color"]
  }],

  in: {
    ports: [{
      name: "input",
      type: "object"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/progress",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Progress",
  description:  "Progress bar",
  icon:         "spinner",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "active",
    display:"Animated",
    type: "boolean"
  }, {
    name: "striped",
    type: "boolean",
    depend: "!$$.active"
  }],

  extra: [{
    name: "label",
    type: "option",
    default: "%(percent)s%",
    options: [{
      name: "Percent",
      value: "%(percent)s%"
    }, {
      name: "None",
      value: ""
    }]
  }, {
    name: "min",
    type: "number",
    default: 0
  }, {
    name: "max",
    type: "number",
    default: 100
  }],

  in: {
    ports: [{
      name: "position",
      type: "number"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/gauge",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Gauge",
  description:  "Numberic gauge",
  icon:         "dashboard",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "title",
    type: "string"
  }, {
    name: "min",
    type: "number",
    default: 0
  }, {
    name: "max",
    type: "number",
    default: 100
  }],

  extra: [{
    name: "minor_ticks",
    display: "Minor Ticks",
    type: "number",
    default: 5
  }, {
    name: "yellow_min",
    display: "Yellow min",
    type: "number"
  }, {
    name: "yellow_max",
    display: "Yellow max",
    type: "number"
  }, {
    name: "red_min",
    display: "Red min",
    type: "number"
  }, {
    name: "red_max",
    display: "Red max",
    type: "number"
  }],

  in: {
    ports: [{
      name: "value",
      type: "number"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/image",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Image",
  description:  "Show image",
  icon:         "image",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "url",
    type: "string"
  }],

  in: {
    ports: []
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/switch",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Switch",
  description:  "Switch button",
  icon:         "toggle-on",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "label",
    type: "string"
  }],

  extra: [{
    name: "on",
    display: "ON Text",
    type: "string",
    default: "ON"
  }, {
    name: "off",
    display: "OFF Text",
    type: "string",
    default: "OFF"
  }],

  in: {
    ports: [{
      name: "preset",
      type: "boolean"
    }]
  },
  out: {
    ports: [{
      name: "state",
      type: "boolean"
    }]
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/light",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Light",
  description:  "Indicator Light",
  icon:         "lightbulb-o",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "label",
    type: "string"
  }],

  extra: [{
    name: "on",
    display: "ON Text",
    type: "string",
    default: "ON"
  }, {
    name: "off",
    display: "OFF Text",
    type: "string",
    default: "OFF"
  }],

  in: {
    ports: [{
      name: "state",
      type: "boolean"
    }]
  },
  out: {
    ports: []
  }
},
/////////////////////////////////////////////////
{
  id:           "hope/ui/webrtc",
  type:         "spec",
  is_ui:        true,
  catalog:      "webrtc",
  name:         "video",
  description:  "Intel CS for WebRTC Client",
  icon:         "video-camera",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "peerServerIP",
    type: "string",
    required: true
  }, {
    name: "cameraID",
    type: "string",
    required: true
  }],

  in: {
    ports: [{
      name: "control",
      type: "boolean"
    }]
  },
  out: {
    ports: []
  }
}];

if (process.browser) {
  require("./plugins").forEach(function(m) {
    specs = specs.concat(m.specs);
  });
}
else {
  specs = specs.concat(require("./plugins-specs.json"));
}

// ensure it contains required information
specs.forEach(function(s) {
  s.type = "spec";
  s.is_ui = true;
});

// export it as a bundle
module.exports = {
  id: "hope/ui",
  is_ui: true,
  name: "Builtin UI",
  description: "Builtin UI Widgets",
  specs: specs
};