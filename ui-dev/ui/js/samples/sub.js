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
// FOR IDs
// IDs of spec, Node, and Edge are universal, e.g. may use UUID etc.
// Other ids would only be unique inside the graph for now temporarily. The 
// major reason is that UUID etc. is too long and make it hard to read
// the graph manually and debug


var specs = [
  {
    id: "spec_id_1",
    type: "spec",
    catalog: "/sensor/light",
    name: "Light Sensor",
    description: "a light sensor",
    out: {
      ports: [{             // use an array as we need its order for rendering
        name: "dark",
        type: "boolean",      // type of payload in the message
        description: "emits true / false when it turns dark / bright"
      }],
    }
  },

 {
    id: "spec_id_2",
    type: "spec",
    catalog: "/light/LED",
    name: "LED",
    description: "a LED",
    in: {
      ports: [{
        name: "on",
        type: "boolean",
        description: "true -> on, false -> off",
        default: false,               // default value of this port
        buffered: false,              // buffered or not?
        // Forbid user to change? Use disable here, so if this isn't defined
        // in spec, corresponding values are undefined which means "enabled"
        // by default
        customizations_disabled: {    
          buffered: false,
          no_trigger: false,
          be_grouped: false
        }
      }]
    }
  }
];


// TBD: my rough thought is that sub graph may has its own styles (although maybe
// overwritten). But do we allow sub graph to has its own bindings?
var subs = [{
  id: "sub_graph_id",
  nodes: [{
    id: "node_id_100",
    spec: "spec_id_2",
    name: "LED in sub",
    in: {
      amended_ports: {
        "on": {         // export this to be visible to external
          exported: "exported_on"   // need to check name conflict
        }
      }
    }
  }],
  edges: [] 
}];

var graph = {
  // basic metas
  version: "1.0.0",       // the version of parser would use
  type: "graph",
  
  id: "an_unique_id",
  description: "light sensor --> LED",
  timestamp: 1234567890,

  // built-in specs. Graph loader would lookup this first, and query from
  // other places for a spec if cannot find it here
  specs: specs,     

  // reference lookup here first, then other places
  subgraphs: subs,

  // this is the one that Workflow Engine needs
  graph: {
    nodes: [{
      id: "node_id_1",
      spec: "spec_id_1",
      name: "My Light Sensor",    // this one overwrites it in spec
      description: "this one overwrites it in spec"
    }, {
      id: "node_id_2",
      is_subgraph: true,
      ref: "sub_graph_id"
    }],

    edges: [{
      id: "edge_id_1",
      source: {
        node: "node_id_1",
        port: "dark"
      },
      target: {
        node: "node_id_2",
        port: "exported_on"     // NOTE that we use the exported name here
      }
    }]
  }

};

module.exports = JSON.stringify(graph);
