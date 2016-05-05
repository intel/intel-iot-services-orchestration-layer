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
// This is only responsible for building the model
// 
// Consequently, it is mostly a thin interpretation  of raw parsed JSON.
// 
// It doesn't wire much extra information in besides these in JSON, except for 
// caching of spec info. 
// 
// For being used in FLUX and overall presentation, it needs another layer
// (i.e. GraphStore) to provide events and also a lot of extra information such
// as default styling (these not specified in JSON), binding etc.
// 
//////////////////////////////////////////////////////////////////

import g_spec_manager from "./spec";

//////////////////////////////////////////////////////////////////
// Conventions
// 
// IMPORTANT: reference to spec, thing, service, hub etc. should all store 
// the id and use function to get the object from related maangers (e.g.
// spec manager, hub manager etc.)
// This is because spec and hub could change so we need to make this dynamically
// instead of cache the real object here
// 
// During deserialization, we directly merge the raw json into the 
// object. And for some fields, we would replace it with further deserialzation
// to meaningful objects, e.g. the in of graph would be deserialized to
// an In object, and the items in ports of in would be deserialized to InPorts
// 
// The deserialized objects would have a function $serialize() so we know 
// whether it is an deserialized object or just raw from parsed_json
// 
// To ensure there is no name conflicts, all newly created/derived fields in 
// the deserialized object should be prefixed with $
// As the result: 
// * all functions of deserialized object is prefixed with $
// * leaf objects may reference parent objects, but normally prefixed with $
//   e.g. InPort has node, but named as $node, Node has graph, but as $graph
// 
// This makes serialization easy, just iterate all fields (without $ prefix)
// and store back, and if any field has $serialize, then invoke it instead
// of directly store.
// 
// EXCEPTION:
// the nodes, edges, tags are direct property of Graph, although they 
// are under Graph.graph in original json. We do so to make things easier
// w/o the needs to write a $ every time to reference these frequently used
// properties.
//////////////////////////////////////////////////////////////////




// For create_object factory
var type_mapping = {};


//////////////////////////////////////////////////////////////////
// Port
//////////////////////////////////////////////////////////////////

class _InOutPortBase {
  constructor(type, parsed_json, node) {
    this.$type = type;
    this.$node = node;
    _.merge(this, parsed_json);

    // For compatibility
    if ("passive" in parsed_json) {
      delete this.passive;
      this.no_trigger = parsed_json.passive;
    }
  }

  $get_edges() {
    var all_edges = this.$node.$graph.edges;
    var edges = {};
    var field_picker = this.$type === "in" ? "target" : "source";
    _.forOwn(all_edges, e => {
      if (e[field_picker] === this) {
        edges[e.id] = e;
      }
    });
    return edges;
  };

  $serialize_with_diff(base) {
    base = base || {};
    var ret = $hope.serialize(this, true) || {};
    _.forOwn(ret, (v, k) => {
      if (v === base[k]) {
        delete ret[k];
      }
    });
    if (_.size(ret) === 0) {
      ret = undefined;
    } else {
      // NOTE: name is id alike, we need this to point out which
      // port it is, it has been deleted as it is same in base,
      // so we need to add it back again
      ret.name = this.name;
    }
    return ret;
  };
}



class InPort extends _InOutPortBase {
  constructor(parsed_json, node) {
    super("in", parsed_json, node);
  }
}

class OutPort extends _InOutPortBase {
  constructor(parsed_json, node) {
    super("out", parsed_json, node);
  }
}



class _InOutBase {
  constructor(type, parsed_json, node) {
    this.$type = type;
    this.$node = node;
    _.merge(this, parsed_json);
    // we are going to process and deserialize this.ports 
    this.ports = this.ports || [];
    // concat would return a new array
    var ports = this.ports.concat(this.added_ports || []);
    // set to true to ensure error is thrown for duplicated names
    var ports_index = $hope.array_to_hash(ports, "name", null, true);
    _.forOwn(this.amended_ports, o => {
      $hope.check(ports_index[o.name], "Node", 
        "Loading Node: Failed to amend the port which does't exist", o);
      _.merge(ports_index[o.name], o);
    });
    this.ports = [];
    _.forOwn(ports, p => {
      this.ports.push($hope.create_object(type_mapping[type], p, node));
    });
    this.$ports_index = $hope.array_to_hash(this.ports, "name", null, true);
  }

