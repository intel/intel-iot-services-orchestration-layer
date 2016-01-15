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
import Graph from "./graph.x";
import LeftToolbar from "./left_toolbar.x";
import FileTabs from "./file_tabs.x";
import PanelLibrary from "./panel_library.x";
import PanelNavigator from "./panel_navigator.x";
import PanelInspector from "./panel_inspector.x";
import ColorPalette from "./color_palette.x";
import Halogen from "halogen";

import {Row, Col} from "react-bootstrap";
import {Lifecycle} from "react-router";

export default React.createClass({

  propTypes: {
    id: React.PropTypes.number
  },

  mixins: [ Lifecycle ],

  routerWillLeave(nextLocation) {
    if (_.startsWith(nextLocation.pathname, "/ide/")) {
      return;
    }

    var view = $hope.app.stores.graph.active_view;
    var app = view ? view.get_app() : null;
    var modified = false;
    _.forEach($hope.app.stores.graph.views, v => {
      if (v.get_app() === app) {
        modified |= v.modified;
      }
    });
    if (modified) {
      return __("Your edit is NOT saved! Are you READLLY want to leave?");
    }
    if (!_.startsWith(nextLocation.pathname, "/ide/") &&
        !_.startsWith(nextLocation.pathname, "/ui_ide/")) {
      $hope.app.stores.app.active_app(null);
    }
  },

  _on_graph_event(e) {
    $hope.log("event", "_on_graph_event", e);
    $hope.log("forceUpdate", "IDE");

    var view = $hope.app.stores.graph.active_view;
    switch(e.event) {
      case "started":
        view.set_running();
        $hope.notify("success", __("Workflow successfully started!"));
        break;

      case "stoped":
        if (view.is_running()) {
          $hope.confirm(__("Replay"),
            __("Workflow successfully stoped! Do you want replay slowly?"),
            "warning", (res) => {
              if (!res) {
                view.set_debugging();
                $hope.trigger_action("graph/replay", {graph_id: view.id});
              }
              else {
                view.set_editing();
              }
              this.forceUpdate();
          }, {
            confirmButtonText: __("No"),    // swap the meaning of buttons
            cancelButtonText: __("Yes")
          });
        }
        else {
          view.stop_auto_replay();
          view.unselect_all();
          view.set_editing();
        }
        break;

      case "trace/loaded":
        view.update_animation();
        break;

      case "animated":
        break;

      case "saved":
        $hope.notify("success", __("Workflow successfully saved!"));
        break;

      case "removed":
      case "set_active":
        if (view) {
          $hope.app.stores.app.active_app(a => {
            if (view.info_for_new && view.info_for_new.app_id === a.id) {
              return true;
            }
            return _.find(a.graphs, "id", view.id);
          });
        }
        break;

      case "status/changed":
        this.refs.file_tabs.forceUpdate();
        return;
    }
    this.forceUpdate();
  },

  _on_ide_event(e) {
    $hope.log("event", "_on_ide_event", e);
    switch(e.event) {
      case "changed/theme":
        document.body.className = $hope.app.stores.ide.theme;
        break;
      case "update/toolbar":
        $hope.log("forceUpdate", "IDE - left_tool_bar");
        this.refs.left_tool_bar.forceUpdate();
        break;
      case "update/inspector":
        $hope.log("forceUpdate", "IDE - inspector");
        this.refs.inspector.forceUpdate();
        break;
      case "update/navigator":
        this.refs.navigator.redraw();
        break;
      default:
        $hope.log("forceUpdate", "IDE");
        this.forceUpdate();
    }
  },

  _on_spec_event(e) {
    $hope.log("event", "_on_spec_event", e);
    $hope.log("forceUpdate", "IDE");
    this.forceUpdate();
  },

  _on_hub_event(e) {
    $hope.log("event", "_on_hub_event", e);
    $hope.log("forceUpdate", "IDE");
    this.forceUpdate();
  },

  _on_library_event(e) {
    $hope.log("event", "_on_library_event", e);
    $hope.log("forceUpdate", "IDE - library");
    this.refs.library.forceUpdate();
  },

  _on_ui_event(e) {
    $hope.log("event", "_on_ui_event", e);
    switch(e.event) {
      case "loaded":
        if (e.type === "ui") {
          $hope.log("forceUpdate", "IDE - library");
          this.refs.library.forceUpdate();
        }
        break;
    }
  },

  _on_key_down(e) {
    var view = $hope.app.stores.graph.active_view;
    if (!view || !view.is_editing()) {
      return;
    }
    switch(e.keyCode) {
      case 90:      // z (will check ctrl). Use it in down so we could have ctrl + zzzzz
        if (e.ctrlKey) {
          $hope.trigger_action("graph/undo", {graph_id: view.id});
        }
        break;
      case 89:      // y (will check ctrl). Use it in down so we could have ctrl + yyyy
        if (e.ctrlKey) {
          $hope.trigger_action("graph/redo", {graph_id: view.id});
        }
        break;
      case 67:      // ^C
        if (e.ctrlKey) {
          $hope.trigger_action("graph/copy", {graph_id: view.id});
        }
        break;
      case 86:      // ^V
        if (e.ctrlKey) {
          $hope.trigger_action("graph/paste", {graph_id: view.id});
        }
        break;
    }
  },

  _on_key_up(e) {
    var view = $hope.app.stores.graph.active_view;
    if(!view || !view.is_editing()) {
      return;
    }
    switch(e.keyCode) {
      case 46:      // delete
        if (view.has_selections()) {
          $hope.trigger_action("graph/remove/selected", {graph_id: view.id});
        }
        break;
    }
  },


  _on_resize() {
    $hope.app.stores.ide.layout();
    $hope.log("forceUpdate", "IDE");
    this.forceUpdate();
  },

  _need_switch_current_view() {
    // we might need to switch the IDE to the graph required
    var id = this.props.params.id;
    var graph_store = $hope.app.stores.graph;
    return id && (!graph_store.active_view || 
      graph_store.active_view.id !== id); 
  },

  componentWillMount() {
    this.componentWillReceiveProps(this.props);
    $hope.app.stores.ide.layout();
  },

  componentWillReceiveProps(nextProps) {
    var id = nextProps.params.id;
    $hope.check(id, "IDE - No id passed in");
    $hope.trigger_action("graph/set_active", {
      graph_id: id
    });
  },

  componentDidMount() {
    document.body.className = $hope.app.stores.ide.theme;

    $hope.app.stores.graph.on("graph", this._on_graph_event); 
    $hope.app.stores.ide.on("ide", this._on_ide_event);
    $hope.app.stores.spec.on("spec", this._on_spec_event);
    $hope.app.stores.hub.on("hub", this._on_hub_event);
    $hope.app.stores.library.on("library", this._on_library_event);
    $hope.app.stores.ui.on("ui", this._on_ui_event);

    document.addEventListener("keydown", this._on_key_down);
    document.addEventListener("keyup", this._on_key_up);

    window.addEventListener("resize", this._on_resize);
  },

  componentWillUnmount() {
    $hope.app.stores.graph.removeListener("graph", this._on_graph_event);      
    $hope.app.stores.ide.removeListener("ide", this._on_ide_event);
    $hope.app.stores.spec.removeListener("spec", this._on_spec_event);
    $hope.app.stores.hub.removeListener("hub", this._on_hub_event);
    $hope.app.stores.library.removeListener("library", this._on_library_event);
    $hope.app.stores.ui.removeListener("ui", this._on_ui_event);

    document.removeEventListener("keydown", this._on_key_down);
    document.removeEventListener("keyup", this._on_key_up);

    window.removeEventListener("resize", this._on_resize);
  },



  render() {
    var graph;
    var ide_store = $hope.app.stores.ide;
    var view = $hope.app.stores.graph.active_view;
    var app = view ? view.get_app() : null;

    // we only show the active view
    if (view && !this._need_switch_current_view()) {
      graph = <Graph key={view.id} view={view} 
        ref="graph"
        width={ide_store.graph_svg.width} 
        height={ide_store.graph_svg.height} />;
    } else { 
      var reason = $hope.app.stores.graph.no_active_reason;
      var reason_content;
      if (reason === "loading") {
        reason_content = <div><Halogen.DotLoader/><br/>{__("Loading") + " ..."}</div>;
      } else {
        reason_content = <div>{__("Failed to load due to ") + reason}</div>;
      }
      graph = <div 
        className="hope-graph-background"
        style={{
          width: ide_store.graph_svg.width,
          height: ide_store.graph_svg.height,
          position: "relative"
        }}>
        <div style={{
          position: "absolute",
          left: (ide_store.graph_svg.width) / 2 - ide_store.panel.library.width,
          top: (ide_store.graph_svg.height) / 2 - 5,
          color: "#aaa"
        }}> {reason_content}
        </div>
      </div>;
    }

    $hope.log("render", "IDE");
    return (
      <Row>
        <Col xs={1} style={{
          width: ide_store.left_toolbar.width,
          height: ide_store.left_toolbar.height
        }}>
          <LeftToolbar ref="left_tool_bar" />
        </Col>
        <Col xs={1} style={{
          width: ide_store.panel.library.width,
          height: ide_store.panel.library.height
        }}>
          <PanelLibrary ref="library" />
        </Col>
        <Col xs={10} style={{
          width: ide_store.graph_svg.width
        }}>
          <Row style={{
            height: ide_store.file_tabs.height
          }}>
            <FileTabs ref="file_tabs" app={app}
                width={ide_store.file_tabs.width} />
          </Row>
          <Row style={{
            width: ide_store.graph_svg.width,
            height: ide_store.graph_svg.height
          }}>
            {graph}
          </Row>
        </Col>
        <PanelNavigator ref="navigator" />
        <PanelInspector ref="inspector" />
        <ColorPalette />   
      </Row>
    );
  }
});

