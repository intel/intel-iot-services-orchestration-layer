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
//////////////////////////////////////////////////////////////////
// It is a singleton
// Stay at top level, i.e. whether holds a navigation bar etc.
//////////////////////////////////////////////////////////////////


import {EventEmitter} from "events";

class IDEStore extends EventEmitter {
  constructor() {
    super();

    this.theme = "hope-theme-dark";
    this.code_to_show = null;
    this.panel = {
      library: {
        visible: true
      },
      navigator: {
        visible: true
      },
      inspector: {
        visible: true,
        show_help: false
      }
    };

    this.nav_bar = {};
    this.side_bar = {
      current: "info",
      width_save: 300
    };

    this.left_toolbar = {};
    this.breadcrumb = {};

    this.graph_svg = {};

    this.palette = {
      visible: false,
      x: 0,
      y: 0,
      onSelect: null
    };

    this.layout();

    $hope.register_action_handler({
      "ide/change/theme":     this.change_theme.bind(this),
      "ide/show/code":        this.show_code.bind(this),
      "ide/hide/code":        this.hide_code.bind(this),
      "ide/move/panel":       this.move_panel.bind(this),
      "ide/show/palette":     this.show_palette.bind(this),
      "ide/hide/palette":     this.hide_palette.bind(this),
      "ide/toggle/sidebar":   this.toggle_sidebar.bind(this),
      "ide/show/rebind":      this.show_rebind.bind(this)
    });
  }


  change_theme(data) {
    if (this.theme !== data.theme) {
      this.theme = data.theme;
      this.emit("ide", {type: "ide", event: "changed/theme"});
    }
  }

  show_code(data) {
    this.code_to_show = data.code;
    this.emit("ide", {type: "ide", event: "show/code"});
  }

  hide_code() {
    this.code_to_show = null;
    this.emit("ide", {type: "ide", event: "hide/code"});
  }

  move_panel(e) {
    this.panel[e.panel].left = e.left;
    this.panel[e.panel].top = e.top;
  }

  layout(force) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (!force && w === this.prev_width && h === this.prev_height) {
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

    _.merge(this.panel.library, {
      top:      this.nav_bar.height,
      left:     this.left_toolbar.width,
      width:    this.panel.library.visible ? 250 : 0,
      height:   h - this.nav_bar.height
    });

    _.merge(this.side_bar, {
      top: this.nav_bar.height,
      left: w - this.left_toolbar.width - this.panel.library.width,
      width: this.side_bar.current ? this.side_bar.width_save || 300 : 0,
      height: h - this.nav_bar.height
    });

    _.merge(this.breadcrumb, {
      top:      this.nav_bar.height, 
      left:     this.left_toolbar.width + this.panel.library.width,
      width:    w - this.left_toolbar.width - this.panel.library.width,
      height:   24
    });

    _.merge(this.graph_svg, {
      top: this.nav_bar.height + this.breadcrumb.height,
      left: this.left_toolbar.width + this.panel.library.width,
      width: w - this.left_toolbar.width - this.panel.library.width - this.side_bar.width - 35/*sidebar-tabs*/,
      height: h - this.nav_bar.height - this.breadcrumb.height
    });

    _.merge(this.panel.navigator, {
      width: 300,
      height: 200
    });

    _.merge(this.panel.inspector, {
      top: this.nav_bar.height + this.breadcrumb.height,
      left: w - 250,
      width: 250
    });

  }

  update_toolbar() {
    this.emit("ide", {type: "ide", event: "update/toolbar"});
  }

  update_inspector() {
    this.emit("ide", {type: "ide", event: "update/inspector"});
  }

  update_navigator() {
    this.emit("ide", {type: "ide", event: "update/navigator"});
  }

  toggle_library() {
    this.panel.library.visible = !this.panel.library.visible;
    this.layout(true);
    this.emit("ide", {type: "ide", event: "toggle/library"});
  }

  toggle_sidebar(data) {
    if (this.side_bar.current !== data.button) {
      if (this.side_bar.current === null) {
        this.side_bar.width = this.side_bar.width_save;
        this.graph_svg.width -= this.side_bar.width_save;
      }
      this.side_bar.current = data.button;
    }
    else {
      this.side_bar.current = null;
      this.side_bar.width_save = this.side_bar.width;
      this.side_bar.width = 0;
      this.graph_svg.width += this.side_bar.width_save;
    }
    if (this.side_bar.current) {
      this.side_bar.previous = this.side_bar.current;
    }
    this.emit("ide", {type: "ide", event: "resize/sidebar"});
  }

  resize_sidebar(d) {
    this.side_bar.width -= d;
    if (this.side_bar.width < 0) {
      this.side_bar.width = 0;
    }
    if (this.side_bar.width === 0 && this.side_bar.current !== null) {
      this.side_bar.current = null;
      this.side_bar.width = 0;
      this.graph_svg.width += this.side_bar.width_save;
    }
    else {
      this.side_bar.width_save = this.side_bar.width;
    }

    var w = window.innerWidth;
    this.graph_svg.width = w - this.left_toolbar.width - this.panel.library.width - this.side_bar.width - 35/*sidebar-tabs*/;
    this.emit("ide", {type: "ide", event: "resize/sidebar"});
  }


  show_palette(data) {
    _.merge(this.palette, {
      visible:  true,
      x:        data.x,
      y:        data.y,
      onSelect: data.onSelect
    });
    this.emit("ide", {type:"ide", event: "show/palette"});
  }

  hide_palette() {
    if (this.palette.visible) {
      this.palette.visible = false;
      this.emit("ide", {type:"ide", event: "hide/palette"});
    }
  }

  show_rebind() {
    this.emit("ide", {type:"ide", event: "show/rebind"});
  }

}

export default new IDEStore();