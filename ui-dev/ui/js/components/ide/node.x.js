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
import {Popover} from "react-bootstrap";
import Overlay from "../overlay.x";
import LinterMessage from "./linter_msg.x";
import In from "./in.x";
import Out from "./out.x";
import class_names from "classnames";
import color from "color";
import FONT_AWESOME from "../../lib/font-awesome.js";

export default class Node extends ReactComponent {

  static propTypes = {
    view: React.PropTypes.object.isRequired,
    id: React.PropTypes.string.isRequired
  };

  state = {
    expanded: true
  };

  _is_selected() {
    return this.props.view.is_selected("node", this.props.id);
  }

  _is_animated() {
    return this.props.view.is_animated("node", this.props.id);
  }

  _on_expand(e) {
    e.stopPropagation();
    this.setState({
      expanded: !this.state.expanded
    });
  }

  _on_click(e) {
    e.stopPropagation();
    if (this.is_tracking) {
      return;
    }
    // Prevent screen blink
    if (!e.ctrlKey && this._is_selected()) {
      return;
    }
    $hope.trigger_action("graph/select/node", {
      graph_id: this.props.view.id, 
      id: this.props.id,
      is_multiple_select: e.ctrlKey
    });
  }

  _on_track_start(e) {
    e.stopPropagation();
    var view = this.props.view;
    if (!view.is_editing()) {
      return;
    }
    this.is_tracking = true;
    $hope.trigger_action("graph/move/node", {
      graph_id: view.id,
      id: this.props.id,
      dx: e.ddx,
      dy: e.ddy,
      phase: "start"
    });
  }

  _on_track(e) {
    e.stopPropagation();
    var view = this.props.view;
    if (!view.is_editing()) {
      return;
    }
    $hope.trigger_action("graph/move/node", {
      graph_id: view.id,
      id: this.props.id,
      dx: e.ddx,
      dy: e.ddy,
      phase: "ongoing"
    });
  }

  _on_track_end(e) {
    e.stopPropagation();
    var view = this.props.view;
    if (!view.is_editing()) {
      return;
    }
    this.is_tracking = false;
    $hope.trigger_action("graph/move/node", {
      graph_id: view.id,
      id: this.props.id,
      dx: e.ddx,
      dy: e.ddy,
      phase: "end"
    });
  }

  bind_track_events() {
    var dom_node = this.refs.box;
    if (dom_node) {
      PolymerGestures.addEventListener(dom_node, "trackstart", _.noop);
      PolymerGestures.addEventListener(dom_node, "track", _.noop);
      PolymerGestures.addEventListener(dom_node, "trackend", _.noop);

      dom_node.addEventListener("trackstart", this._on_track_start);
      dom_node.addEventListener("track", this._on_track);
      dom_node.addEventListener("trackend", this._on_track_end);
    }
  }

  unbind_track_events() {
    var dom_node = this.refs.box;
    if (dom_node) {
      PolymerGestures.removeEventListener(dom_node, "trackstart", _.noop);
      PolymerGestures.removeEventListener(dom_node, "track", _.noop);
      PolymerGestures.removeEventListener(dom_node, "trackend", _.noop);

      dom_node.removeEventListener("trackstart", this._on_track_start);
      dom_node.removeEventListener("track", this._on_track);
      dom_node.removeEventListener("trackend", this._on_track_end);
    }
  }

  componentDidUpdate() {
    var view = this.props.view;
    var node = view.get("node", this.props.id);
    var errors = !_.isEmpty(node.$lint_result);

    if (errors !== this.linter_errors) {
      this.linter_errors = errors;

      this.unbind_track_events();
      this.bind_track_events();
    }
  }

  componentDidMount() {
    this.bind_track_events();
  }

  componentWillUnmount() {
    this.unbind_track_events();
  }

  render() {
    var view = this.props.view;
    var id = this.props.id;
    var node = view.get("node", id);
    var binding = node.$get_binding();
    var nth = $hope.config.graph.node_title_height;
    var tagsz = $hope.config.graph.tag_size;
    var exp = binding && ($hope.app.stores.ide.all_bindding_expanded || this.state.expanded);
    var icon = view.get_node_icon(node);

    var styles = _.merge({
      x: 0,
      y: 0
    }, view.get_node_size(id), node.$get_styles());

    // get code from bundle
    var spec = node.$get_spec();
    if (!styles.color && spec.$bundle) {
      styles.color = spec.$bundle.$color_id;
    }

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
      "v", styles.height - nth - 5 + (exp ? 24 : 0),
      "a5,5 0 0 0 5 5",
      "h", styles.width - 5 * 2,
      "a5,5 0 0 0 5 -5",
      "v", -styles.height + nth + 5 - (exp ? 24 : 0),
      "z"
    ].join(" ");

    var groups;
    if (node.in.groups && node.in.groups.length > 0 && node.in.ports.length > 1) {
      var top = view.get_inport_position(node.in.ports[0]);
      var btm = view.get_inport_position(node.in.ports[node.in.ports.length - 1]);
      groups = (
        <rect className={"hope-graph-group " + $hope.color(styles.color, "fill")}
            x={styles.x}
            y={top.y - 1}
            width={6}
            height={btm.y - top.y + 2} />
      );
    }

