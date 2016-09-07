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
var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/nodered_app");
var check = B.check;

var App = require("./app.js");


exports.remove_unused_nr_config_node = function(graph, specs_list) {
  var specs = _.keyBy(specs_list, "id");
  var used_nodes = [];
  var unused_nodes = graph.graph.nodes;
  var append_nodes = _.remove(unused_nodes, function(node) {
    if(_.isUndefined(node.config)) {
      return true;
    }
    if(node.config._nr && node.config._nr.category === "config") {
      return false;
    }
    return true;
  });
  used_nodes = used_nodes.concat(append_nodes);
  var changed = true;
  while(changed) {
    changed = false;
    append_nodes = _.remove(unused_nodes, function(node) {
      var nodeid = node.id;
      var matched = false;
      used_nodes.forEach(function(item) {
        var spec = specs[item.spec];
        if (!spec || !spec.config) {
          return;
        }
        spec.config.forEach(function(conf) {
          if(conf.ref_config_node && item.config[conf.name] === nodeid) {
            log("find the matched config node", node.id, item);
            matched = true;
            changed = true;
          }
        });
      });
      return matched;
    });
    used_nodes = used_nodes.concat(append_nodes);
  }
  log("unused config node:", unused_nodes);
  graph.graph.nodes = used_nodes;
  var node_obj = _.keyBy(unused_nodes, "id");
  var bindings = {};
  _.forEach(graph.bindings, function(v, k) {
    if(!node_obj[k]) {
      bindings[k] = v;
    }
  });
  graph.bindings = bindings;
  return graph;
};

















exports.add_nodered_graph$ = function(nr_graph, builtinhub_id, em, changed_list) {
  log("add nodered graph", nr_graph);
  return convert_graph_from_nodered$(nr_graph, builtinhub_id, em)
  .then(function(hope_graph) {
    return App.add_graph$(hope_graph, em, changed_list);
  });
};


function convert_graph_from_nodered$(nr_graph, builtinhub_id, em) {
  var flow_list = nr_graph.nr_flow;
  flow_list = flat_flow_with_subflow(flow_list);
  var hope_graph = {};
  hope_graph.id = nr_graph.id;
  hope_graph.name = nr_graph.name;
  hope_graph.type = "graph";
  hope_graph.description = "";
  hope_graph.specs = [];
  hope_graph.styles = {
    nodes:{},
    edges:{}
  };
  hope_graph.bindings = {};
  hope_graph.graph = {
    nodes:[],
    edges:[],
    tags:[]
  };
  hope_graph.app = nr_graph.app;
  hope_graph.timestamp = Date.now();
  var tasks = [];
  flow_list.forEach(function(item) {
    tasks.push(_process_item_in_nr_flow$(item));
  });
  return Promise.all(tasks).then(function() {
    return hope_graph;
  });

  function _process_item_in_nr_flow$(item) {
    var itemcp = _.cloneDeep(item);
    //delete itemcp.id;
    //delete itemcp.type;
    delete itemcp.x;
    delete itemcp.y;
    //delete itemcp.z;
    delete itemcp.outputs;
    delete itemcp.wires;
    // edges
    if(item.wires) {
      item.wires.forEach(function(wires_in_port, portnum) {
        wires_in_port.forEach(function(wire) {
          var edge  = {
            id: B.unique_id("EDGE_NR_"),
            source: {
              node: item.id,
              port: "out" + (portnum + 1)
            },
            target: {
              node: wire,
              port: "in1"
            }
          };
          hope_graph.graph.edges.push(edge);
        });
      });
    }
    // nodes
    var node = {
      id: item.id,
      spec: item.type + "_noderedspec",
      config: {}
    };
    _.forEach(itemcp, function(value, key) {
      node.config[key] = value;
    });

    //spec.nr
    return em.spec_store.get_with_lock$(node.spec,
      function(spec) {
        if(_.isUndefined(spec)) {
          log.warn("the spec doesn't exist ", node.spec);
          node.spec = "unknown_noderedspec";
        } else {
          node.config["_nr"] = spec.nr;
          node.config._nr.id = node.config.id;
          node.config._nr.z = node.config.z;
        }
    })
    .then(function() {
      if (parseInt(item.outputs) > 1) {
        node.out = {
          added_ports : []
        };
        for(var o = 1; o < parseInt(item.outputs); o++) {
          var new_out = {
            name: "out" + ( o + 1 )
          };
          node.out.added_ports.push(new_out);
        }
      }
      hope_graph.graph.nodes.push(node);

      // bindings
      hope_graph.bindings[item.id] = {
        type:"fixed",
        thing:"nodered@" + builtinhub_id,
        hub:builtinhub_id,
        service: item.type + "_noderedservice"
      };

      // styles
      hope_graph.styles.nodes[item.id] = {
        x: item.x,
        y: item.y
      };
    });


  }

}



function flat_flow_with_subflow(flow_list) {
  var sbi_re = /subflow:(.*)/;
  var context_obj = {};
  var items_in_tab = [];
  flow_list.forEach(function(item) {
    if(item.type === "tab" || item.type === "subflow") {
      context_obj[item.id] = item;
      context_obj[item.id].child = {};
    } else {
      if(item.z === "" || context_obj[item.z].type === "tab") {
        items_in_tab.push(item);
      } else if (context_obj[item.z].type === "subflow") {
        context_obj[item.z].child[item.id] = item;
      } else {
        check(false, "unknown context", item);
      }
    }
  });

  for(var index = 0; index < items_in_tab.length; index++) {
    var item = items_in_tab[index];
    var m = sbi_re.exec(item.type);
    if(m) {
      var sbid = m[1];
      var sb_context = _.cloneDeep(context_obj[sbid]);
      _.forEach(sb_context.child, function(item_in_the_sf, id) {
        item_in_the_sf.id = id + "@" + item.id;
        item_in_the_sf.z = item.id;
        item_in_the_sf.wires.forEach(function(wires, i) {
          wires.forEach(function(wire, j) {
            item_in_the_sf.wires[i][j] = item_in_the_sf.wires[i][j] + "@" + item.id;
          });
        });
        sb_context.out.forEach(function(out_in_sb, i) {
          out_in_sb.wires.forEach(function(out_wire) {
            if(out_wire.id == id) {
              item_in_the_sf.wires[i] = item_in_the_sf.wires[i].concat(item.wires[out_wire.port]);
            }
          });
        });
        items_in_tab.push(item_in_the_sf);
      });
      items_in_tab.splice(index, 1);
      index--;

      items_in_tab.forEach(function(_item) {
        _item.wires.forEach(function(wires_in_port, portnum) {
          wires_in_port.forEach(function(wire, i) {
            if(wire === item.id) {
              wires_in_port.splice(i, 1);
              var added_wire = [];
              sb_context.in.forEach(function(sb_in) {
                sb_in.wires.forEach(function(in_id) {
                  added_wire.push(in_id.id + "@" + item.id);
                });
              });
              sb_context.out.forEach(function(out_in_sb, j) {
                out_in_sb.wires.forEach(function(out_wire) {
                  if(out_wire.id == sbid) {
                    added_wire = added_wire.concat(item.wires[j]);
                  }
                });
              });
              _item.wires[portnum] = wires_in_port.concat(added_wire);
            }
          });
        });

      });
    }
  }

  return items_in_tab;
}