  $serialize() {
    var ret = $hope.serialize(this, true, 
        ["ports", "added_ports", "amended_ports"]) || {};
    var spec = this.$node.$get_spec();
    spec = spec[this.$type] || {};
    // remove the duplicated primitive
    _.forOwn(ret, (v, k) => {
      if (!_.isObject(k) && v === spec[k]) {
        delete ret[k];
      }
    });
    // we then need to handle the ports
    // TODO handle removed ports in the future
    var added_ports = [], amended_ports = [], removed_ports = [];
    var spec_ports_idx = $hope.array_to_hash(spec.ports || [], "name");
    _.forOwn(this.ports, p => {
      if (!spec_ports_idx[p.name]) {
        added_ports.push($hope.serialize(p));
      } else {
        let temp = p.$serialize_with_diff(spec_ports_idx[p.name]);
        if (temp) {
          amended_ports.push(temp);
        }
      }
    });  
    if (added_ports.length > 0) {
      ret.added_ports = added_ports;
    }
    if (amended_ports.length > 0) {
      ret.amended_ports = amended_ports;
    }
    if (removed_ports.length > 0) {
      ret.removed_ports = removed_ports;
    }
    if (_.size(ret) === 0) {
      ret = undefined;
    }
    return ret;
  }

  $port(name) {
    return this.$ports_index[name];
  };
}




class In extends _InOutBase {
  constructor(parsed_json, node) {
    super("in", parsed_json, node);  
  }
}


class Out extends _InOutBase {
  constructor(parsed_json, node) {
    super("out", parsed_json, node);  
  }
}

_.merge(type_mapping, {
  "in":     InPort,
  "out":    OutPort  
});



//////////////////////////////////////////////////////////////////
// Node
//////////////////////////////////////////////////////////////////

class Node {
  constructor(parsed_json, graph) {
    parsed_json = parsed_json || {};
    this.$graph = graph;
    // default
    _.merge(this, {
      name: "",
      description: "",
      in: {},
      out: {},
      spec: parsed_json.spec    // need this to enable $get_spec
    });

    // load the spec as the template
    var spec = this.$get_spec();
    _.merge(this, spec);
  
    // don't use spec name but description
    this.name = "";

    // but we cannot use the id and type brought by spec
    _.assign(this, {
      id: $hope.uniqueId("NODE_"),
      $type: "node"
    });

    if (!spec.is_ui) {
      var defv = {}, configs = spec.config || [];
      if (_.isArray(spec.extra)) {
        configs = configs.concat(spec.extra);
      }
      _.forEach(configs, cfg => {
        if ("default" in cfg) {
          defv[cfg.name] = cfg.default;
        }
      });
      this.config = defv;
    }

    // overwrite
    _.merge(this, parsed_json);

    if (spec.is_ui) {
      delete this.config;
    }

    this.$binding_ = this.$get_binding();
    this.$styles_ = this.$get_styles();

    // deserialze them
    this.in = new In(this.in, this);
    this.out = new Out(this.out, this);

    this.$lint_result = this.$lint();
  }

  $get_spec() {
    return g_spec_manager.get(this.spec, this.$graph.$specs_index) || {};
  }

  $serialize() {
    var ret = $hope.serialize(this, true) || {};
    var spec = this.$get_spec();
    // remove the duplicated primitive
    _.forOwn(ret, (v, k) => {
      if (_.isEqual(v, spec[k])) {
        delete ret[k];
      }
    });
    if (_.size(ret) === 0) {
      ret = undefined;
    } 
    return ret;
  }


  $get_in_edges() {
    var edges = {};
    _.forOwn(this.in.ports, p => {
      _.assign(edges, p.$get_edges());
    });
    return edges;  
  }

  $get_out_edges() {
    var edges = {};
    _.forOwn(this.out.ports, p => {
      _.assign(edges, p.$get_edges());
    });
    return edges;  
  }

  $get_styles() {
    return this.$graph.styles.nodes[this.id];
  }

  $set_styles(styles) {
    this.$graph.styles.nodes[this.id] = styles;
    this.$styles_ = styles;
  }

  $merge_styles(styles) {
    if (!_.isObject(styles)) {
      return;
    }
    var node_styles = this.$graph.styles.nodes;
    node_styles[this.id] = node_styles[this.id] || {};
    _.merge(node_styles[this.id], styles);
    this.$styles_ = node_styles[this.id];
  }

