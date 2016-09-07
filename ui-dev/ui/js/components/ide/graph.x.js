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
import Node from "./node.x";
import Edge from "./edge.x";
import EdgePreview from "./edge_preview.x";

import Color from "color";

export default class Graph extends ReactComponent {

  static propTypes = {
    view: React.PropTypes.object.isRequired,
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired
  };

  _on_graph_change(e) {
    var view = this.props.view;
    var svg_g = this.refs["master-svg-group"];
    switch(e.event) {
      // some of the graph changes don't need to re-render entire graph
      case "moved":
      case "scaled":
      case "fitted":
        svg_g.setAttribute("transform", view.get_transform_string());
        this._render_background();
        break;
      case "port_selected":
        this._start_preview_edge();
        $hope.log("forceUpdate", "Graph", view.id);
        this.forceUpdate();
        break;
      case "port_unselected":
        this._cancel_preview_edge();
        $hope.log("forceUpdate", "Graph", view.id);
        this.forceUpdate();
        break;
      default:
        $hope.log("forceUpdate", "Graph", view.id);
        this.forceUpdate();
    }
  }

  _on_node_change(e) {
    var view = this.props.view;
    var node_ref = this.refs[e.id];
    switch(e.event) {
      case "created":
      case "removed":
      case "selected":
      case "unselected":
        $hope.log("forceUpdate", "Graph", view.id);
        this.forceUpdate();
        break;
      // only update the impacted node and its edges
      default:
        $hope.check_warn(node_ref, "Graph", "moving a node but not in refs", e);
        if (node_ref) {
          var node = $hope.check_warn(this.props.view.get("node", e.id),
            "GraphComponent", "_on_node_change() didn't find the node", e);
          $hope.log("forceUpdate", "Graph - Node", e.id);
          node_ref.forceUpdate();
          // maybe we don't need to re-render all connected edges
          // but let's do so anyway
          _.forOwn(node.$get_in_edges(), _e => {
            let edge = this.refs[_e.id];
            if (edge) {
              $hope.log("forceUpdate", "Graph - Edge", _e.id);
              edge.forceUpdate();
            }
          });
          _.forOwn(node.$get_out_edges(), _e => {
            let edge = this.refs[_e.id];
            if (edge) {
              $hope.log("forceUpdate", "Graph - Edge", _e.id);
              edge.forceUpdate();
            }
          });
        }

    }
  }

  _on_edge_change(e) {
    var edge_ref = this.refs[e.id];
    switch(e.event) {
      case "created":
      case "removed":
      case "selected":
      case "unselected":
        $hope.log("forceUpdate", "Graph");
        this.forceUpdate();
        break;
      default:
        if (edge_ref) {
          $hope.log("forceUpdate", "Graph - Edge", e.id);
          edge_ref.forceUpdate();
        }
        break;
    }
  }

  _start_preview_edge() {
    this.props.view.edge_previewing = true;
    document.addEventListener("keydown", this._on_key_down);
    document.addEventListener("mousemove", this._on_render_preview_edge);
  }

  _on_key_down(e) {
    var view = this.props.view;
    switch(e.keyCode) {
      case 27:      // esc
        if (view.selected_port) {
          view.unselect_port();
        }
        break;
    }
  }

  _cancel_preview_edge() {
    var preview = this.refs["edge-preview"];
    this.props.view.edge_previewing = false;
    document.removeEventListener("keydown", this._on_key_down);
    document.removeEventListener("mousemove", this._on_render_preview_edge);
    preview.setState({sX: 0, sY: 0, tX: 0, tY: 0});
  }

  _on_render_preview_edge(event) {
    var view = this.props.view;
    var preview = this.refs["edge-preview"];
    var rect = ReactDOM.findDOMNode(this).getBoundingClientRect();
    var t = view.get_port_position(view.selected_port, view.selected_port_type);
    var x = event.clientX || 0;
    var y = event.clientY || 0;
    x = (x - rect.left - view.offset.dx) / view.zoom_scale;
    y = (y - rect.top - view.offset.dy) / view.zoom_scale;
    if (view.selected_port_type === "in") {
      t.x -= $hope.config.graph.inport_line_length;
      preview.setState({sX: x, sY: y, tX: t.x, tY: t.y});
    }
    else {
      preview.setState({sX: t.x, sY: t.y, tX: x, tY: y});
    }
  }

