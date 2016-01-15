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
import Panel from "./panel.x";
import GraphDetails from "./panel_inspector/graph_details.x";
import NodeDetails from "./panel_inspector/node_details.x";
import EdgeDetails from "./panel_inspector/edge_details.x";

export default class PanelInspector extends ReactComponent {

  _on_click_min(e) {
    var inspector = $hope.app.stores.ide.panel.inspector;
    inspector.visible = !inspector.visible;
    this.forceUpdate();
    e.stopPropagation();
  }

  render() {
    var inspector = $hope.app.stores.ide.panel.inspector;
    var view = $hope.app.stores.graph.active_view;
    if (!view) {
      return null;
    }

    var nodes = _.keys(view.selected_nodes);
    var edges = _.keys(view.selected_edges);
    if (nodes.length > 1 || edges.length > 1 || (nodes.length === 1 && edges.length === 1)) {
      return null;
    }

    var minbtn = <i onClick={this._on_click_min}
      className={"hope-panel-icon-min fa fa-" + (inspector.visible ? "minus-square-o" : "plus-square-o")} />;

    var body;
    if (nodes.length === 1) {
      body = <NodeDetails id={view.selected_nodes[nodes[0]].id} />;
    }
    else if (edges.length === 1) {
      body = <EdgeDetails id={view.selected_edges[edges[0]].id} />;
    }
    else {
      body = <GraphDetails />;
    }
    return (
      <Panel icon="info" id="inspector" title={__("Inspector")}
            left={inspector.left}
            top={inspector.top}
            width={inspector.width}
            visible={inspector.visible}
            buttons={minbtn} >
        {body}
      </Panel>
    );
  }
}
