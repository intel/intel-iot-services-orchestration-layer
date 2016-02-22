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



export default class Grid extends ReactComponent {
  static propTypes = {
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

    var dom = ReactDOM.findDOMNode(w);
    this.grid.remove_widget(dom, false);
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
      }
      w.$hope_is_added = true;
    });
    this.grid.commit();
  }


  componentDidMount() {

    var options = {
      always_show_resize_handle: false,
      float:            this.props.float || false,
      animate:          this.props.animate || false,
      cell_height:      $hope.config.widget_cell_height,
      vertical_margin:  $hope.config.widget_vertical_margin,
      height:           this.props.maxHeight || 0,
      auto:             false     // we will add_widget by ourselves
    };
    var gridstack = $(ReactDOM.findDOMNode(this)).gridstack(options);
    this.grid = gridstack.data("gridstack");

    this.update_widgets();
  }

  componentWillUnmount() {
    setTimeout(()=> {
      this.grid.destroy();
    }, 0);
   }

  componentDidUpdate() {
    setTimeout(()=> {
      this.update_widgets();
    }, 0);
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

  $state = -1;


  constructor(props) {
    super(props);

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
    window.location.replace("/#/ui/" + id); //TODO: hack hack
  }

  componentDidMount() {
    // NOTE that the cdm of Grid is invoked later than its children's cdm
    // so this would be added to parent and got invoked by gridstack's add_widget
    this.props.hopeGrid.add_widget(this);
  }

  componentWillUnmount() {
    this.props.hopeGrid.remove_widget(this);
  }

  shouldComponentUpdate(nextProps) {
    var widget = nextProps.widget;
    var data_manager = $hope.app.stores.ui.data;
    var latest_state = data_manager.get_state(widget.id);
    var gw = nextProps.gw || this.props.gw;
    if (latest_state === this.$state && gw === this.$gw) {
      return false;
    }
    this.$state = latest_state;
    this.$gw = gw;
    return true;
  }

  render(children) {
    var widget = this.props.widget;
    return (
      <div className={"grid-stack-item"}
           data-hope-widget-id={widget.id}
           key={widget.id}
           data-gs-no-resize={true}
           data-gs-no-move={true}
           data-gs-locked={true} >
        <div className={class_name("grid-stack-item-content", 
          "hope-ui-widget", widget.className)}>
          {children}
        </div>
      </div>
    );
  }
}

class UnknownWidget extends Widget {
  
  shouldComponentUpdate(nextProps) {
    return false;
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