  $get_position() {
    var styles = this.$get_styles() || {};
    return _.defaults({x: styles.x, y: styles.y}, {x: 0, y: 0});
  }

  $set_position(position) {
    this.$merge_styles(position);
  }



  $get_binding() {
    return this.$graph.bindings[this.id];
  }

  $set_binding(binding) {
    this.$graph.bindings[this.id] = binding;
    this.$binding_ = binding;
  }

  $remove_binding() {
    delete this.$graph.bindings[this.id];
  }

  $remove_styles() {
    delete this.$graph.styles.nodes[this.id];
  }

  $has_tags(type) {
    if (!type) {
      return this.$has_tags("in") || this.$has_tags("out");
    }
    return this[type].tags && this[type].tags.length > 0;
  }

  $add_port(type, attr) {
    var io = this[type];
    $hope.check_warn(io.ports.length + 1 < $hope.config.max_ports_per_side, 
      "Node", "$add_port: too many ports");
    if (!attr.name) {
      for (var i = 1; i < $hope.config.max_ports_per_side; i++) {
        var name = type + i;
        if (!io.$port(name)) {
          attr.name = name;
          break;
        }
      }
      if (!attr.name) {
        return null;
      }
    }
    $hope.check(!io.$ports_index[attr.name], "Node", 
      "$add_port: already exists port:", attr.name);
    var np = $hope.create_object(type_mapping[type], attr, this);
    io.ports.push(np);
    io.$ports_index[attr.name] = np;
    return np;
  }

  $rename_port(type, name, newname) {
    if (name === newname) {
      return;
    }
    $hope.check(newname && newname.length !== 0, "Node", 
      "$rename_port: invalid port name:", newname);
    var io = this[type];
    $hope.check(!io.$ports_index[newname], "Node", 
      "$rename_port: already exists port:", newname);
    var p = io.$ports_index[name];
    delete io.$ports_index[name];
    p.name = newname;
    io.$ports_index[newname] = p;

    // Change the name in groups
    if (io.groups && io.groups.length > 0) {
      _.forEach(io.groups, grp => {
        var idx = grp.ports.indexOf(name);
        if (idx === -1) {
          grp.ports.push(newname);
        }
        else {
          grp.ports[idx] = newname;
        }
      });
    }
  }

  $remove_port(type, name) {
    var io = this[type];
    var p = io.$ports_index[name];
    $hope.check(p, "Node", "$remove_port: non exists port:", name);
    delete io.$ports_index[name];
    _.pull(io.ports, p);
  }

  $clone() {
    var json = this.$serialize();
    delete json.id;

    var tgt = new Node(json, this.$graph);
    var style = this.$get_styles();
    if (!_.isEmpty(style)) {
      style = _.cloneDeep(style);
      if ("x" in style) {
        style.x += 60;
      }
      if ("y" in style) {
        style.y += 60;
      }
      tgt.$styles_ = style;
    }
    var binding = this.$get_binding();
    if (!_.isEmpty(binding)) {
      tgt.$binding_ = _.cloneDeep(binding);
    }
    return tgt;
  }

  $is_added_port(name, type) {
    var io = type || "in";
    var spec = this.$get_spec();
    return !(spec && spec[io] && spec[io].ports && _.findIndex(spec[io].ports, ["name", name]) >= 0);
  }

  $get_name() {
    if (this.name) {
      return this.name;
    }

    var hub, service;
    var binding = this.$get_binding();
    var hub_manager = $hope.app.stores.hub.manager;
    if (binding && binding.type === "fixed") {
      if (binding.hub) {
        hub = hub_manager.get_hub(binding.hub);
        if (hub) {
          service = hub_manager.get_service(binding.hub, binding.thing, binding.service);
        }
      }
    }

    var spec = this.$get_spec();
    return this.name || (service ? service.$name() : "") || spec.name || __("__unknown__");
  }

  $lint() {
    var spec = this.$get_spec();
    if (spec.is_ui || !this.config) {
      return null;
    }

    var errors = [];
    var items = spec.extra ? spec.config.concat(spec.extra) : spec.config;
    _.forOwn(items, i => {
      if (i.required && (!(i.name in this.config) || this.config[i.name] === "")) {
        errors.push({
          type: "REQUIRED_CONFIG",
          name: i.name
        });
      }
    });

    //TODO: other checks


    if (_.isEmpty(errors)) {
      return null;
    }
    return errors;
  }
}


