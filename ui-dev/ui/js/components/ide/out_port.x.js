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
export default class OutPort extends ReactComponent {

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
      type: "out"
    });
  }

  render() {
    var name = this.props.name;
    var view = this.props.view;
    var node = view.get("node", this.props.id);
    var port = node.out.$port(name);
    var t = view.get_outport_position(port);
    var r = $hope.config.graph.port_radius;
    var color = null;
    var circle = null;

    var styles = node.$get_styles();
    var ops = styles && styles.out_ports;
    if (ops && ops[name] && ("color" in ops[name])) {
      color = ops[name].color;
    }

    if (!view.selected_port || view.selected_port === port ||
        (view.selected_port_type === "in" && !view.find_edge(port, view.selected_port))) {
      var clsname = "hope-graph-port-circle";
      if (view.selected_port === port) {
        clsname += " hope-graph-blink";
      }
      circle = [
        <circle key="outer" className={clsname + $hope.color(color, "fill", "hover")} cx={t.x} cy={t.y} r={r} />,
        <circle key="inner" className={"hope-graph-inner-circle"} cx={t.x} cy={t.y} r={r / 2} />
        ];
    }

    return (
      <g onClick={this._on_click} className="hope-graph-out-port">
        <text className={"hope-graph-port-text"} x={t.x - 8} y={t.y + 3}>{name}</text>
        {circle}
      </g>
    );
  }
}
