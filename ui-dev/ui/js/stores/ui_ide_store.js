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




class UIIDEStore extends EventEmitter {

  constructor() {
    super();

    this.panel = {
      inspector: {
        visible: true
      }
    };

    this.nav_bar = {};    // TODO: this should be moved to hope_store 

    this.left_toolbar = {};

    this.widget_library = {};

    this.breadcrumb = {};

    this.ui_ide = {};

    this.layout();

    $hope.register_action_handler({
      "ui_ide/move/panel":       this.move_panel.bind(this)
    });

  }

  move_panel(e) {
    this.panel[e.panel].left = e.left;
    this.panel[e.panel].top = e.top;
  }

  update_toolbar() {
    this.emit("ui_ide", {type: "ui_ide", event: "update/toolbar"});
  }

  update_inspector() {
    this.emit("ui_ide", {type: "ui_ide", event: "update/inspector"});
  }

  layout() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w === this.prev_width && h === this.prev_height) {
      return;
    }
    this.prev_width = w;
    this.prev_height = h;

    // TODO height may need adjust, it is fetched from template.styl
    // .hope-nav-bar > img
    _.merge(this.nav_bar, {
      top: 0,
      left: 0,
      width: w,
      height: 60     
    });

    _.merge(this.left_toolbar, {
      top: this.nav_bar.height,
      left: 0,
      width: 60,
      height: h - this.nav_bar.height
    });

    _.merge(this.widget_library, {
      top:      this.nav_bar.height,
      left:     this.left_toolbar.width,
      width:    250,
      height:   h - this.nav_bar.height
    });


    _.merge(this.breadcrumb, {
      top:      this.nav_bar.height, 
      left:     this.left_toolbar.width + this.widget_library.width,
      width:    w - this.left_toolbar.width - this.widget_library.width,
      height:   24
    });

    _.merge(this.ui_ide, {
      top: this.nav_bar.height + this.breadcrumb.height,
      left: this.left_toolbar.width + this.widget_library.width,
      width: w - this.left_toolbar.width - this.widget_library.width,
      height: h - this.nav_bar.height - this.breadcrumb.height
    });

    _.merge(this.panel.inspector, {
      top: this.nav_bar.height + this.breadcrumb.height,
      left: w - 250,
      width: 250
    });
  }


  
}



export default new UIIDEStore();