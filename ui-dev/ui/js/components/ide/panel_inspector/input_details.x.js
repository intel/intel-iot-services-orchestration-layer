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
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import Dialog from "../dialog.x";
import NodeHelpTopic from "./node_help_topic.x";
import FONT_AWESOME from "../../../lib/font-awesome.js";

export default class InputDetails extends ReactComponent {

  static propTypes = {
    id: React.PropTypes.string.isRequired
  };

  constructor(props) {
    super();

    this.state = this._get_states(props.id);
  }

  componentWillReceiveProps(nextProps) {
    this.setState(this._get_states(nextProps.id));
  }

  _get_states(id) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", id);
    var state = {};

    _.forOwn(node.in.ports, p => {
      state[p.name] = ("default" in p) ? String(p.default) : "";
    });
    return state;
  }

  _on_click_group() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var groupable = true;

    _.forOwn(node.in.ports, p => {
      if (p.customizations_disabled && p.customizations_disabled.be_grouped) {
        groupable = false;
        return false;
      }
    });

    if (!groupable) {
      $hope.notify("warning", "attributes modifing disabled");
      return;
    }

    if (node.in.groups && node.in.groups.length > 0) {
      _.forOwn(node.in.ports, p => {
        delete p.buffered;
      });
      delete node.in.groups;
    }
    else {
      let grp = {id: "group_id_1", ports: []};
      _.forOwn(node.in.ports, p => {
        p.buffered = true;
        delete p.default;
        grp.ports.push(p.name);
      });
      node.in.groups = [grp];
    }
    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _on_click_circle(name) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var port = node.in.$port(name);

    if (port.customizations_disabled && port.customizations_disabled.buffered) {
      $hope.notify("warning", "attributes modifing disabled");
      return;
    }

    if (port.buffered) {
      delete port.buffered;
    }
    else {
      port.buffered = true;
      delete port.default;
    }
    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _on_click_line(name) {
    /*var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var port = node.in.$port(name);

    if (port.customizations_disabled && port.customizations_disabled.passive) {
      $hope.notify("warning", "attributes modifing disabled");
      return;
    }

    if (port.passive) {
      delete port.passive;
    }
    else {
      port.passive = true;
    }
    this.forceUpdate();
    view.change("node", this.props.id, null);*/
  }

  _on_add_new() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);

    var port = node.$add_port("in", {
      type: "any"
    });
    if (!port) {
      $hope.notify("error", "unable to add port");
      return;
    }

    if (node.in.groups && node.in.groups.length > 0) {
      port.buffered = true;
      node.in.groups[0].ports.push(port.name);
    }

    this.setState({
      [port.name]: ""
    });
    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _on_remove_port(name) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);

    if (node.in.groups) {
      _.forOwn(node.in.groups, g => {
        _.pull(g.ports, name);
      });
    }

    if (node.in.tags) {
      _.forOwn(node.in.tags, tag => {
        if (tag.ports) {
          _.pull(tag.ports, name);
        }
      });
    }

    var edges_to_remove = [];
    _.forOwn(view.graph.edges, e => {
      if ((e.source.$node === node && e.source.name === name) || (e.target.$node === node && e.target.name === name)) {
        edges_to_remove.push(e);
      }
    });
    _.forEach(edges_to_remove, e => {
      view.remove("edge", e.id);
    });

    node.$remove_port("in", name);
    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _on_color_selected(name, i) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var styles = node.$get_styles() || {};

    if (!styles.in_ports) {
      styles.in_ports = [];
    }
    if (!styles.in_ports[name]) {
      styles.in_ports[name] = {};
    }
    styles.in_ports[name].color = i;
    node.$set_styles(styles);

    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _on_click_color_palette(name, e) {
    e.stopPropagation();
    var rect = React.findDOMNode(this.refs["color_" + name]).getBoundingClientRect();
    $hope.trigger_action("ide/show/palette", {
      x: rect.left + rect.width + 10,
      y: rect.top,
      onSelect: this._on_color_selected.bind(this, name)
    });
  }

  _on_click_port_name(name, e) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var port = node.in.$port(name);

    e.stopPropagation();

    if (node.$is_added_port(name)) {
      Dialog.show_edit_dialog("Change the name of port", newname => {
          node.$rename_port("in", name, newname);
          this.setState({
            [newname]: this.state[name]
          });
          this.forceUpdate();
          view.change("node", this.props.id, null);
        },
        name);
    }
  }

  _on_change_defval(name, e) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var port = node.in.$port(name);

    this.setState({
      [name]: e.target.value
    });

    switch(port.type) {
    case "boolean":
      port.default = e.target.value.toLowerCase() === "true";
      break;
    case "float":
    case "double":
    case "number":
      port.default = Number(e.target.value);
      break;
    case "int":
      port.default = parseInt(e.target.value);
      break;
    default:
      port.default = e.target.value;
      break;
    }
    view.change("node", this.props.id, null);
  }

  _on_show_help() {
    var inspector = $hope.app.stores.ide.panel.inspector;

    inspector.show_help = !inspector.show_help;
    this.forceUpdate();
  }

  render() {
    var self = this;
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var ports = node.in.ports;
    var styles = node.$get_styles() || {};
    var margin = 12;
    var nh = (ports.length + 1) * 36;  // node height
    var z = (nh + 2 * 8) / 8;
    var w = 248;
    var h = 2 * margin + 2 * 8 + nh;

    if (!node.in.allow_to_add && ports.length === 0) {
      return null;
    }

    var zx = z, zy = z;
    if (zx > 30) {
      zx = 30;
    }
    var node_path = [
      "M", w - 40, margin,
      "H", 70,
      "a8,8 0 0 0 -8 8",
      "v", nh,
      "a8,8 0 0 0 8 8",
      "H", w - 40,
      "l", zx, -zy, "l", -zx, -zy,
      "l", zx, -zy, "l", -zx, -zy,
      "l", zx, -zy, "l", -zx, -zy,
      "l", zx, -zy, "l", -zx, -zy,
      "z"
    ].join(" ");

    var tooltip_change_color = <Tooltip bsSize="small">Change color</Tooltip>;

    function render_groups() {
      var num = ports.length;
      if (num < 2) {
        return null;
      }
      var y1 = margin + nh / (num + 1);
      var y2 = margin + nh - nh / (num + 1);
      var clsname;
      if (node.in.groups && node.in.groups.length > 0) {
        clsname = "hope-graph-grouped " + $hope.color(styles.color, "fill");
      }
      else {
        clsname = "hope-graph-nogroup" + $hope.color(styles.color, "stroke");
      }
      return <rect onClick={self._on_click_group} className={clsname} x={62} y={y1 - 1} width={margin} height={y2 - y1 + 2} />;
    }

    function render_port(p) {
      var y = margin + nh / (ports.length + 1) * (ports.indexOf(p) + 1);
      var color = null;
      if (styles.in_ports && styles.in_ports[p.name] && ("color" in styles.in_ports[p.name])) {
        color = styles.in_ports[p.name].color;
      }

      var addons = [];
      if (!p.buffered) {
        addons.push(<circle className={"hope-graph-inner-circle"} cx={25} cy={y} r={3} />);
      }
      if (node.$is_added_port(p.name)) {
        addons.push(<text onClick={self._on_remove_port.bind(self, p.name)}
            className={"hope-graph-icon-btn"}
            x={w - 60} y={y} fontSize="16px">{FONT_AWESOME["trash-o"]}</text>);
      }
      return (
        <g className="hope-graph-in-port">
          <text onClick={self._on_click_port_name.bind(self, p.name)}
              className={"hope-graph-port-text"}
              x={80} y={y} fontSize="14px" >{p.name}</text>
          <line className={"hope-graph-in-line" + (p.passive ? " hope-graph-dash" : "") + $hope.color(color, "stroke")}
              x1={30} y1={y} x2={62} y2={y} />
          <line onClick={self._on_click_line.bind(self, p.name)}
              className="hope-graph-buf-outline"
              x1={30} y1={y} x2={62} y2={y} />
          <circle onClick={self._on_click_circle.bind(self, p.name)}
              className={"hope-graph-passive-circle" + $hope.color(color, "fill", "hover")}
              cx={25} cy={y} r={6} />
          <OverlayTrigger placement="left" overlay={tooltip_change_color}>
            <circle ref={"color_" + p.name}
                className={"hope-graph-passive-circle" + $hope.color(color, "fill", "hover")}
                onClick={self._on_click_color_palette.bind(self, p.name)}
                cx={w - 70} cy={y} r={6} />
          </OverlayTrigger>
          { addons }
        </g>
      );
    }

    var add_new_btn = null;
    if (node.in.allow_to_add) {
      add_new_btn = <text onClick={self._on_add_new}
          className={"hope-graph-icon-btn"} x={70} y={h - 26}>{FONT_AWESOME["plus-circle"] + " add new"}</text>;
    }

    var help_section = null;
    if ($hope.app.stores.ide.panel.inspector.show_help) {
      help_section = <NodeHelpTopic />;
    }

    var defval_inputs = [];
    ports.map(p => {
      var idx = ports.indexOf(p);
      var y = margin + nh / (ports.length + 1) * (idx + 1);
      if (p.buffered) {
        return;
      }
      defval_inputs.push(
        <input type="text"
          className="hope-graph-default-value"
          value={self.state[p.name]}
          onChange={self._on_change_defval.bind(self, p.name)}
          style={{
            left: "82px",
            top: (y + 4) + "px",
            height: "18px",
            width: "80px" }} />
      );
    });

    return (
      <div>
        <div style={{
            position: "relative",
            height: h + "px",
            width: w + "px" }}>
          <svg width={w} height={h}>
            <path d={node_path} />
            { render_groups() }
            { ports.map(render_port) }
            { add_new_btn }
            <text onClick={self._on_show_help}
              className={"hope-graph-icon-btn"}
              x={w - 20} y={h - 16}>{FONT_AWESOME["question-circle"]}</text>
          </svg>
          { defval_inputs }
        </div>
        { help_section }
      </div>
    );
  }
}