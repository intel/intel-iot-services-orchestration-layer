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
import class_names from "classnames";
import {ExpandSign} from "../../common/tree.x";
import Dialog from "../../common/dialog.x";
import Overlay from "../../common/overlay.x";


export default class Hub extends ReactComponent {
  static propTypes = {
    hub: React.PropTypes.object.isRequired
  };

  _on_color_selected(i) {
    $hope.trigger_action("hub/change/color", {
      hub_id: this.props.hub.id,
      color_id: i
    });
  }

  _on_click_color_palette(e) {
    e.stopPropagation();
    var rect = this.refs.color.getBoundingClientRect();
    $hope.trigger_action("ide/show/palette", {
      x: rect.left + rect.width + 10,
      y: rect.top,
      onSelect: this._on_color_selected
    });
  }

  _on_click_add_thing() {
    this.refs.overlay.hide();
    Dialog.show_create_dialog(__("Create Thing"), this._on_create_thing);
  }

  _on_create_thing(data) {
    var hub = this.props.hub;
    var name = data && data.name && data.name.trim();
    if (!name) {
      return $hope.notify("error", __("Invalid thing name"));
    }
    if (_.find(hub.things, ["name", name])) {
      return $hope.notify("error", __("This name already exists in the hub"));
    }
    $hope.trigger_action("hub/create/thing", {
      hub_id: hub.id,
      name: name,
      description: data.description
    });
  }

  render() {
    var hub = this.props.hub;
    var popover =
      <Popover id="PO-addthing">
        <MenuItem onSelect={this._on_click_add_thing}>{__("Add Thing")}</MenuItem>
      </Popover>;

    return (
      <Row className="hope-panel-lib-view-first-level">
        <Col className="text-center" xs={1}><ExpandSign/></Col>
        <Col xs={9}>{hub.name}</Col>
        <Col xs={1} className="text-center">
          <i ref="color"
            className={class_names("fa fa-circle", 
            $hope.color(hub.$color_id, "color", "hover"))} 
            onClick={this._on_click_color_palette} />
        </Col>
        <Col xs={1} className="text-center"
            onClick={e => e.stopPropagation()}>
          { hub.type !== "builtin" &&
            <Overlay ref="overlay" trigger="click" overlay={popover}>
              <i className="hope-panel-lib-menu fa fa-bars" />
            </Overlay>
          }
        </Col>
      </Row>
    );
  }
}