  _on_click(e) {
    var view = this.props.view;
    e.stopPropagation();
    $hope.trigger_action("ide/hide/palette", {});
    if (view.edge_previewing) {
      return view.unselect_port();
    }
    if (!this.is_tracking) {
      $hope.trigger_action("graph/unselect/all", {graph_id: this.props.view.id});
    }
  }


  _on_track_start(e) {
    this.is_tracking = true;
    e.stopPropagation();
    $hope.trigger_action("graph/move", {
      graph_id: this.props.view.id,
      ddx: e.ddx,
      ddy: e.ddy,
      phase: "start"
    });
  }

  _on_track(e) {
    e.stopPropagation();
    $hope.trigger_action("graph/move", {
      graph_id: this.props.view.id,
      ddx: e.ddx,
      ddy: e.ddy,
      phase: "ongoing"
    });
  }

  _on_track_end(e) {
    this.is_tracking = false;
    e.stopPropagation();
    $hope.trigger_action("graph/move", {
      graph_id: this.props.view.id,
      ddx: e.ddx,
      ddy: e.ddy,
      phase: "end"
    });
  }

  _on_wheel(e) {
    var ratio;
    if ("deltaMode" in e && "deltaY" in e) {
      // deltaMode:
      //  DOM_DELTA_PIXEL 0x00  The delta values are specified in pixels. (Chrome)
      //  DOM_DELTA_LINE  0x01  The delta values are specified in lines.  (Firefox)
      //
      var dy = e.deltaMode === 0 ? 1000 : 40;
      ratio = 1 - e.deltaY / dy;
    }
    else {
      ratio = 1 + e.wheelDelta / 1000;
    }
    $hope.trigger_action("graph/zoom", {
      graph_id: this.props.view.id,
      ratio: ratio,
      x: e.clientX,
      y: e.clientY
    });
  }


  _render_background() {
    var canvas = this.refs["background-canvas"];
    var c = canvas.getContext("2d");
    var scale = this.props.view.zoom_scale;
    var width = canvas.width;
    var height = canvas.height;
    var span = Math.floor(scale * 90);

    var offset = this.props.view.offset;

    var x = offset.dx % span - 1;
    var y = offset.dy % span - 1;

    // Comment this line to go plaid
    c.clearRect(0, 0, width, height);

    // don't draw if too crowdy
    if (span < 50) {
      return;
    }


    c.lineWidth = 1;
    c.setLineDash([2, 2]);
    // background color
    // TODO very strange that we failed to get actual background color of canvas
    // so have to hard code temporarily
    //c.strokeStyle = Color(canvas.style.backgroundColor).lighten(0.5).rgbString();
    c.strokeStyle = Color("#363636").lighten(0.5).rgbString();

    // we need to draw at 0.5 bondury to ensure the width of line is 1
    // see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors#A_lineWidth_example
    for (; x < width; x += span) {
      c.beginPath();
      c.moveTo(x + 0.5, 0);
      c.lineTo(x + 0.5, height + 0.5);
      c.stroke();
    }
    for (; y < height; y += span) {
      c.beginPath();
      c.moveTo(0, y + 0.5);
      c.lineTo(width, y + 0.5);
      c.stroke();
    }

  }