//////////////////////////////////////////////////////////////////
// Edge 
//////////////////////////////////////////////////////////////////

class Edge {
  constructor(parsed_json, graph) {
    this.$graph = graph;
    _.merge(this, {
      id: $hope.uniqueId("EDGE_"),
      $type: "edge"
    });
    _.merge(this, parsed_json || {});
    
    this.$styles_ = this.$get_styles();

    // deserialize the port
    var srcn = graph.$get("node", this.source.node);
    if (!srcn) {
      throw new Error("[Edge] Failed to get source node '" + this.source.node + "' of " + this.id);
    }

    var srcp = this.source.port;
    this.source = srcn.out.$ports_index[srcp];
    if (!this.source) {
      throw new Error("[Edge] Failed to get source port '" + srcp + "' of " + this.id);
    }

    var tgtn = graph.$get("node", this.target.node);
    if (!tgtn) {
      throw new Error("[Edge] Failed to get target node '" + this.target.node + "' of " + this.id);
    }

    var tgtp = this.target.port;
    this.target = tgtn.in.$ports_index[tgtp];
    if (!this.target) {
      throw new Error("[Edge] Failed to get target port '" + tgtp + "' of " + this.id);
    }
  }

  $serialize() {
    var ret = $hope.serialize(this, true, ["source", "target"]) || {};
    ret.source = {
      node: this.source.$node.id,
      port: this.source.name
    };
    ret.target = {
      node: this.target.$node.id,
      port: this.target.name
    };

    return ret;
  }

  $get_styles() {
    return this.$graph.styles.edges[this.id];
  }

  $set_styles(styles) {
    this.$graph.styles.edges[this.id] = styles;
    this.$styles_ = styles;
  }

  $merge_styles(styles) {
    if (!_.isObject(styles)) {
      return;
    }
    var edge_styles = this.$graph.styles.edges;
    edge_styles[this.id] = edge_styles[this.id] || {};
    _.merge(edge_styles[this.id], styles);
    this.$styles_ = edge_styles[this.id];
  }

  $remove_styles() {
    delete this.$graph.styles.edges[this.id];
  }
}




//////////////////////////////////////////////////////////////////
// Tag
//////////////////////////////////////////////////////////////////


class Tag {
  constructor(parsed_json, graph) {
    this.$graph = graph;
    // TODO: ensure unused name is taken
    _.merge(this, {
      type: "batch",
      id: $hope.uniqueId("TAG_"),
      name: "A",
      $type: "tag"
    });
    _.merge(this, parsed_json || {});
  }

  /*
  $serialize() {
  }
  */
}



//////////////////////////////////////////////////////////////////
// Graph
//////////////////////////////////////////////////////////////////

export default class Graph {
  constructor(parsed_json) {
    parsed_json = parsed_json || {};
    // default
    _.merge(this, {
      version         : "1.0.0",
      type            : "graph",
      id              : $hope.uniqueId("GRAPH_"),
      name            : "anonymous",
      description     : "",
      timestamp       : $hope.timestamp(),
      specs           : [],
      styles          : {nodes: {}, edges: {}},
      bindings        : {}
    });

    _.merge(this, parsed_json);

    this.$specs_index = $hope.array_to_hash(this.specs, "id");

    var self = this;

    // deserialize the entities
    function _load_graph_array_items(type) {
      var key = type + "s";
      var items = (parsed_json.graph && parsed_json.graph[key]) || [];
      self[key] = [];
      for (var i = 0; i < items.length; i++) {
        try {
          self[key].push($hope.create_object(type_mapping[type], items[i], self));
        }
        catch(e) {
          console.log(e);
          $hope.notify("error", e.message);
        }
      }
      // throw error for duplicated ids
      self["$" + key + "_index"] = $hope.array_to_hash(self[key], "id", null, true);
    }

    _load_graph_array_items("node");
    _load_graph_array_items("edge");
    _load_graph_array_items("tag");
  
  }


