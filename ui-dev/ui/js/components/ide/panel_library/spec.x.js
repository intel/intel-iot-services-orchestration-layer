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
import {Row, Col} from "react-bootstrap";
import {Link} from "react-router";
import DragFromLib from "./drag_from_lib.x";


export default class Spec extends ReactComponent {
  static propTypes = {
    spec: React.PropTypes.object.isRequired,
    instance: React.PropTypes.object,         // only for ui spec
    onClick: React.PropTypes.func,
    onDoubleClick: React.PropTypes.func,
    draggable: React.PropTypes.bool,
    scalable: React.PropTypes.bool
  };

  _on_click(e) {
    if (_.isFunction(this.props.onClick)) {
      this.props.onClick(e);
    }
  }

  _on_double_click(e) {
    if (_.isFunction(this.props.onDoubleClick)) {
      this.props.onDoubleClick(e);
    }
  }

  _create_drag_object() {
    let view = $hope.app.stores.graph.active_view;
    var instance = this.props.instance;
    var spec = this.props.spec;
    var div = document.createElement("div");

    ReactDOM.render(
      <DragFromLib
          scale={this.props.scalable && view ? view.zoom_scale : 1}
          text={(instance && instance.name) || spec.name}/>,
      div);

    $(div).css("z-index", 1000);
    $(div).data("hope-spec-id", spec.id);
    if (instance) {
      var graph = $hope.app.stores.graph.active_view;
      var hub = $hope.app.stores.hub.manager.center_built_in;
      var app = graph.get_app();
      // see ui_thing.js in backend for id conversions
      $(div).data("hope-widget-id", instance.id);
      $(div).data("hope-spec-binding-service-id", "UI_SERVICE__" + instance.id);
      $(div).data("hope-spec-binding-thing-id", "HOPE_UI_THING__" + hub.id + app.id);
      $(div).data("hope-spec-binding-hub-id", hub.id);
    }
    return div;
  }


  componentDidMount() {
    if (this.props.draggable) {
      $(ReactDOM.findDOMNode(this)).draggable({
        cursor: "move",
        cursorAt: {top: 0, left: 0},
        helper: this._create_drag_object.bind(this)     // not autobound
      });
    } 
  }

  render() {
    var instance = this.props.instance;
    var spec = this.props.spec, drag_accept;
    if (spec.is_ui && !instance) {
      drag_accept = "widget-accept";
    } else {
      drag_accept = "graph-accept";
    }
    return (
      <Row className={"hope-panel-lib-view-third-level " + drag_accept}
          onClick={this._on_click} onDoubleClick={this._on_double_click}>
        <Col xs={2}/>
        <Col className="text-center" xs={1}>
          <i className={"fa fa-" + (spec.icon ? spec.icon : "cog")}/>
        </Col>
        <Col xs={8}>
          {instance ? (instance.name || "No Name (" + spec.name + ")") : spec.name}
        </Col>
        { spec.is_ui && instance &&
          <Col className="text-center" xs={1}>
            <Link to={`/ui_ide/${$hope.app.stores.ui.get_ui_id_by_widget(instance.id)}`}
                  query={{ widget: instance.id }}>
              <i className="fa fa-angle-double-right hope-panel-lib-code-edit-icon"/>
            </Link>
          </Col>
        }
      </Row>
    );
  }
}

