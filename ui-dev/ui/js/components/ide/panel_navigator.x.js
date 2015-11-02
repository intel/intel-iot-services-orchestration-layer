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

export default class PanelNavigator extends ReactComponent {

  componentDidMount() {
    var dom_node = React.findDOMNode(this.refs.canvas);
    PolymerGestures.addEventListener(dom_node, "trackstart", _.noop);
    PolymerGestures.addEventListener(dom_node, "track", _.noop);
    PolymerGestures.addEventListener(dom_node, "trackend", _.noop);
    dom_node.addEventListener("trackstart", this._on_track_start);
    dom_node.addEventListener("track", this._on_track);
    dom_node.addEventListener("trackend", this._on_track_end);
    $hope.app.stores.graph.on("graph", this._on_graph_event);
  }

  componentWillUnmount() {
    var dom_node = React.findDOMNode(this.refs.canvas);
    PolymerGestures.removeEventListener(dom_node, "trackstart", _.noop);
    PolymerGestures.removeEventListener(dom_node, "track", _.noop);
    PolymerGestures.removeEventListener(dom_node, "trackend", _.noop);
    dom_node.removeEventListener("trackstart", this._on_track_start);
    dom_node.removeEventListener("track", this._on_track);
    dom_node.removeEventListener("trackend", this._on_track_end);
    $hope.app.stores.graph.removeListener("graph", this._on_graph_event);
  }

  _on_graph_event() {
    // Workaround for Chrome: font loading delayed
    setTimeout(this.redraw.bind(this), 300);
  }

  _on_track_start(e) {
    this._move(e, "start");
  }

  _on_track(e) {
    this._move(e, "ongoing");
  }

  _on_track_end(e) {
    this._move(e, "end");
  }

  _move(e, phase) {
    var view = $hope.app.stores.graph.active_view;
    e.stopPropagation();
    if (view) {
      $hope.trigger_action("graph/move", {
        graph_id: view.id,
        ddx: -e.ddx / this.scale * view.zoom_scale,
        ddy: -e.ddy / this.scale * view.zoom_scale,
        phase: phase
      });
    }
  }

  _on_click_min(e) {
    var navigator = $hope.app.stores.ide.panel.navigator;
    navigator.visible = !navigator.visible;
    this.forceUpdate();
    setTimeout(this.redraw.bind(this), 0);
    e.stopPropagation();
  }

  redraw() {
    var view = $hope.app.stores.graph.active_view;
    if (!view || !this.refs.canvas) {
      return;
    }
    var canvas = React.findDOMNode(this.refs.canvas);
    var c = canvas.getContext("2d");

    // Reset origin
    c.setTransform(1, 0, 0, 1, 0, 0);
    // Clear
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.lineWidth = 0.6;

    if (view.graph.nodes.length < 1) {
      return;
    }

    var nodesz = $hope.config.graph.node_size;
    var bound = view.get_bound_box();
    var minX = bound.left;
    var minY = bound.top;

    // Scale dimensions
    var sx = canvas.width / bound.width;
    var sy = canvas.height / bound.height;
    var scale = (sx <= sy) ? sx : sy;
    this.scale = scale;
    // Translate origin to match
    c.setTransform(1, 0, 0, 1, -minX * scale, -minY * scale);

    function roundRect(x, y, w, h, r) {
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
    }

    // Draw edges
    view.graph.edges.forEach(edge => {
      if (edge.source.$node === edge.target.$node) {
        return;
      }
      var s = edge.source.$node.$get_position();
      var t = edge.target.$node.$get_position();
      c.strokeStyle = "#1ff";
      var fromX = (s.x + nodesz.width) * scale;
      var fromY = (s.y + nodesz.height / 2) * scale;
      var toX = t.x * scale;
      var toY = (t.y + nodesz.height / 2) * scale;
      c.beginPath();
      c.moveTo(fromX, fromY);
      c.lineTo(toX, toY);
      c.stroke();
    });

    c.font = (53 * scale) + "px FontAwesome";
    c.textAlign = "center";
    c.textBaseline = "middle";

    // Draw nodes
    view.graph.nodes.forEach(node => {
      var icon = view.get_node_icon(node);
      //var styles = node.$get_styles();
      var pt = node.$get_position();

      c.strokeStyle = "white";
      c.fillStyle = "black";
      c.beginPath();
      roundRect(pt.x * scale, pt.y * scale, nodesz.width * scale, nodesz.height * scale, 5);
      c.fill();
      c.stroke();

      c.fillStyle = "white";
      c.fillText(icon, (pt.x + nodesz.width / 2) * scale, (pt.y + nodesz.height / 2) * scale);
    });

    // Scaled view rectangle
    var graph_svg = $hope.app.stores.ide.graph_svg;
    var vx = Math.round( (-view.offset.dx / view.zoom_scale - minX) * scale );
    var vy = Math.round( (-view.offset.dy / view.zoom_scale - minY) * scale );
    var vw = Math.round( graph_svg.width * scale / view.zoom_scale );
    var vh = Math.round( graph_svg.height * scale / view.zoom_scale );

    // Reset origin
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "rgba(0,0,0, 0.8)";

    // Clip to bounds
    // Left
    if (vx < 0) {
      vw = vw + vx < 5 ? 5 : vw + vx;
      vx = 0;
    } else {
      if (vx >= canvas.width) {
        vx = canvas.width - 5;
        vw = 5;
      }
      c.fillRect(0, 0, vx, canvas.height);
    }
    // Top
    if (vy < 0) { 
      vh = vh + vy < 5 ? 5 : vh + vy;
      vy = 0;
    } else {
      if (vy >= canvas.height) {
        vy = canvas.height - 5;
        vh = 5;
      }
      c.fillRect(vx, 0, vw, vy);
    }
    // Right
    if (vw > canvas.width - vx) { 
      vw = canvas.width - vx;
    } else {
      c.fillRect(vx + vw, 0, canvas.width - (vx + vw), canvas.height);
    }
    // Bottom
    if (vh > canvas.height - vy) { 
      vh = canvas.height - vy;
    } else {
      c.fillRect(vx, vy + vh, vw, canvas.height - (vy + vh));
    }

    c.strokeStyle = "white";
    c.lineWidth = 0.2;
    c.strokeRect(vx, vy, vw, vh);
  }

  render() {
    var nav = $hope.app.stores.ide.panel.navigator;

    var minbtn = <i onClick={this._on_click_min}
      className={"hope-panel-icon-min fa fa-" + (nav.visible ? "minus-square-o" : "plus-square-o")} />;

    return (
      <Panel icon="eye" id="navigator" title="Navigator"
            left={nav.left}
            top={nav.top}
            width={nav.width}
            height={nav.height}
            visible={nav.visible}
            buttons={minbtn} >
        <canvas width={(nav.width - 2) + "px"}
                height={(nav.height - 24) + "px"}
                className="hope-graph-background"
                ref="canvas" />
      </Panel>
    );
  }
}
