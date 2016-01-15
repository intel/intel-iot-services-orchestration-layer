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
//////////////////////////////////////////////////////////////////
//
// GraphView encapsulates the Graph (the model) to provding extra
// information not in graph but temporary needed, like scale level,
// selected nodes / edges, etc.
// 
// GraphView and Graph is 1:1 mapping, and maybe considered as view-model.
//
// GraphView is managed by GraphStore 
// 
// NOTE that we merge multipe kind of events into one, e.g. node/created,
// node/removed etc. to node and put the type of evnet to event message
// This helps maintainance the listen and unlisten of the events ...
// 
// // ??? is the type, could be node, edge etc.
// event could be created, removed, changed, moved, styles_changed, binding_changed
// "???", {id: id_of_it, type: ???, event: ...}
//
//////////////////////////////////////////////////////////////////

import {EventEmitter} from "events";
import FONT_AWESOME from "./font-awesome.js";
import Graph from "./graph";

// MUST be #RRGGBB style like colors
var TAG_COLORS = ["#7e004a", "#0a3981", "#ffa800", "#00ffff", "#ff00ff", "#008888", "#880088"];

var RUNNING = "running";
var EDITING = "editing";
var DEBUGGING = "debugging";

$hope.config.graph = $hope.config.graph || {};

_.merge($hope.config.graph, {
  undo_limits: 20,    // maxium times of undo
  node_size: {
    width: 130,
    height: 60
  },
  node_title_height: 20,
  inport_line_length: 20,
  port_radius: 5,
  tag_size: 11
});

export default class GraphView extends EventEmitter {

  constructor(graph) {
    super();

    this.graph = graph;
    this.id = graph.id;
    this.info_for_new = null; // only used to store information for creation

    this.animated_edges = {};
    this.animated_nodes = {};
    this.selected_nodes = {};
    this.selected_edges = {};
    this.selected_port = null;
    this.zoom_scale = 1.0;
    this.offset = {
      dx: 0,
      dy: 0
    };

    // use this to handle undo
    this.undo_stack = [];
    // how many items (from the end of stack) have undo (thus able to redo)
    this.undo_times = 0;   

    this.replay_timer = null;
    this.mode = EDITING;

    this.modified = false;
  }

  static create(app_id, name, description) {
    var view = new GraphView(Graph.create({
      name: name,
      description: description
    }));
    view.info_for_new = {
      app_id: app_id
    };
    view.modified = true;
    return view;
  }



  //////////////////////////////////////////////////////////////////
  // Read Helpers - merged with neccessary information in addtion
  // to raw data in this.graph
  //////////////////////////////////////////////////////////////////
  get(type, id) {
    return this.graph.$get(type, id);
  }

  get_node_size(id) {
    var node = this.get('node', id);
    var ns = $hope.config.graph.node_size;
    var num = Math.max(node.in.ports.length, node.out.ports.length);
    
    var ret = {
      width: ns.width,
      height: $hope.config.graph.node_title_height + num * 20
    };

    if (ret.height < $hope.config.graph.node_size.height) {
      ret.height = $hope.config.graph.node_size.height;
    }

    return ret;
  }

  get_node_icon(node) {
    var styles = node.$get_styles() || {};
    return FONT_AWESOME[styles.icon || node.icon || "cog"];
  }

  get_port_position(port, type) {
    return type === "in" ? this.get_inport_position(port) : this.get_outport_position(port);
  }

  get_inport_position(port) {
    var pt = port.$node.$get_position();
    var h = this.get_node_size(port.$node.id).height - $hope.config.graph.node_title_height;
    var idx = port.$node.in.ports.indexOf(port);

    pt.y += $hope.config.graph.node_title_height + h / (port.$node.in.ports.length + 1) * (idx + 1);
    return pt;
  }

  get_outport_position(port) {
    var pt = port.$node.$get_position();
    var sz = this.get_node_size(port.$node.id);
    var h = sz.height - $hope.config.graph.node_title_height;
    var idx = port.$node.out.ports.indexOf(port);

    pt.x += sz.width;
    pt.y += $hope.config.graph.node_title_height + h / (port.$node.out.ports.length + 1) * (idx + 1);
    return pt;
  }

