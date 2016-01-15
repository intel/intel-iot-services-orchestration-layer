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
import {Row, Col, Popover, MenuItem} from "react-bootstrap";
import {Link} from "react-router";
import DragFromLib from "./drag_from_lib.x";
import class_name from "classnames";
import Dialog from "../dialog.x";
import Overlay from "../../overlay.x";

export default class Service extends ReactComponent {
  static propTypes = {
    service: React.PropTypes.object.isRequired,
    onClick: React.PropTypes.func,
    onDoubleClick: React.PropTypes.func,
    draggable: React.PropTypes.bool,
    error: React.PropTypes.bool
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
    var service = this.props.service;
    var div = document.createElement("div");
    ReactDOM.render(<DragFromLib scale={view ? view.zoom_scale : 1} text={service.name}/>, div);

    $(div).css("z-index", 1000);

    // binding information
    $(div).data("hope-spec-id", service.spec);
    $(div).data("hope-spec-binding-service-id", service.id);
    $(div).data("hope-spec-binding-thing-id", service.$thing.id);
    $(div).data("hope-spec-binding-hub-id", service.$thing.$hub.id);
    return div;
  }


  componentDidMount() {
    if (this.props.draggable) {
      $(ReactDOM.findDOMNode(this)).draggable({
        cursor: "move",
        cursorAt: {top: 0, left: 0},
        helper: this._create_drag_object.bind(this)     // this isn't auto bound
      });
    } 
  }

  _on_click_edit() {
    var service = this.props.service;
    this.refs.overlay.toggle();
    Dialog.show_create_dialog(__("Edit Service"), this._on_save_service, __("Save"), service.name, service.description);
  }

  _on_delete() {
    this.refs.overlay.toggle();
    $hope.confirm(__("Delete from Server"),
      __("This would delete the service on the server. Please make sure this is what you expect!"),
      "warning", () => {
      var service = this.props.service;
      $hope.trigger_action("hub/remove/service", {
        ids: [service.id]
      });
    });
  }

  _on_save_service(data) {
    var service = this.props.service;
    var name = data.name.trim();
    if (!name) {
      return $hope.notify("error", __("Invalid service name"));
    }
    var req = {};
    if (service.name !== name) {
      service.name = req.name = name;
    }
    if (service.description !== data.description) {
      service.description = req.description = data.description;
    }
    if (_.isEmpty(req)) {
      return;
    }
    req.id = service.id;
    $hope.trigger_action("hub/update/service", {
      service: req
    });
    this.forceUpdate();
  }

  render() {
    var service = this.props.service;
    var is_builtin = service.$thing.is_builtin;
    var icon = service.$icon();

    var popover =
      <Popover id="PO-svc-menu">
        <MenuItem onSelect={this._on_click_edit}>{__("Edit")}</MenuItem>
        <MenuItem onSelect={this._on_delete}>{__("Delete")}</MenuItem>
      </Popover>;

    var tooltip =
      <Popover id="PO-svc-desc" title={service.$name()}>
        {service.description}
      </Popover>;

    return (
      <Row className={class_name("hope-panel-lib-view-third-level", 
            "graph-accept", {"error": this.props.error })}
          onClick={this._on_click}
          onDoubleClick={this._on_double_click}>
        <Col xs={2}/>
        <Col className="text-center" xs={1}>
          <i className={"fa fa-" + (icon ? icon : "cog")}/>
        </Col>
        <Overlay overlay={tooltip}>
          <Col xs={7}>
            {service.$name() || "__unknown__"}
          </Col>
        </Overlay>
        {!is_builtin &&
          <Col className="text-center" xs={1}>
            <Link to={`/composer/${encodeURIComponent(service.id)}`}>
              <i className="fa fa-code" />
            </Link>
          </Col>
        }
        {!is_builtin &&
          <Col className="text-center" xs={1}
            onClick={e => e.stopPropagation()}>
            <Overlay ref="overlay" trigger="click" overlay={popover}>
              <i className="hope-panel-lib-menu fa fa-bars" />
            </Overlay>
          </Col>
        }
      </Row>
    );
  }
}

