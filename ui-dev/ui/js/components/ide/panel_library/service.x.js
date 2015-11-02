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
import {Row, Col, OverlayTrigger, Popover, MenuItem, ModalTrigger} from "react-bootstrap";
import {Link} from "react-router";
import DragFromLib from "./drag_from_lib.x";
import class_name from "classnames";
import DlgEdit from "../dlg_edit.x";


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
    React.render(<DragFromLib scale={view ? view.zoom_scale : 1} text={service.name}/>, div);

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
      $(React.findDOMNode(this)).draggable({
        cursor: "move",
        cursorAt: {top: 0, left: 0},
        helper: this._create_drag_object.bind(this)     // this isn't auto bound
      });
    } 
  }

  _on_click_edit() {
    this.refs.overlay.toggle();
    this.refs.dlg_edit.show();
  }

  _on_delete() {
    this.refs.overlay.toggle();
    $hope.confirm("Delete from Server", 
      "This would delete the service on the server. Please make sure this is what you expect!",
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
      return $hope.notify("error", "Invalid service name");
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
      <Popover>
        <MenuItem onSelect={this._on_click_edit}>Edit</MenuItem>
        <MenuItem onSelect={this._on_delete}>Delete</MenuItem>
      </Popover>;

    var tooltip =
      <Popover title={service.$name()}>
        {service.description}
      </Popover>;

    return (
      <Row className={class_name("hope-panel-lib-view-third-level", 
        "graph-accept", {"error": this.props.error })}
      onClick={this._on_click} onDoubleClick={this._on_double_click}>
        <Col xs={2}/>
        <Col className="text-center" xs={1}>
          <i className={"fa fa-" + (icon ? icon : "cog")}/>
        </Col>
        <OverlayTrigger trigger="hover" rootClose overlay={tooltip}>
          <Col xs={7}>
            {service.$name() || "__unknown__"}
          </Col>
        </OverlayTrigger>
        {!is_builtin &&
          <Col className="text-center" xs={1}>
            <Link to="composer" params={{id: encodeURIComponent(service.id)}}>
              <i className="fa fa-code" />
            </Link>
          </Col>
        }
        {!is_builtin &&
          <Col className="text-center" xs={1}
            onClick={e => e.stopPropagation()}>
            <OverlayTrigger ref="overlay" trigger="click" rootClose overlay={popover}>
              <i className="hope-panel-lib-menu fa fa-bars" />
            </OverlayTrigger>
          </Col>
        }

        <ModalTrigger ref="dlg_edit"
          modal={<DlgEdit title="Edit Service" name={service.name} description={service.description} onSave={this._on_save_service}/>}>
          <i />
        </ModalTrigger>
      </Row>
    );
  }
}