  $serialize() {
    // set to true to avoid recurisive invoking of serialize
    var ret = $hope.serialize(this, true, ["nodes", "edges", "tags"]) || {};
    if (!ret.graph) {
      ret.graph = {};
    }
    ret.graph.nodes = $hope.serialize(this.nodes);
    ret.graph.edges = $hope.serialize(this.edges);
    ret.graph.tags = $hope.serialize(this.tags);
    return ret;
  }

  //----------------------------------------------------------------
  // Get By Ref (thus able to update directly)
  // type could be "node", "edge", "tag"
  //----------------------------------------------------------------
  $get(type, id) {
    var index = this["$" + type + "s_index"];
    if (index) {
      return index[id];
    }
  }


  $is_empty() {
    return this.nodes.length === 0;
  }

  //----------------------------------------------------------------
  // Create / Remove
  //----------------------------------------------------------------
  

  // Factory methods
  //    type could be "node", "edge", "tag"
  //    data is an object for constructor
  //    styles and bindings are optional, for this node/edge etc.
  // return the created stuff
  $create(type, data, styles, binding) {
    data = data || {};
    if (data.id) {
      $hope.check(this.$get(type, data.id), "Graph/create", "type:", type,
        "data:", data, "to be created already exist");
    }
    var key = type + "s";
    var o = $hope.create_object(type_mapping[type], data, this);
    this[key].push(o);
    this["$" + key + "_index"][o.id] = o;
    if (type === "node" || type === "edge") {
      if (styles) {
        o.$set_styles(styles);
      }
      if (binding) {
        o.$set_binding(binding);
      }
    }
    return o;
  }


  // return the removed obj
  $remove(type, id) {
    $hope.check(_.includes(["node", "edge", "tag"], type),
      "Graph/remove", "Such type doesn't support remove: ", type);
    var key = type + "s";
    var ret = this["$" + key + "_index"][id];
    if (ret) {
      _.remove(this[key], o => o.id === id);
      delete this["$" + key + "_index"][id];

      if (ret.$remove_styles) {
        // remove additional info
        ret.$remove_styles();
      }

      if (type === "node") {
        ret.$remove_binding();
      }
    }
    return ret;
  }


  // add the already created obj (maybe removed just now)
  $add(o) {
    $hope.check(_.includes(["node", "edge", "tag"], o.$type),
      "Graph/add", "Such type doesn't support add: ", o);
    var key = o.$type + "s";
    $hope.check(!this["$" + key + "_index"][o.id], "Graph/add",
      "The object to add is already added", o);
    this[key].push(o);
    this["$" + key + "_index"][o.id] = o;

    if(o.$binding_) {
      o.$set_binding(o.$binding_);
    }
    if(o.$styles_) {
      o.$set_styles(o.$styles_);
    }
  }

  $find_edge(src, tgt) {
    var edges = this.edges;
    var arr = [];
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (e.source === src && e.target === tgt) {
        return e;
      }
      if ((e.source === src && !tgt) || (!src && e.target === tgt)) {
        arr.push(e);
      }
    }
    return src && tgt ? null : arr;
  }


  get_all_hub_ids_used() {
    return Graph.get_all_hub_ids_used(this);
  }

  get_all_spec_ids_used() {
    return Graph.get_all_spec_ids_used(this);
  }

  has_linter_error() {
    var err = false;

    _.forEach(this.nodes, node => {
      if (!_.isEmpty(node.$lint_result)) {
        err = true;
        return false;
      }
    });
    return err;
  }

  //----------------------------------------------------------------
  // Static Methods
  //----------------------------------------------------------------

  static create(initial_data) {
    return new Graph(_.merge({}, initial_data));
  }

  // This collects all spec ids used by a g,
  // it could be the graph_json or a Graph object as they
  // share similar data hierarchy (due to _.merge)
  static get_all_spec_ids_used(g) {
    var ids = [];
    if (!g.graph || !g.graph.nodes) {
      return ids;
    }
    _.forOwn(g.graph.nodes, n => {
      if (n.spec) {
        ids.push(n.spec);
      }
    });
    return _.uniq(ids);
  }

  static get_all_hub_ids_used(g) {
    var ids = [];
    if (!g.bindings) {
      return ids;
    }
    _.forOwn(g.bindings, b => {
      if (b.type === "fixed" && b.hub) {
        ids.push(b.hub);
      }
    });
    return _.uniq(ids);
  }

}

_.merge(type_mapping, {
  "node":   Node,
  "edge":   Edge,
  "tag":    Tag
});