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
import {ExpandSign} from "../tree.x";
import Dialog from "../dialog.x";
import Overlay from "../../overlay.x";


export default class Thing extends ReactComponent {
  static propTypes = {
    thing: React.PropTypes.object.isRequired
  };

  _on_click_edit() {
    var thing = this.props.thing;
    this.refs.overlay.hide();
    Dialog.show_create_dialog(__("Edit Thing"), this._on_save_thing, __("Save"), thing.name, thing.description);
  }

  _on_save_thing(data) {
    var thing = this.props.thing;
    var name = data.name.trim();
    if (!name) {
      return $hope.notify("error", __("Invalid thing name"));
    }
    var req = {};
    if (thing.obj.name !== name) {
      thing.obj.name = req.name = name;
    }
    if (thing.obj.description !== data.description) {
      thing.obj.description = req.description = data.description;
    }
    if (_.isEmpty(req)) {
      return;
    }
    req.id = thing.obj.id;
    $hope.trigger_action("hub/update/thing", {
      thing: req
    });
    this.forceUpdate();
  }

  _on_delete() {
    this.refs.overlay.hide();
    $hope.confirm(__("Delete from Server"),
      __("This would delete the thing on the server. Please make sure this is what you expect!"),
      "warning", () => {
      var thing = this.props.thing;
      $hope.trigger_action("hub/remove/thing", {
        ids: [thing.obj.id]
      });
    });
  }

  _on_click_add() {
    this.refs.overlay.hide();
    Dialog.show_create_dialog(__("Create Service"), this._on_create_service);
  }

  _on_create_service(data) {
    var thing = this.props.thing;
    var name = data && data.name && data.name.trim();
    if (!name) {
      return $hope.notify("error", __("Invalid service name"));
    }
    if (_.find(thing.obj.services, "name", name)) {
      return $hope.notify("error", __("This name already exists in the thing"));
    }

    $hope.trigger_action("hub/create/service", {
      thing_id: thing.obj.id,
      name: name,
      description: data.description
    });
  }

  render() {
    var thing = this.props.thing;
    var popover =
      <Popover id="PO-thing-menu">
        <MenuItem onSelect={this._on_click_edit}>{__("Edit")}</MenuItem>
        <MenuItem onSelect={this._on_delete}>{__("Delete")}</MenuItem>
        <MenuItem onSelect={this._on_click_add}>{__("Add Service")}</MenuItem>
      </Popover>;

    return (
      <Row className="hope-panel-lib-view-second-level">
        <Col xs={1}/>
        <Col className="text-center" xs={1}><ExpandSign/></Col>
        <Col xs={9}>{thing.name}</Col>
        <Col xs={1} className="text-center"
            onClick={e => e.stopPropagation()}>
          {!thing.obj.is_builtin &&
            <Overlay ref="overlay" trigger="click" overlay={popover}>
              <i className="hope-panel-lib-menu fa fa-bars" />
            </Overlay>
          }
        </Col>
      </Row>
    );
  }
}

