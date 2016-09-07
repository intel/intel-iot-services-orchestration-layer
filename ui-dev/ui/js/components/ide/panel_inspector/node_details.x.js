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
import {Row, Col, Button} from "react-bootstrap";
import InputDetails from "./input_details.x";
import ConfigDetails from "./config_details.x";
import TagsDetails from "./tags_details.x";
import BindingDetails from "./binding_details.x";
import Overlay from "../../common/overlay.x";
import Dialog from "../../common/dialog.x";
import Frame from "../../common/frame.x";

export default class NodeDetails extends ReactComponent {

  static propTypes = {
    id: React.PropTypes.string.isRequired
  };

  _change_node(view) {
    this.forceUpdate();
    $hope.trigger_action("graph/change/node", {graph_id: view.id, id: this.props.id}, {});
  }

  _on_click_icon() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var styles = node.$get_styles() || {};

    Dialog.show_iconpicker_dialog(__("Change the icon of node"), icon => {
      if (_.startsWith(icon, "fa-")) {
        node.$merge_styles({
          icon: icon.substr(3)
        });
      }
      else {
        delete styles.icon;
        node.$set_styles(styles);
      }
      this._change_node(view);
    },
    styles.icon || node.icon);
  }

  _on_xxx_change(field, e) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);

    node[field] = e.target.value;
    this._change_node(view);
  }

  _on_open_cfg_dlg() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var spec = node.$get_spec();

    if (spec.nr) {
      var nr_dlg = require("../nodered_dlg.x");
      nr_dlg.show_config_dlg(node);
    }

    if (spec.$config_ui) {
      var nc_dlg = require("../nodecfg_dlg.x");
      nc_dlg.show(node);
    }

  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var spec = node.$get_spec();
    var binding = node.$get_binding();
    var name = node.name;
    var desc = node.description;
    var styles = node.$get_styles() || {};

    var hub_manager = $hope.app.stores.hub.manager;
    if (binding && binding.service) {
      var service = hub_manager.get_service(binding.service);
      if (service) {
        if (!name && service.name) {  // pri 1: node name, pri 2: service name, pri 3: spec name
          name = service.$name();
        }
        if (service.description && (!desc || desc === spec.description)) {
          desc = service.$description();
        }
      }
    }
    if (!name) {
      name = spec.name || __("__unknown__");
    }

    var trace_time, trace_data;
    if (view.is_debugging() && ("$lastdat" in node) && view.is_selected("node", node.id)) {
      var v = node.$lastdat;
      var date = new Date(node.$lasttim);
      trace_time = date.toLocaleTimeString();
      trace_data = $hope.to_string(v);
    }

    var frames = [];
    if (view.is_editing()) {
      frames.push(
        <Frame key="i" title={__("Input")} expanded={true}>
          <InputDetails id={this.props.id} />
        </Frame>);

      if (!node.is_ui && !spec.nr && !spec.$config_ui && _.isArray(spec.config) && spec.config.length > 0) {
        frames.push(
          <Frame key="c" title={__("Config")} expanded={true}>
            <ConfigDetails id={this.props.id} />
          </Frame>);

          /*<Frame key="t" title={__("Tag")}>
            <div className="node-details">
              <div className="node-details-tag">
                <TagsDetails id={this.props.id} />
              </div>
            </div>
          </Frame>
          <Frame key="b" title={__("Binding")}>
            <div className="node-details">
              <div className="node-details-binding">
                <BindingDetails id={this.props.id} />
              </div>
            </div>
          </Frame>*/
      }

      if (spec.nr || spec.$config_ui) {
        frames.push(<Frame key="c" title={__("Config")} expanded={true}>
            <div style={{height: 50, color: "#eee", padding: "12px"}}>
              {__("Double click the node to open configuration dialog, or")}
            </div>
            <div className="text-center">
              <Button bsStyle="primary"
                onClick={this._on_open_cfg_dlg}>{__("Click Here")}</Button>
            </div>
          </Frame>);
        if (spec.nr) {
          desc = "Node-RED Service";
        }
      }
    }

    return (
      <div style={{height: this.props.height + "px", overflowY: "auto"}}>
        <Row className="hope-inspector-header" >
          <Col xs={2}>
            <Overlay placement="left" overlay={__("Click to select an icon")}>
              <div onClick={this._on_click_icon} className={"hope-inspector-icon" + $hope.color(styles.color, "fill")}>
                { view.get_node_icon(node) }
              </div>
            </Overlay>
          </Col>
          <Col xs={10}>
            <input className="hope-inspector-detail-name"
                value={name}
                type="text"
                readOnly={!view.is_editing()}
                onChange={this._on_xxx_change.bind(this, "name")} />
            <textarea className="hope-inspector-detail-desc"
                value={desc}
                type="text"
                readOnly={!view.is_editing() || !!spec.nr}
                onChange={this._on_xxx_change.bind(this, "description")} />
          </Col>
        </Row>

      {frames}

      {view.is_debugging() && trace_time &&
        <div>
          <div className="hope-inspector-time">{ trace_time }</div>
          <pre className="hope-inspector-data">{ trace_data }</pre>
        </div>
      }
      </div>
    );
  }
}
