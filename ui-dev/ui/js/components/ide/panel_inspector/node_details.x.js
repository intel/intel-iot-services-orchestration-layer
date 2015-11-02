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
import {Tabs, Tab} from "../tabs.x";
import InputDetails from "./input_details.x";
import TagsDetails from "./tags_details.x";
import BindingDetails from "./binding_details.x";
import Dialog from "../dialog.x";

export default class NodeDetails extends ReactComponent {

  static propTypes = {
    id: React.PropTypes.string.isRequired
  };

  _on_click_icon() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var styles = node.$get_styles() || {};

    Dialog.show_iconpicker_dialog("Change the icon of node", icon => {
      if (_.startsWith(icon, "fa-")) {
        node.$merge_styles({
          icon: icon.substr(3)
        });
      }
      else {
        delete styles.icon;
        node.$set_styles(styles);
      }
      this.forceUpdate();
      view.change("node", this.props.id, null);
    },
    styles.icon || node.icon);
  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var binding = node.$get_binding();
    var name = node.name;
    var desc = node.description;
    var styles = node.$get_styles() || {};

    var hub_manager = $hope.app.stores.hub.manager;
    if (binding && binding.service) {
      var service = hub_manager.get_service(binding.service);
      if (service) {
        if (service.name) {
          name = service.name;
        }
        if (service.description) {
          desc = service.description;
        }
      }
    }

    return (
      <div>
        <div className="hope-inspector-header" >
          <div onClick={this._on_click_icon} className={"hope-inspector-icon" + $hope.color(styles.color, "fill")}>
            { view.get_node_icon(node) }
          </div>
          <div className="hope-inspector-detail">
            <div className="hope-inspector-detail-name">
              { name }
            </div>
            <div className="hope-inspector-detail-desc">
              { desc }
            </div>
          </div>
        </div>
        {view.is_editing() &&
        <Tabs>
          <Tab title="Input">
            <div className="node-details" >
              <InputDetails id={this.props.id} />
            </div>
          </Tab>
          <Tab title="Tag">
            <div className="node-details">
              <div className="node-details-tag">
                <TagsDetails id={this.props.id} />
              </div>
            </div>
          </Tab>
          <Tab title="Binding">
            <div className="node-details">
              <div className="node-details-binding">
                <BindingDetails id={this.props.id} />
              </div>
            </div>
          </Tab>
        </Tabs>
      }
      </div>
    );
  }
}