    var tags = [];

    function render_tag(type, x, y) {
      if (node.$has_tags(type)) {
        var tag = view.get("tag", node[type].tags[0].ref); //TODO: Single tag one side only
        var rgb = view.get_tag_color(tag);
        var w = tagsz + 2;
        var path = [
            "M", x, y + tagsz - 1,
            "v", 6,
            "l", w / 2, -5,
            "l", w / 2, 5,
            "v", -6,
            "z"
          ].join(" ");

        tags.push(
          <g key={type}>
            <rect x={x} y={y} width={tagsz + 2} height={tagsz} fill={rgb} strokeWidth={0}/>
            <path fill={color(rgb).darken(0.2).rgbString()} strokeWidth={0} d={path} />
            <text className="hope-graph-tag" x={x + 3} y={y + 8}>{tag.name}</text>
          </g>
        );
      }
    }

    render_tag("in", styles.x + 6, styles.y + styles.height - 5);
    render_tag("out", styles.x + styles.width - tagsz - 6, styles.y + styles.height - 5);

    var bindcolor = 9, hub, thing, service, widget = null;
    var hub_manager = $hope.app.stores.hub.manager;
    if (binding && binding.type === "fixed") {
      if (binding.widget) {
        var w = $hope.app.stores.ui.get_widget(binding.widget);
        widget = w ? w.name : binding.widget;
      }
      else if (binding.hub) {
        hub = hub_manager.get_hub(binding.hub);
        if (hub) {
          bindcolor = hub.$color_id || 9;
          thing = hub_manager.get_thing(binding.hub, binding.thing);
          service = hub_manager.get_service(binding.hub, binding.thing, binding.service);
        }
      }
    }

    var binding_items, binding_dropdown;

    if (binding) {
      binding_dropdown = [];
      binding_dropdown.push(
        <circle className={$hope.color(bindcolor, "stroke", "hover")} 
                key="circle"
                strokeWidth="2px" 
                cx={styles.x + styles.width / 2} 
                cy={styles.y + styles.height - 3} 
                r={7} />
      );
      binding_dropdown.push(
        <text onClick={this._on_expand}
              key="text"
              className={class_names("hope-graph-icon directional-icon", 
                          $hope.color(bindcolor, "fill", "hover"))}
              x={styles.x + styles.width / 2}
              y={styles.y + styles.height + 2}>
              {FONT_AWESOME[exp ? "angle-up" : "angle-down"]}
        </text>
      );
    }

    if (exp && binding) {
      binding_items = [];
      binding_items.push(
        <line className={$hope.color(bindcolor, "stroke", "hover")} 
              key="line"
              strokeWidth="0.5px" 
              x1={styles.x} 
              y1={styles.y + styles.height} 
              x2={styles.x + styles.width} 
              y2={styles.y + styles.height} />);
      binding_items.push(
        <text className={"hope-binding-text" + $hope.color(bindcolor, "fill")} 
              key="text"
              x={styles.x + styles.width / 2} 
              y={styles.y + styles.height + 18}>
          {widget !== null ? widget : (thing ? thing.$name() : "---")}
        </text>
        );
    }

    var _name = node.name || (service ? service.$name() : "") || spec.name || __("__unknown__");
    var errors = !_.isEmpty(node.$lint_result);
    var body =
      <g className={class_names("hope-graph-node",
          {"hope-graph-selected": !view.edge_previewing && this._is_selected()})} >
        {errors &&
          <rect x={styles.x}
                y={styles.y}
                width={styles.width}
                height={styles.height + (exp ? 24 : 0)}
                strokeWidth="8"
                stroke={this._is_selected() ? "#f00" : "#a00"} />
        }
        <g ref="box" onClick={this._on_click}>
          <path className={"hope-graph-node-title-bar " + $hope.color(styles.color, "fill")} 
                d={hdr_path} />
          <path className={(this._is_animated() ? "hope-graph-node-shadow" :
                  $hope.color(_.isEmpty(spec) ? 1 : null, "fill"))}
                d={body_path} />
          {binding_items}
          {groups}
          {tags}
          <text className="no-events hope-graph-icon"
              x={styles.x + 9}
              y={styles.y + 15}>
            {icon}
          </text>
          <text className="no-events" x={styles.x + 20} y={styles.y + nth - 5}>
            {_name}
          </text>
          {binding_dropdown}
        </g>
        <In view={this.props.view} id={id} />
        <Out view={this.props.view} id={id} />
      </g>;
  
    return errors ?
      <Overlay overlay={
        <Popover id="PO-linter" title={__("Errors and Warnings")}>
          <div>
            {_.map(node.$lint_result, (msg, i) =>
                <LinterMessage type="error" key={"E" + i} msg={msg}/>
            )}
          </div>
        </Popover>} tirgger={["click", "hover", "focus"]}>{body}</Overlay> : body;
  }
}
