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
// Widget implementation to specs

var widgets = {
  "hope/ui/text":      require("./generated/text"),
  "hope/ui/gauge":     require("./generated/gauge"),
  "hope/ui/image":     require("./generated/image"),
  "hope/ui/fan":       require("./generated/fan"),
  "hope/ui/chart":     require("./generated/chart"),
  "hope/ui/pie":       require("./generated/pie"),
  "hope/ui/progress":  require("./generated/progress"),
  "hope/ui/slider":    require("./generated/slider"),
  "hope/ui/combox":    require("./generated/combox"),

  // inputs
  "hope/ui/button":    require("./generated/button"),
  "hope/ui/switch":    require("./generated/switch"),
  "hope/ui/editbox":   require("./generated/editbox"),
  "hope/ui/light":     require("./generated/light"),
  "hope/ui/four_arrows": require("./generated/fourarrow"),

  // WebRTC
  "hope/ui/webrtc":    require("./generated/webrtc")
};

require("./plugins").forEach(function(m) {
  for(var id in m.widgets) {
    widgets[id] = m.widgets[id];
  }
});

exports.widgets = widgets;
exports.spec_bundle = require("./specs");
