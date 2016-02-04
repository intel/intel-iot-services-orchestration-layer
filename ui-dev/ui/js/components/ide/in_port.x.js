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
export default class InPort extends ReactComponent {

  static propTypes = {
    view: React.PropTypes.object.isRequired,
    id: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired
  };

  _on_click(e) {
    e.stopPropagation();
    var view = this.props.view;
    if (!view.is_editing()) {
      return;
    }
    $hope.trigger_action("graph/select/port", {
      graph_id: this.props.view.id,
      id: this.props.id,
      name: this.props.name,
      type: "in"
    });
  }

  render() {
    var name = this.props.name;
    var view = this.props.view;
    var node = view.get("node", this.props.id);
    var port = node.in.$port(name);
    var t = view.get_inport_position(port);
    var r = $hope.config.graph.port_radius;
    var linelen = $hope.config.graph.inport_line_length;
    var color = null;
    var circle = null, inner_circle = null, defval = null;

    var styles = node.$get_styles();
    var ips = styles && styles.in_ports;
    if (ips && ips[name] && ("color" in ips[name])) {
      color = ips[name].color;
    }

    if (!view.selected_port || view.selected_port === port ||
        (view.selected_port_type === "out" && !view.find_edge(view.selected_port, port))) {
      var clsname = "hope-graph-port-circle";
      if (view.selected_port === port) {
        clsname += " hope-graph-blink";
      }
      else {
        if (!port.buffered) {
          inner_circle = <circle className={"hope-graph-inner-circle"}
            key="inner"
            cx={t.x - linelen}
            cy={t.y}
            r={r / 2} />;
        }
      }
      circle = <circle className={clsname + $hope.color(color, "fill", "hover")}
        key="outer"
        cx={t.x - linelen}
        cy={t.y}
        r={r} />;
    }

    if ("default" in port && _.isEmpty(view.find_edge(null, port))) {
      let val = String(port.default);
      if (val.length > 0) {
        var edges = view.find_edge(null, port);
        if (!edges || !edges.length) {
          defval =
            <text className="hope-graph-port-default"
                key="defval"
                x={t.x - linelen - r}
                y={t.y + 3}>
              { val }
            </text>;
        }
      }
    }

    return (
      <g onClick={this._on_click} className="hope-graph-in-port">
        <text className={"hope-graph-port-text"}
              key="name"
              x={t.x + (node.in.groups ? 10 : 5)} y={t.y + 3}>{name}</text>
        <line className={"hope-graph-in-line" + (port.no_trigger ? " hope-graph-dash" : "") + $hope.color(color, "stroke")}
              x1={t.x} y1={t.y} x2={t.x - linelen} y2={t.y} />
        { circle }
        { inner_circle }
        { defval }
      </g>
    );
  }
}
