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
import Dialog from "../common/dialog.x";
import FONT_AWESOME from "../../lib/font-awesome.js";

export default class Node extends ReactComponent {

  static propTypes = {
    spec: React.PropTypes.object,
    onChanged: React.PropTypes.func
  };

  constructor(props) {
    super();

    this.state = this._get_states(props.spec);
  }

  componentWillReceiveProps(nextProps) {
    this.setState(this._get_states(nextProps.spec));
  }

  _get_states(spec) {
    var state = {};

    if (spec && spec.in && spec.ports) {
      _.forOwn(spec.in.ports, p => {
        state[p.name] = ("default" in p) ? String(p.default) : "";
      });
    }
    return state;
  }

  _on_click_circle(name) {
    var spec = this.props.spec;
    var port = _.find(spec.in.ports, ["name", name]);

    if (port.buffered) {
      delete port.buffered;
    }
    else {
      port.buffered = true;
      delete port.default;
    }
    this.forceUpdate();
    if (this.props.onChanged) {
      this.props.onChanged(spec);
    }
  }

  _on_click_line(name) {
    var spec = this.props.spec;
    var port = _.find(spec.in.ports, ["name", name]);

    if (port.no_trigger) {
      delete port.no_trigger;
    }
    else {
      port.no_trigger = true;
    }
    this.forceUpdate();
    if (this.props.onChanged) {
      this.props.onChanged(spec);
    }
  }

  _on_add_new(type) {
    var spec = this.props.spec;
    if (!spec[type]) {
      spec[type] = {ports: []};
    }
    else if (!spec[type].ports) {
      spec[type].ports = [];
    }
    var ports = spec[type].ports;
    var name;

    for (var i = 1; i < $hope.config.max_ports_per_side; i++) {
      name = type + i;
      if (!_.find(ports, ["name", name])) {
        break;
      }
    }
    ports.push({
      name: name,
      type: "string"
    });
    this.forceUpdate();
    if (this.props.onChanged) {
      this.props.onChanged(spec);
    }
  }

  _on_remove_port(type, name) {
    var spec = this.props.spec;
    var ports = spec[type].ports;

    _.remove(ports, p => p.name === name);
    this.forceUpdate();
    if (this.props.onChanged) {
      this.props.onChanged(spec);
    }
  }

  _on_change_defval(name, e) {
    var spec = this.props.spec;
    var port = _.find(spec.in.ports, ["name", name]);
    var val;

    this.setState({
      [name]: e.target.value
    });

    switch(port.type) {
    case "boolean":
      val = e.target.value.toLowerCase() === "true";
      break;
    case "float":
    case "double":
    case "number":
      val = parseFloat(e.target.value);
      val = isNaN(val) ? 0 : val;
      break;
    case "int":
      val = parseInt(e.target.value);
      val = isNaN(val) ? 0 : val;
      break;
    default:
      val = e.target.value;
      break;
    }
    port.default = val;

    if (this.props.onChanged) {
      this.props.onChanged(spec);
    }
  }

  _on_click_icon() {
    var spec = this.props.spec;

    Dialog.show_iconpicker_dialog(__("Change the icon of node"), icon => {
      if (_.startsWith(icon, "fa-")) {
        spec.icon = icon.substr(3);
      }
      else {
        delete spec.icon;
      }
      this.forceUpdate();
      if (this.props.onChanged) {
        this.props.onChanged(spec);
      }
    },
    spec.icon || "cog");
  }