  _on_drop(event, ui) {
    var view = this.props.view;
    var rect = ReactDOM.findDOMNode(this).getBoundingClientRect();
    var x = (event.x || event.clientX || 0) - rect.left;
    var y = (event.y || event.clientY || 0) - rect.top;

    var data = $(ui.helper).data();

    $hope.check(data.hopeSpecId, "Graph.x", "on_drop didn't get spec id");

    var node_to_create = {
      graph_id: view.id,
      node: {
        spec: data.hopeSpecId
      },
      styles: view.view_to_logic(x, y)
    };

    if (data.hopeSpecBindingThingId) {
      node_to_create.binding = {
        type: "fixed",
        thing: data.hopeSpecBindingThingId
      };
      if (data.hopeSpecBindingHubId) {
        node_to_create.binding.hub = data.hopeSpecBindingHubId;
      }
      if (data.hopeSpecBindingServiceId) {
        node_to_create.binding.service = data.hopeSpecBindingServiceId;
      }
      if (data.hopeWidgetId) {
        node_to_create.binding.widget = data.hopeWidgetId;
      }

    }


    $hope.trigger_action("graph/create/node", node_to_create);
  }

  // render the background again
  componentDidUpdate() {
    this._render_background();
  }

  componentDidMount() {
    this.props.view.on("node", this._on_node_change);
    this.props.view.on("edge", this._on_edge_change);
    this.props.view.on("graph", this._on_graph_change);

    var dom_node = ReactDOM.findDOMNode(this);

    PolymerGestures.addEventListener(dom_node, "trackstart", _.noop);
    PolymerGestures.addEventListener(dom_node, "track", _.noop);
    PolymerGestures.addEventListener(dom_node, "trackend", _.noop);

    dom_node.addEventListener("trackstart", this._on_track_start);
    dom_node.addEventListener("track", this._on_track);
    dom_node.addEventListener("trackend", this._on_track_end);


    if (dom_node.onwheel !== undefined) {     // Chrome and Firefox
      dom_node.addEventListener("wheel", this._on_wheel);
    } else if (dom_node.onmousewheel !== undefined) { // Safari
      dom_node.addEventListener("mousewheel", this._on_wheel);
    }

    this._render_background();

    $(dom_node).droppable({
      accept: ".graph-accept",
      drop: this._on_drop
    });
  }

  componentWillUnmount() {
    this.props.view.removeListener("node", this._on_node_change);
    this.props.view.removeListener("edge", this._on_edge_change);
    this.props.view.removeListener("graph", this._on_graph_change);


    var dom_node = ReactDOM.findDOMNode(this);
    PolymerGestures.removeEventListener(dom_node, "trackstart", _.noop);
    PolymerGestures.removeEventListener(dom_node, "track", _.noop);
    PolymerGestures.removeEventListener(dom_node, "trackend", _.noop);

    dom_node.removeEventListener("trackstart", this._on_track_start);
    dom_node.removeEventListener("track", this._on_track);
    dom_node.removeEventListener("trackend", this._on_track_end);

    if (dom_node.onwheel) {     // Chrome and Firefox
      dom_node.removeEventListener("wheel", this._on_wheel);
    } else if (dom_node.onmousewheel) { // Safari
      dom_node.removeEventListener("mousewheel", this._on_wheel);
    }

  }

  render() {
    $hope.log("render", "Graph");
    var view = this.props.view;
    var edges = [], nodes = [];

    _.forEach(view.graph.edges, e => {
      if (e.source && e.target) {
        edges.push(<Edge key={e.id} ref={e.id} view={view} id={e.id}/>);
      }
    });

    _.forEach(view.graph.nodes, n => {
      if (n.$is_visible()) {
        nodes.push(<Node key={n.id} ref={n.id} view={view} id={n.id} />);
      }
    });

    // need to draw edges first to ensure they are under nodes
    return (
      <div style={{  /* Provide relative for SVG absolute */
          position: "relative"}}>
        <canvas width={this.props.width}
                height={this.props.height}
                className="hope-graph-background"
                ref="background-canvas" />
        <svg className={view.has_selections() ? "hope-graph-darken" : "hope-graph" }
             width={this.props.width}
             height={this.props.height}
             onClick={this._on_click}>
          <g ref="master-svg-group"
             transform={view.get_transform_string()}>

            {edges}

            <EdgePreview ref="edge-preview" />

            {nodes}
          </g>
        </svg>
      </div>
    );
  }
}