  get_transform_string() {
    var scale = "scale(" + Math.round(this.zoom_scale * 100) / 100 + ")";
    var translate = "translate(" + this.offset.dx + ", " + this.offset.dy + ")";
    return translate + " " + scale;
  }

  find_edge(src, tgt) {
    return this.graph.$find_edge(src, tgt);
  }

  get_tag_color(tag) {
    var idx = this.graph.tags.indexOf(tag);
    if (idx < 0 || idx >= TAG_COLORS.length) {
      idx = 0;
    }
    return TAG_COLORS[idx];
  }

  is_empty() {
    return this.graph.$is_empty();
  }

  get_bound_box() {
    // Find dimensions
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;

    this.graph.nodes.forEach(node => {
      var pt = node.$get_position();
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    });

    // Sanity check graph size
    $hope.check_warn(isFinite(minX) && isFinite(minY) && 
      isFinite(maxX) && isFinite(maxY), "GraphView", "get_bound_box() see Inf");


    var nodesz = $hope.config.graph.node_size;
    minX -= nodesz.width * 0.3;
    minY -= nodesz.height * 0.5;
    maxX += nodesz.width * 1.3;
    maxY += nodesz.height * 1.5;

    return {
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }


  is_tag_used(id) {
    for (var i = 0; i < this.graph.nodes.length; i++) {
      var node = this.graph.nodes[i];
      var tags = node.in.tags;
      if (tags) {
        for (let j = 0; j < tags.length; j++) {
          if (tags[j].ref === id) {
            return true;
          }
        }
      }

      tags = node.out.tags;
      if (tags) {
        for (let j = 0; j < tags.length; j++) {
          if (tags[j].ref === id) {
            return true;
          }
        }
      }
    }
    return false;
  }

  get_app_id() {
    if(this.info_for_new) {
      return this.info_for_new.app_id;
    }
    if (this.graph.app) {
      return this.graph.app;
    }
    var app = $hope.app.stores.app.get_app_by_graph_id(this.id);
    if (app) {
      return app.id;
    }
    return undefined;
  }

  get_app() {
    var appstore = $hope.app.stores.app;
    if(this.info_for_new) {
      return appstore.get_app(this.info_for_new.app_id);
    }
    if (this.graph.app) {
      return appstore.get_app(this.graph.app);
    }
    return appstore.get_app_by_graph_id(this.id);
  }

  set_modified(flag) {
    if (flag === undefined) {
      flag = true;
    }
    if (this.modified !== flag) {
      this.modified = flag;
      $hope.app.stores.graph.emit("graph", {id: this.id, type: "graph", event: "status/changed"});
      this.update_toolbar();
    }
  }

  //////////////////////////////////////////////////////////////////
  // All write methods here, a lot of them invokes the Graph methods
  // but should generate corresponding events
  //////////////////////////////////////////////////////////////////
  // the objected pushed should have a function called do
  // and a function called undo
  push_into_undo_stack(undo_obj) {
    // we need to clean items for redo first
    for (var i = 0; i < this.undo_times; i++) {
      this.undo_stack.pop();
    }
    this.undo_times = 0;
    this.undo_stack.push(undo_obj);
    while (this.undo_stack.length > $hope.config.graph.undo_limits) {
      this.undo_stack.shift();
    }
    this.update_toolbar();
  }


  move(ddx, ddy) {
    this.offset.dx += ddx || 0;
    this.offset.dy += ddy || 0;
    this.emit("graph", {id: this.id, type: "graph", event: "moved"});
  }

  // x, y remains unchanged after scale
  zoom(ratio, x, y) {
    var old_zoom_scale = this.zoom_scale;
    this.zoom_scale *= ratio;
    if (this.zoom_scale > 10) {
      this.zoom_scale = 10.0;
    } else if (this.zoom_scale < 0.2) {
      this.zoom_scale = 0.2;
    }
    // we need to keep x, y unchanged by compensating the offset
    x = x || 0;
    y = y || 0;
    // given:
    //   x = actual_x * old_zoom_scale + this.old_offset.dx
    //     = actual_x * new_zoom_scale + this.new_offset.dx
    // so: this.new_offset.x = x - actual_x * new_zoom_scale
    //    = x - (x - this.old_offset.dx) / old_zoom_scale * new_zoom_scale

    this.offset = {
      dx: x - (x - this.offset.dx) / old_zoom_scale * this.zoom_scale,
      dy: y - (y - this.offset.dy) / old_zoom_scale * this.zoom_scale
    };

    this.emit("graph", {id: this.id, type: "graph", event: "scaled"});
  }

  // logic is the x, y defined in node
  // view is the x, y inside SVG
  logic_to_view(x, y) {
    return {
      x: x * this.zoom_scale + this.offset.dx,
      y: y * this.zoom_scale + this.offset.dy
    };
  }

  view_to_logic(x, y) {
    return {
      x: (x - this.offset.dx) / this.zoom_scale,
      y: (y - this.offset.dy) / this.zoom_scale
    };
  }

  // Calculate the offset needed (under current scale) to move 
  // a point with logic postion to a designated view position
  calculate_offset(logic_pos, view_pos) {
    return {
      dx: view_pos.x - logic_pos.x * this.zoom_scale,
      dy: view_pos.y - logic_pos.y * this.zoom_scale
    };
  }


  fit() {
    if (this.is_empty()) {
      return;
    }
    var ide = $hope.app.stores.ide;
    var box = this.get_bound_box();
    var padding = 50;
    var x_scale = ide.graph_svg.width / (box.width + padding * 2);
    var y_scale = ide.graph_svg.height / (box.height + padding * 2);
    this.zoom_scale = x_scale < y_scale ? x_scale : y_scale;
    // var new_w = box.width * this.zoom_scale;
    var new_h = box.height * this.zoom_scale;
    // we put the graph vertically center but try to be close to left panel
    // var left = ide.panel.library.width + (ide.graph_svg.width - ide.panel.library.width - new_w) / 2;
    var left = padding;
    this.offset = this.calculate_offset({
      x: box.left,
      y: box.top
    }, {
      x: left,
      y: (ide.graph_svg.height - new_h) / 2 
    });
    this.emit("graph", {id: this.id, type: "graph", event: "fitted"});
  }

  autolayout() {
    var graph = {
      id: this.graph.id,
      properties: {
        spacing: 80,
        direction: "RIGHT",
        edgeRouting: "SPLINES",
        nodePlace: "SIMPLE"
      },
      children: [],
      edges: []
    };
    _.forOwn(this.graph.nodes, n => {
      let size = this.get_node_size(n.id);
      graph.children.push({
        id: n.id,
        width: size.width,
        height: size.height
      });
    });
    _.forOwn(this.graph.edges, e => {
      graph.edges.push({
        id: e.id,
        source: e.source.$node.id,
        target: e.target.$node.id
      });
    });
    $klay.layout({      // eslint-disable-line
      graph: graph,
      success: layouted => { 
        _.forOwn(layouted.children, n => {
          this.get("node", n.id).$set_position({
            x: n.x,
            y: n.y
          });
        });
        this.set_modified();
        this.fit();
        // we need this to rerender entire graph
        // the fit event only set transforms and doesn't re-render
        this.emit("graph", {id: this.id, type: "graph", event: "autolayouted"});
      },
      error: err => { 
        $hope.log.warn("GraphView", "[Autolayout]", "Failed because", err);
      }
    });
  }



  create(type, data, styles, binding) {
    var o = this.graph.$create(type, data, styles, binding);
    if (o) {
      this.set_modified();
      this.emit(type, {id: o.id, type: type, event: "created"});
    }
    return o;
  }

  add(o) {
    this.graph.$add(o);
    this.set_modified();
    this.emit(o.$type, {id: o.id, type: o.type, event: "created"});
  }

  remove(type, id) {
    var o = this.graph.$remove(type, id);
    if (o) {
      this.set_modified();
      this.emit(type, {id: o.id, type: type, event: "removed"});
    }
    return o;
  }

  change(type, id, data) {
    var o = this.get(type, id);
    if (o) {
      _.merge(o, data);
      this.set_modified();
      this.emit(type, {id: o.id, type: type, event: "changed"});
    }
    return o;
  }


  // Althought position is also kind of style change, but we specially put it
  // here (as a kind of optimization)
  move_node(id, dx, dy) {
    var o = this.get("node", id);
    var pos = o.$get_position();
    if (o) {
      o.$set_position({
        x: pos.x + (dx || 0) / this.zoom_scale,
        y: pos.y + (dy || 0) / this.zoom_scale
      });
      this.set_modified();
      this.emit("node", {id: o.id, type: "node", event: "moved"});
    }
    return o;
  }

  resize_node(id, new_size) {
    this.node_sizes[id] = new_size;
    this.set_modified();
    this.emit("node", {id: id, type: "node", event: "resized"});
  }

  // This is the last resort, if above specialized style change (e.g. position)
  // doesn't fit
  merge_styles(type, id, data) {
    var o = this.get(type, id);
    if (o) {
      o.$merge_styles(data);
      this.set_modified();
      this.emit(type, {id: o.id, type: type, event: "changed"});
    }
    return o;
  }


  //////////////////////////////////////////////////////////////////
  // Selection Related
  //////////////////////////////////////////////////////////////////

  has_selections() {
    return !_.isEmpty(this.selected_nodes) || !_.isEmpty(this.selected_edges);
  }

  is_selected(type, id) {
    $hope.check(this.get(type, id), "GraphView", 
      "Cannot find the entity for is_selected()", type, id);
    return this["selected_" + type + "s"][id];
  }

  is_animated(type, id) {
    $hope.check(this.get(type, id), "GraphView", 
      "Cannot find the entity for is_animated()", type, id);
    return this["animated_" + type + "s"][id];
  }

  select(type, id, is_selected, is_multiple_select) {
    var o = this.get(type, id);
    if (!o) {
      return;
    } 
    var items = this["selected_" + type + "s"];
    if (is_selected && !is_multiple_select) {
        this.unselect_all();
    }
    if (is_selected && !items[id]) {
      items[id] = o;
      this.emit(type, {id: id, type: type, event: "selected"});
    } else if (!is_selected && items[id]) {
      delete items[id];
      this.emit(type, {id: id, type: type, event: "unselected"});
    }
    this.update_toolbar();
    this.update_inspector();
  }

  unselect_all() {
    _.forOwn(this.selected_nodes, (k, n) => {
      this.select("node", n, false);
    });
    _.forOwn(this.selected_edges, (k, e) => {
      this.select("edge", e, false);
    });
    if (this.selected_port) {
      this.unselect_port();
    }
  }

  unselect_port() {
    var port = this.selected_port;
    this.selected_port = null;
    this.emit("graph", {id: port.$node.id, type: "graph", event: "port_unselected"});
  }

  select_port(node_id, port_name, port_type) {
    var node = this.get("node", node_id);
    var port = node[port_type].$port(port_name);
    var orig = this.selected_port;

    if (orig) {
      this.unselect_port();

      if (orig !== port && this.selected_port_type !== port_type) {
        var src, tgt;
        if (port_type === "out") {
          src = port;
          tgt = orig;
        }
        else {
          src = orig;
          tgt = port;
        }

        if (!this.find_edge(src, tgt)) {
          this._create_edge({
            source: {
              node: src.$node.id,
              port: src.name
            },
            target: {
              node: tgt.$node.id,
              port: tgt.name
            }
          });
        }
      }
      return;
    }

    this.selected_port = port;
    this.selected_port_type = port_type;
    this.emit("graph", {id: node_id, type: "graph", event: "port_selected"});
  }

  _create_edge(edge) {
    var e = this.create("edge", edge);
    this.push_into_undo_stack({
      do: () => {
        this.add(e);
      },
      undo: () => {
        this.remove("edge", e.id);
      }
    });
  }

  update_toolbar() {
    $hope.app.stores.ide.update_toolbar();
  }

  update_inspector() {
    $hope.app.stores.ide.update_inspector();
  }

  //////////////////////////////////////////////////////////////////
  // Action Handlers
  //////////////////////////////////////////////////////////////////

  _remove_items_action(nodes, edges) {
    // need to clone
    var nodes_to_remove = {};
    _.forOwn(nodes, n => nodes_to_remove[n.id] = n);
    // collect all of the edges
    var edges_to_remove = {};
    _.forOwn(edges, e => edges_to_remove[e.id] = e);
    _.forOwn(nodes, n => {
      _.forOwn(n.$get_in_edges(), e => edges_to_remove[e.id] = e);
      _.forOwn(n.$get_out_edges(), e => edges_to_remove[e.id] = e);
    });
    if(_.isEmpty(nodes_to_remove) && _.isEmpty(edges_to_remove)) {
      return;
    }

    var undo_obj = {
      do: () => {
        _.forOwn(edges_to_remove, e => {
          delete this.selected_edges[e.id];
          this.graph.$remove("edge", e.id);
        });
        _.forOwn(nodes_to_remove, n => {
          if (this.selected_port && this.selected_port.$node === n) {
            this.unselect_port();
          }
          _.remove(this.copied_nodes, n.id);
          delete this.selected_nodes[n.id];
          this.graph.$remove("node", n.id);
        });
        this.set_modified();
        this.emit("graph", {id: this.id, type: "graph", event: "changed"});
      },
      undo: () => {
        _.forOwn(nodes_to_remove, n => {
          this.graph.$add(n);
        });
        _.forOwn(edges_to_remove, e => {
          this.graph.$add(e);
        });
        this.set_modified();
        this.emit("graph", {id: this.id, type: "graph", event: "changed"});
      }
    };
    undo_obj.do();
    this.push_into_undo_stack(undo_obj);
    this.update_inspector();
  }

  _animate(type, id, animate) {
    var items = this["animated_" + type + "s"];
    if (animate) {
      var obj = this.get(type, id);
      if (obj && !items[id]) {
        items[id] = obj;
        this.emit(type, {id: id, type: type, event: "changed"});
      }
    }
    else {
      if (items[id]) {
        delete items[id];
        this.emit(type, {id: id, type: type, event: "changed"});
      }
    }
  }

  copy() {
    var nodes = [];
    _.forOwn(this.selected_nodes, (k, n) => {
      nodes.push(n);
    });
    this.copied_nodes = nodes;
  }

  paste() {
    var tgts = [];
    _.forEach(this.copied_nodes, id => {
      var node = this.get("node", id);
      if (node) {
        tgts.push(node.$clone());
      }
    });
    if (tgts.length === 0) {
      return;
    }
    var undo_obj = {
      do: () => {
        _.forEach(tgts, tgt => {
          this.add(tgt);
        });
      },
      undo: () => {
        _.forEach(tgts, tgt => {
          this.remove("node", tgt.id);
        });
      }
    };

    undo_obj.do();
    this.push_into_undo_stack(undo_obj);
    this.update_inspector();
  }

  is_debugging() {
    return this.mode === DEBUGGING;
  }

  is_editing() {
    return this.mode === EDITING;
  }

  is_running() {
    return this.mode === RUNNING;
  }

  is_auto_replaying() {
    return this.replay_timer !== null;
  }

  set_debugging() {
    this.mode = DEBUGGING;
  }

  set_editing() {
    this.mode = EDITING;
  }

  set_running() {
    this.mode = RUNNING;
  }

  update_animation() {
    var logs = this.$logs;
    var edges = {}, nodes = {}, obj;

    if (logs && this.$logidx < logs.length) {
      var log = logs[this.$logidx];
      _.forEach(log.nodes, n => {
        obj = this.get("node", n.id);
        if (obj) {
          obj.$lasttim = log.time;      // beginning
          obj.$lastdat = n.data;        // data snapshot
          nodes[n.id] = obj;
        }
      });

      _.forEach(log.edges, e => {
        obj = this.get("edge", e.id);
        if (obj) {
          obj.$lastdat = e.data;        // data snapshot
          obj.$lasttim = log.time;      // beginning
          edges[e.id] = obj;
        }
      });
    }

    let objs = _.size(nodes) + _.size(edges);
    if (objs === 1) {
      this.select(obj.$type, obj.id, true);
    }

    this.animated_edges = edges;
    this.animated_nodes = nodes;
    $hope.app.stores.graph.emit("graph", {id: this.id, type: "graph", event: "animated"});

    if (objs > 0) {
      setTimeout(() => {
        this.animated_edges = {};
        this.animated_nodes = {};
        $hope.app.stores.graph.emit("graph", {id: this.id, type: "graph", event: "animated"});
      }, 2700);
    }
  }

  step_it() {
    if (this.$logs && this.$logidx < this.$logs.length) {
      this.$logidx++;
      this.update_animation();
    }
  }

  stop_auto_replay() {
    clearInterval(this.replay_timer);
    this.replay_timer = null;
    this.update_toolbar();
  }

  step(type) {
    var logs = this.$logs;
    var len = logs ? logs.length : 0;

    switch (type) {
      case "step":
        this.step_it();
        break;
    
      case "back":
        if (logs && len > 0 && this.$logidx > 0) {
          this.$logidx--;
          this.update_animation();
        }
        break;

      case "begin":
        if (logs && len > 0) {
          this.$logidx = 0;
          this.update_animation();
        }
        break;

      case "go":
        if (!this.replay_timer) {
          this.replay_timer = setInterval(() => {
            this.step_it();
            if (!this.$logs || this.$logidx >= len) {
              this.stop_auto_replay();
            }
          }, 3000);
          this.update_toolbar();
        }
        else {
          this.stop_auto_replay();
        }
        break;
    }
  }

  // See graph_action.js for schema of data
  handle_action(action, data) {
    $hope.log("GraphView", "[Action]", action, data);
    switch(action) {
      case "graph/undo": {
        let idx = this.undo_stack.length - this.undo_times - 1;
        if (idx >= 0) {
          this.undo_times ++;   // eslint-disable-line
          this.undo_stack[idx].undo();
          this.update_toolbar();
        }
      }
      break;

      case "graph/redo": {
        let idx = this.undo_stack.length - this.undo_times;
        if (this.undo_times > 0) {
          this.undo_times --;   // eslint-disable-line
          this.undo_stack[idx].do();
          this.update_toolbar();
        }
      }
      break;

      case "graph/copy":
        this.copy();
        break;

      case "graph/paste":
        this.paste();
        break;

      case "graph/move":
        if (data.phase === "start") {
          let undo_obj = {
            action: "graph/move",
            start_offset: _.clone(this.offset),
            start_scale: this.zoom_scale,
            undo: () => {
              this.offset = undo_obj.start_offset;
              this.zoom_scale = undo_obj.start_scale;
              this.emit("graph", {id: this.id, type: "graph", event: "moved"});
            }
          };       
          this.push_into_undo_stack(undo_obj);
          this.move(data.ddx, data.ddy);
        } else if (data.phase === "end") { // point to redo
          let undo_obj = $hope.check(_.last(this.undo_stack), "Graph",
              "graph/move didn't find the start undo_obj");
          $hope.check(undo_obj.action === "graph/move", "Graph", 
              "graph/move is not matched with start");
          this.move(data.ddx, data.ddy);
          undo_obj.end_offset = _.clone(this.offset);
          undo_obj.end_scale = this.zoom_scale;
          undo_obj.do = () => {
            this.offset = undo_obj.end_offset;
            this.zoom_scale = undo_obj.end_scale;
            this.emit("graph", {id: this.id, type: "graph", event: "moved"});
          };
        } else {
          this.move(data.ddx, data.ddy);
        }
        break;

      case "graph/zoom":
        this.zoom(data.ratio, data.x, data.y);
        break;

      case "graph/fit": {
        let undo_obj = {
          saved_offset: _.clone(this.offset),
          saved_scale: this.zoom_scale,
          do: () => this.fit(),
          undo: () => {
            this.offset = undo_obj.saved_offset;
            this.zoom_scale = undo_obj.saved_scale;
            this.emit("graph", {id: this.id, type: "graph", event: "scaled"});
          }
        };
        this.push_into_undo_stack(undo_obj);
        undo_obj.do();
      }
      break;

      case "graph/autolayout": {
        let undo_obj = {
          saved_positions: {},
          saved_offset: _.clone(this.offset),
          saved_scale: this.zoom_scale,
          do: () => this.autolayout(),
          undo: () => {
            this.offset = undo_obj.saved_offset;
            this.zoom_scale = undo_obj.saved_scale;
            _.forOwn(undo_obj.saved_positions, (n, id) => {
              this.get("node", id).$set_position(n);
            });
            this.set_modified();
            this.emit("graph", {id: this.id, type: "graph", event: "autolayouted"});
          }
        };
        _.forOwn(this.graph.nodes, n => {
          undo_obj.saved_positions[n.id] = _.clone(n.$get_position());
        });
        this.push_into_undo_stack(undo_obj);
        undo_obj.do();
      }
      break;

      case "graph/create/node": {
        if (!this.is_editing()) {
          return;
        }
        let o = this.create("node", data.node, data.styles, data.binding);
        let undo_obj = {
          do: () => this.add(o),
          undo: () => this.remove("node", o.id)
        };
        this.push_into_undo_stack(undo_obj);
      }
      break;

      case "graph/remove/node":
        this._remove_items_action([this.get("node", data.id)]);
        break;
      case "graph/change/node":
        this.change("node", data.id, data.node);
        break;
      case "graph/move/node": {
        let o = this.get("node", data.id);
        if (!o) {
          return;
        } 
        if (data.phase === "start") { // point to restore
          let undo_obj = {
            action: "graph/move/node",
            node: o,
            start_pos: _.clone(o.$get_position()),
            undo: () => {
              o.$set_position(undo_obj.start_pos);
              this.set_modified();
              this.emit("node", {id: o.id, type: "node", event: "moved"});
            }
          };
          this.push_into_undo_stack(undo_obj);
          this.move_node(data.id, data.dx, data.dy);
        } else if (data.phase === "end") { // point to redo
          let undo_obj = $hope.check(_.last(this.undo_stack), "Graph",
           "graph/move/node didn't find the start undo_obj");
          $hope.check(undo_obj.action === "graph/move/node" &&
            o === undo_obj.node, "Graph", "graph/move/node not matched with start");
          this.move_node(data.id, data.dx, data.dy);
          undo_obj.end_pos = _.clone(o.$get_position());
          undo_obj.do = () => {
            o.$set_position(undo_obj.end_pos);
            this.set_modified();
            this.emit("node", {id: o.id, type: "node", event: "moved"});
          };
        } else {
          this.move_node(data.id, data.dx, data.dy);
        }
      }
      break;

      case "graph/merge_styles/node":
        this.merge_styles("node", data.id, data.styles);
        break;  
      case "graph/resize/node":
        this.resize_node(data.id, data.size);
        break;

      case "graph/create/edge":
        this._create_edge(data.edge);
        break;

      case "graph/remove/edge": {
        let o = this.create("edge", data.id);
        let undo_obj = {
          do: () => this.remove(o),
          undo: () => this.add("edge", o.id)
        };
        this.push_into_undo_stack(undo_obj);
      }
      break;

      case "graph/change/edge":
        this.change("edge", data.id, data.edge);
        break;
      case "graph/merge_styles/edge":
        this.merge_styles("edge", data.id, data.styles);
        break;  

      case "graph/unselect/all":
        this.unselect_all();
        break;
      case "graph/select/node":
        this.select("node", data.id, true, data.is_multiple_select);
        break;
      case "graph/unselect/node":
        this.select("node", data.id, false);
        break;
      case "graph/select/edge":
        this.select("edge", data.id, true, data.is_multiple_select);
        break;
      case "graph/unselect/edge":
        this.select("edge", data.id, false);
        break;
      case "graph/remove/selected":
        this._remove_items_action(this.selected_nodes, this.selected_edges);
        break;

      case "graph/select/port":
        this.select_port(data.id, data.name, data.type);
        break;

      case "graph/animate/edge":
        this._animate("edge", data.id, true);
        break;

      case "graph/unanimate/edge":
        this._animate("edge", data.id, false);
        break;

      case "graph/animate/node":
        this._animate("node", data.id, true);
        break;

      case "graph/unanimate/node":
        this._animate("node", data.id, false);
        break;

      case "graph/step":
        this.step(data.type);
        break;
    }

    $hope.app.stores.ide.update_navigator();
  }

}