  render() {
    var self = this;
    var spec = this.props.spec;
    if (!spec || _.isEmpty(spec)) {
      return <div className="hope-composer-node" />;
    }
    var inports = (spec.in && spec.in.ports) || [];
    var outports = (spec.out && spec.out.ports) || [];
    var margin = 8;
    var nth = $hope.config.graph.node_title_height;
    var nh = (Math.max(outports.length, inports.length) + 1) * 36;  // node height
    var w = 248;
    var h = 2 * margin + 2 * 8 + nh;
    var styles = {
      x: 45,
      y: 30,
      width: 190,
      height: h
    };

    var hdr_path = [
      "M", styles.x, styles.y + nth,
      "v", -nth + 5,
      "a5,5 0 0 1 5 -5",
      "h", styles.width - 5 * 2,
      "a5,5 0 0 1 5 5",
      "v", nth - 5,
      "z"
    ].join(" ");

    var body_path = [
      "M", styles.x, styles.y + nth,
      "v", styles.height - nth - 5,
      "a5,5 0 0 0 5 5",
      "h", styles.width - 5 * 2,
      "a5,5 0 0 0 5 -5",
      "v", -styles.height + nth + 5,
      "z"
    ].join(" ");

    function render_in_port(p) {
      var y = margin + nth + nh / (inports.length + 1) * (inports.indexOf(p) + 1);

      var addons;
      if (!p.buffered) {
        addons = <circle className={"hope-graph-inner-circle"} cx={25} cy={y} r={3} />;
      }
      return (
        <g key={"I." + p.name} className="hope-graph-in-port">
          <text className={"hope-graph-port-text"}
              x={styles.x + 5} y={y + 2} fontSize="14px">{p.name}</text>
          {self.props.active &&
            <text onClick={self._on_remove_port.bind(self, "in", p.name)}
              className={"hope-graph-icon-btn"}
              x={styles.x + 85} y={y + 4} fontSize="14px">{FONT_AWESOME["trash-o"]}</text>
          }
          <line className={"hope-graph-in-line" + (p.no_trigger ? " hope-graph-dash" : "")}
              x1={21} y1={y} x2={45} y2={y} />
          <line onClick={self._on_click_line.bind(self, p.name)}
              className="hope-graph-buf-outline"
              x1={21} y1={y} x2={45} y2={y} />
          <circle onClick={self._on_click_circle.bind(self, p.name)}
              className={"hope-graph-passive-circle"}
              cx={25} cy={y} r={6} />
          { addons }
        </g>
      );
    }

    function render_out_port(p) {
      var y = margin + nth + nh / (outports.length + 1) * (outports.indexOf(p) + 1);
      var x = styles.x + styles.width;
      var r = $hope.config.graph.port_radius;
      return (
        <g key={"O." + p.name} className="hope-graph-out-port">
          <text className={"hope-graph-port-text"} x={x - 8} y={y + 3}>{p.name}</text>
          {self.props.active &&
            <text onClick={self._on_remove_port.bind(self, "out", p.name)}
              className={"hope-graph-icon-btn"}
              x={x - 8 - p.name.length * 8} y={y + 4} fontSize="14px">{FONT_AWESOME["trash-o"]}</text>
          }
          <circle key="outer" className="hope-graph-port-circle" cx={x} cy={y} r={r} />
          <circle key="inner" className="hope-graph-inner-circle" cx={x} cy={y} r={r / 2} />
        </g>
      );
    }

    var defval_inputs = [];
    inports.map(p => {
      var idx = inports.indexOf(p);
      var y = margin + nth + nh / (inports.length + 1) * (idx + 1);
      if (p.buffered) {
        return;
      }
      defval_inputs.push(
        <input type="text"
          key={p.name}
          className="hope-graph-default-value"
          value={self.state[p.name]}
          onChange={self._on_change_defval.bind(self, p.name)}
          style={{
            left: (styles.x + 5) + "px",
            top: (y + 4) + "px",
            height: "18px",
            width: "80px" }} />
      );
    });

    return (
      <div className={"hope-composer-node" + (this.props.active ? " active" : "")}>
        <div style={{
            position: "relative",
            height: "100%",
            width: "100%"}}>
          <svg width={w} height={h}>
            <path className={"hope-graph-node-title-bar"} d={hdr_path} />
            <path d={body_path} />
            <text onClick={this._on_click_icon} className={"hope-graph-icon"}
                x={styles.x + 9}
                y={styles.y + nth - 6}>
              {FONT_AWESOME[spec.icon || "cog"]}
            </text>
            <text x={styles.x + 20} y={styles.y + nth - 5}>
              {spec.name}
            </text>
            { inports.map(render_in_port) }
            { outports.map(render_out_port) }
            {this.props.active &&
              <text onClick={self._on_add_new.bind(this, "in")}
                className={"hope-graph-icon-btn"}
                x={styles.x + 5} y={h - 6}>{FONT_AWESOME["plus-circle"]}</text>
            }
            {this.props.active &&
              <text onClick={self._on_add_new.bind(this, "out")}
                className={"hope-graph-icon-btn"}
                x={styles.x + styles.width - 16} y={h - 6}>{FONT_AWESOME["plus-circle"]}</text>
            }
          </svg>
          { defval_inputs }
        </div>
      </div>
    );
  }
}