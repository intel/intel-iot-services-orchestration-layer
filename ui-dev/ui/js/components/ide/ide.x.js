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
import PanelLibrary from "./panel_library.x";
import PanelNavigator from "./panel_navigator.x";
import PanelInspector from "./panel_inspector.x";
import PanelDebugger from "./panel_debugger.x";
import ColorPalette from "./color_palette.x";
import Breadcrumb from "../common/breadcrumb.x";
import DotLoader from "halogen/DotLoader";
import {Row, Col} from "react-bootstrap";

function toggle(what) {
  $hope.trigger_action("ide/toggle/sidebar", {button: what});
  if (what === "info") {
    setTimeout(() => $hope.app.stores.ide.update_navigator(), 100);
  }
}

export default React.createClass({

  propTypes: {
    id: React.PropTypes.number
  },

  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  routerWillLeave(nextLocation) {
    var view = $hope.app.stores.graph.active_view;
    if (view && view.modified) {
      return __("Your edit is NOT saved! Are you READLLY want to leave?");
    }
    if (nextLocation &&
        !_.startsWith(nextLocation.pathname, "/ide/") &&
        !_.startsWith(nextLocation.pathname, "/ui_ide/")) {
      $hope.app.stores.app.active_app(null);
    }
  },

  getInitialState() {
    return {
      nav_height: 200
    };
  },

  _on_graph_event(e) {
    $hope.log("event", "_on_graph_event", e);
    $hope.log("forceUpdate", "IDE");

    var view = $hope.app.stores.graph.active_view;
    switch(e.event) {
      case "started":
        $hope.notify("success", __("Workflow successfully started!"));
        break;

      case "stoped":
        $hope.notify("success", __("Workflow successfully stoped!"));
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
            return _.find(a.graphs, ["id", view.id]);
          });
        }
        break;

      case "status/changed":
        if (view && this.$modified !== view.modified) {
          this.$modified = view.modified;
          this.forceUpdate();
        }
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
        if (this.refs.inspector) {
          this.refs.inspector.forceUpdate();
        }
        if (this.refs.debug) {
          this.refs.debug.forceUpdate();
        }
        break;
      case "update/navigator":
        if (this.refs.navigator) {
          this.refs.navigator.redraw();
        }
        break;
      case "resize/sidebar":
        $(this.refs.vsplitter).draggable("option", { disabled: !$hope.app.stores.ide.side_bar.current});
        this.forceUpdate();
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
    if (this.refs.library) {
      this.refs.library.forceUpdate();
    }
  },

  _on_ui_event(e) {
    $hope.log("event", "_on_ui_event", e);
    switch(e.event) {
      case "loaded":
        if (e.type === "ui") {
          $hope.log("forceUpdate", "IDE - library");
          if (this.refs.library) {
            this.refs.library.forceUpdate();
          }
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

    $(this.refs.vsplitter).draggable("destroy");
    this._bind_splitter_events();

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
    this.$modified = null;
    if (!$hope.app.stores.app.get_app(id)) {
      $hope.trigger_action("graph/set_active", {
        graph_id: id
      });
    }
    else {
      $hope.app.stores.app.active_app(a => a.id === id);
    }
  },

  _bind_splitter_events() {
    var start, w = window.innerWidth, h = window.innerHeight;
    var vsp = $(this.refs.vsplitter);
    vsp.draggable({
      axis: "x",
      scroll: false,
      containment: [w/2, 0, w - 35/*sidebar-tabs*/, h],
      start:function(event,ui) {
        start = ui.position.left;
      },
      drag: function(event,ui) {
        vsp.css("right", ui.position.left);
      },
      stop:function(event,ui) {
        var d = (ui.position.left - start) | 0;
        vsp.css("left", "");  /* keep me */
        if (d >= 1 || d <= -1) {
          $hope.app.stores.ide.resize_sidebar(d);
        }
      }
    });
  },

  _on_expand_nav(expanded) {
    this.setState({
      nav_height: expanded ? 200 : 20
    });
  },

  _on_toggle_lib() {
    $hope.app.stores.ide.toggle_library();
  },

  _on_toggle_sidebar() {
    var sidebar = $hope.app.stores.ide.side_bar;
    $hope.trigger_action("ide/toggle/sidebar", {
      button: sidebar.current ? sidebar.current : (sidebar.previous || "info")
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

    this._bind_splitter_events();

    this.context.router.setRouteLeaveHook(this.props.route, this.routerWillLeave);
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

    $(this.refs.vsplitter).draggable("destroy");
  },



  render() {
    var graph;
    var ide_store = $hope.app.stores.ide;
    var view = $hope.app.stores.graph.active_view;
    var app = view ? view.get_app() : $hope.app.stores.app.get_app(this.props.params.id);

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
        reason_content = <div><DotLoader/><br/>{__("Loading") + " ..."}</div>;
      } else if (app && app.graphs.length === 0) {
        reason_content = <div>{__("No workflow found")}</div>;
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
          left: (ide_store.graph_svg.width) / 2,
          top: (ide_store.graph_svg.height) / 2 - 5,
          color: "#aaa"
        }}> {reason_content}
        </div>
      </div>;
    }

    var path = [];
    if (app) {
      path.push(app.name);

      if (view) {
        path.push({name: view.graph.name, modified: view.modified});
      }
    }

    var is_info = ide_store.side_bar.current === "info";
    var is_dbg = ide_store.side_bar.current === "dbg";

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
          {ide_store.panel.library.visible && <PanelLibrary ref="library" />}
        </Col>
        <Col xs={8} style={{
          width: ide_store.graph_svg.width
        }}>
          <Row style={{
            height: ide_store.breadcrumb.height
          }}>
            <Breadcrumb path={path} />
          </Row>
          <Row style={{
            width: ide_store.graph_svg.width,
            height: ide_store.graph_svg.height
          }}>
            {graph}
          </Row>
        </Col>
        <Col xs={1} className="hope-sidebar" style={{
          width: ide_store.side_bar.width,
          height: ide_store.side_bar.height
        }}>
          {is_info && [
            <PanelInspector key="i" ref="inspector" height={ide_store.side_bar.height - this.state.nav_height} />,
            <PanelNavigator key="n" ref="navigator" onExpand={this._on_expand_nav} />
          ]}
          {is_dbg && <PanelDebugger ref="debug" view={view} />}
        </Col>
        <Col xs={1} className="hope-sidebar-tabs" style={{
          height: ide_store.side_bar.height
        }}>
          <div className={"hope-sidebar-button" + (is_info ? " active" : "")}
              onClick={toggle.bind(this, "info")}>{__("General")}</div>
          <div className={"hope-sidebar-button" + (is_dbg ? " active" : "")}
              onClick={toggle.bind(this, "dbg")}>{__("Debug")}</div>
        </Col>

        <div ref="vsplitter"
          className={"splitter vertical" + (ide_store.side_bar.current ? " w-resize" : "")}
          style={{
          top: ide_store.side_bar.top,
          right: ide_store.side_bar.width + 35/*sidebar-tabs*/
        }}/>

        <div className="toggle-bar left"
          onClick={this._on_toggle_lib}
          style={{
          top: ide_store.graph_svg.top + ide_store.graph_svg.height/2 - 20,
          left: ide_store.graph_svg.left
        }}>
          <i className="fa fa-ellipsis-v" />
        </div>

        <div className="toggle-bar right"
          onClick={this._on_toggle_sidebar}
          style={{
          top: ide_store.graph_svg.top + ide_store.graph_svg.height/2 - 20,
          right: ide_store.side_bar.width + 2 + 35/*sidebar-tabs*/
        }}>
          <i className="fa fa-ellipsis-v" />
        </div>

        <ColorPalette />
      </Row>
    );
  }
});

