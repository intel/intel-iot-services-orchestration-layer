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

import class_name from "classnames";


function get_widget_impl(widget) {
  var spec = $hope.app.stores.spec.get_spec(widget.spec);
  if (spec && spec.is_ui) {
    return spec.$get_impl();
  }
  return UnknownWidget;
}

// _.isEqual does not works
function is_object_equal(aobj, bobj) {
  var akeys = _.keys(aobj);
  var bkeys = _.keys(bobj);
  if (akeys.length !== bkeys.length) {
    return false;
  }
  for (var i = 0; i < akeys.length; i++) {
    var a = aobj[akeys[i]],
        b = bobj[akeys[i]];
    if (typeof a !== typeof b) {
      return false;
    }
    if (typeof a === "object") {
      if (!is_object_equal(a, b)) {
        return false;
      }
    }
    else if (a !== b) {
      return false;
    }
  }
  return true;
}



export default class Grid extends ReactComponent {
  static propTypes = {
    onChange:                 React.PropTypes.func,
    alwaysShowResizeHandle:   React.PropTypes.bool,
    float:                    React.PropTypes.bool,    
    animate:                  React.PropTypes.bool,
    cellHeight:               React.PropTypes.number,
    verticalMargin:           React.PropTypes.number,
    maxHeight:                React.PropTypes.number,
    width:                    React.PropTypes.number
  };

  constructor() {
    super();
    this.widgets = [];
  }

  remove_widget(w) {
    _.remove(this.widgets, w);
    if (w.$hope_is_added) {
      var dom = ReactDOM.findDOMNode(w);

      // delete DOM node delayed, prevent React error
      setTimeout(() => {
        this.grid.remove_widget(dom);
      }, 0);
    }
    w.$hope_is_added = false;
  }

  add_widget(w) {
    this.widgets.push(w);
  }


  update_widgets() {
    this.grid.batch_update();
    this.widgets.forEach(w => {
      if (!w.$hope_is_added) {
        let widget = w.props.widget;
        let auto = widget.auto_position || false;
        if (!_.isNumber(widget.x) || !_.isNumber(widget.y)) {
          auto = true;
        }
        $hope.log("widget", "add", widget, "is_auto:", auto);
        var dom = ReactDOM.findDOMNode(w);
        this.grid.add_widget(dom,
          widget.x, widget.y, widget.width, widget.height, auto);
        //dom.style["min-width"] = widget.width * 100 + "px";
      }
      w.$hope_is_added = true;
    });
    this.grid.commit();
  }


  _on_widgets_changed(e, items) {
    if (items && _.isFunction(this.props.onChange)) {
      this.props.onChange(items.map(node => {
        return {
          id: node.el.data("hopeWidgetId"),
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height
        };
      }));
    }
  }


  componentDidMount() {

    var options = {
      always_show_resize_handle: this.props.alwaysShowResizeHandle || false,
      float:            this.props.float || false,
      animate:          this.props.animate || false,
      cell_height:      $hope.config.widget_cell_height,
      vertical_margin:  $hope.config.widget_vertical_margin,
      height:           this.props.maxHeight || 0,
      auto:             false     // we will add_widget by ourselves
    };
    var gridstack = $(ReactDOM.findDOMNode(this)).gridstack(options);
    this.grid = gridstack.data("gridstack");

    if (_.isFunction(this.props.onChange)) {
      gridstack.on("change", this._on_widgets_changed);
    }
    this.update_widgets();
  }

  componentDidUpdate() {
    this.update_widgets();
  }


  render() {
    var children = _.map(this.props.widgets, w => {
      return React.createElement(get_widget_impl(w), {
          key: w.id,
          view: this.props.view,
          gw: this.props.width,
          hopeGrid: this,
          widget: w
      });
    });
    return (
      <div className={class_name(this.props.className, "grid-stack")}>
      {children}
      </div>
    );
  }
}



class Widget extends ReactComponent {
  static propTypes = {
    view:           React.PropTypes.object.isRequired,
    hopeGrid:       React.PropTypes.object.isRequired,
    widget:         React.PropTypes.object.isRequired,
    gw:             React.PropTypes.number.isRequired
  };

  constructor(props) {
    super();

    this.$state = -1;
    this.$selected = false;
    this.DEBUG = true;

    if (_.isFunction(this._on_settings_changed)) {
      this.widget_cached = _.cloneDeep(props.widget);
    }
    // ensure data is created
    $hope.app.stores.ui.data.create_widget(props.view.get_app_id(), props.widget.id);
  }

