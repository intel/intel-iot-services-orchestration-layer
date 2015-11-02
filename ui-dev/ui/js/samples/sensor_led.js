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



var graph = {
  // basic metas
  version: "1.0.0",       // the version of parser would use
  type: "graph",
  
  id: "an_unique_id_sensor_led",
  name: "Test Graph for Sensor and LED",
  description: "light sensor --> LED",
  timestamp: 1234567890,

  // this is the one that Workflow Engine needs
  graph: {
    nodes: [{
      id: "node_id_1",
      spec: "spec_id_1",
      name: "My Light Sensor",    // this one overwrites it in spec
      description: "this one overwrites it in spec"
    }, {
      id: "node_id_2",
      spec: "spec_id_2"
    }],

    edges: [{
      id: "edge_id_1",
      source: {
        node: "node_id_1",
        port: "dark"
      },
      target: {
        node: "node_id_2",
        port: "on"
      }
    }]
  },

  bindings: {
    node_id_1: {
      type: "fixed",
      value: "hub_id_1"
    }
  },

  // this stores the customized style adjustments
  styles: {
    nodes: {
      node_id_1: {
        x: 100,
        y: 100,
        icon: "cloud",
        color: 7,
        out_ports: {
          "dark": {
            color: 12
          }
        }
      },
      node_id_2: {
        x: 200,
        y: 200,
        icon: "lightbulb-o",
        in_ports: {
          "on": {
            color: 6
          }
        }
      }
    },
    edges: {
      edge_id_1: {
        color: 9
      }
    }
  }

};

module.exports = JSON.stringify(graph);