  get_data() {
    var widget = this.props.widget;
    var data_manager = $hope.app.stores.ui.data;
    return data_manager.get_data(widget.id);
  }

  get_height() {
    var h = this.props.widget.height;
    return h * $hope.config.widget_cell_height + (h - 1) * $hope.config.widget_vertical_margin;
  }

  get_width() {
    var w = this.props.widget.width;
    return w * this.props.gw / 12;
  }

  set_css(id, css) {
    var style = $("style#" + id);
    if (style.length === 0) {
      style = $("<style id='" + id + "' type='text/css'>" + css + "</style>");
      $("head").append(style);
    }
  }

  //
  // {
  //    "PORT_1": data,
  //    "PORT_2": data
  // }
  //
  send_data(json) {
    if (_.isEmpty(json)) {
      return;
    }

    $hope.trigger_action("ui/send_data", {
      ui_id: this.props.view.id, 
      id: this.props.widget.id,
      data: json
    });
  }

  // Switch UI
  switch_ui(id) {
    $hope.log("UI", "switch to:", id);
  }

  _is_selected() {
    return this.props.view.is_selected(this.props.widget.id);
  }

  // Subclasses maybe use _on_click
  _on_content_click(e) {
    e.stopPropagation();
    // Prevent screen blink
    if (!e.ctrlKey && this._is_selected()) {
      return;
    }
    $hope.trigger_action("ui/select/widget", {
      ui_id: this.props.view.id, 
      id: this.props.widget.id,
      is_multiple_select: e.ctrlKey
    });
  }

  _on_ui_event(e) {
    var w = this.props.widget;
    switch(e.event) {
      case "widget/changed":
        if (!is_object_equal(this.widget_cached, w)) {
          var prev = this.widget_cached;
          this.widget_cached = _.cloneDeep(w);
          this._on_settings_changed(prev, w);
        }
        break;
    }
  }

  componentDidMount() {
    // NOTE that the cdm of Grid is invoked later than its children's cdm
    // so this would be added to parent and got invoked by gridstack's add_widget
    this.props.hopeGrid.add_widget(this);

    if (_.isFunction(this._on_settings_changed)) {
      $hope.app.stores.ui.on("ui", this._on_ui_event);
    }
  }

  componentWillUnmount() {
    this.props.hopeGrid.remove_widget(this);

    if (_.isFunction(this._on_settings_changed)) {
      $hope.app.stores.ui.removeListener("ui", this._on_ui_event);
    }
  }

  shouldComponentUpdate(nextProps) {
    var widget = nextProps.widget;
    var data_manager = $hope.app.stores.ui.data;
    var latest_state = data_manager.get_state(widget.id);
    var selected = this._is_selected(widget.id);
    var gw = nextProps.gw || this.props.gw;
    if (latest_state === this.$state && selected === this.$selected && gw === this.$gw) {
      return false;
    }
    this.$state = latest_state;
    this.$selected = selected;
    this.$gw = gw;
    return true;
  }

  render(children) {
    var widget = this.props.widget;
    return (
      <div className={"grid-stack-item" + (this.$selected ? " selected" : "")}
           data-hope-widget-id={widget.id}
           key={widget.id}
           data-gs-no-resize={widget.no_resize || false}
           data-gs-no-move={widget.no_move || false}
           data-gs-locked={widget.locked || false} >
        <div className={class_name("grid-stack-item-content", 
          "hope-ui-widget", widget.className)}
          onClick={this._on_content_click}>
          {children}
        </div>
      </div>
    );
  }
}

class UnknownWidget extends Widget {
  
  shouldComponentUpdate(nextProps) {
    var widget = nextProps.widget;
    var selected = this._is_selected(widget.id);
    var gw = nextProps.gw || this.props.gw;
    if (selected === this.$selected && gw === this.$gw) {
      return false;
    }
    this.$selected = selected;
    this.$gw = gw;
    return true;
  }

  render() {
    var widget = this.props.widget;
    return super.render(
      <div style={{
          width: "100%",
          height: "100%",
          background: "red",
          color: "yellow",
          textAlign: "center"
        }}>
        <strong>{__("Unknown UI Widget")}</strong>
        <div style={{
          color: "blue"
        }}>{widget.spec}</div>
      </div>
    );
  }
}

window.Widget = Widget;
window.ReactBootstrap = require("react-bootstrap");
