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
//
// See B01 of <HOPE Graph> Request and Response
// 
// 
// FOR IDs
// IDs of spec, Node, and Edge are universal, e.g. may use UUID etc.
// Other ids would only be unique inside the graph for now temporarily. The 
// major reason is that UUID etc. is too long and make it hard to read
// the graph manually and debug
// 
// 

var graph = {
  type: "graph",
  version: "1.0.0",       
  id: "an_unique_id_req_res",
  name: "Request Response",
  description: "handling http request, with batch tags etc.",
  timestamp: 1234567890,


  // this is the one that Workflow Engine needs
  graph: {
    tags: [{
        id: "tag_id_1",
        type: "batch",
        name: "A"
      }, {
        id: "tag_id_2",
        type: "batch",
        name: "B"
    }],
    nodes: [{
      id: "node_request_id",
      spec: "spec_request_id",
      out: {
        tags: [{
          ref: "tag_id_1",
          ports: ["ip", "data"]
        }]
      }
    }, {
      id: "node_merge_id_1",
      spec: "spec_merge_id",
      in: {               // this adds more ports upon default
        added_ports: [{             
          name: "ip",
          type: "string",    
          buffered: true
        }, {
          name: "data",
          type: "string",    
          buffered: true
        }],
        groups: [{
          id: "group_id_1",
          ports: ["ip", "data"]
        }],
        tags: [{
          ref: "tag_id_1",
          groups: ["group_id_1"]
        }]
      },
      out: {               // this adds more ports upon default
        tags: [{
          ref: "tag_id_2",
          ports: ["out"]
        }]
      }
    }, {
      id: "node_merge_id_2",
      spec: "spec_merge_id",
      in: {               // this adds more ports upon default
        added_ports: [{             
          name: "ip",
          type: "string",    
          buffered: true
        }, {
          name: "data",
          type: "string",    
          buffered: true
        }],
        groups: [{
          id: "group_id_5",
          ports: ["ip", "data"]
        }],
        tags: [{
          ref: "tag_id_1",
          groups: ["group_id_5"]
        }]
      },
      out: {               // this adds more ports upon default
        tags: [{
          ref: "tag_id_2",
          ports: ["out"]
        }]
      }
    }, {
      id: "node_ip_process_id_1",
      spec: "spec_ip_process_id",
    }, {
      id: "node_ip_process_id_2",
      spec: "spec_ip_process_id",
    }, {
      id: "node_data_process_id_1",
      spec: "spec_data_process_id",
    }, {
      id: "node_data_process_id_2",
      spec: "spec_data_process_id",
    }, {
      id: "node_response_id",
      spec: "spec_response_id",
      in: {
        // this overwrites some properties in spec
        // NOTE: may need throw warning or even exception if name is overwritten
        // because the kernel function may use IN.xx_name so it would fail
        // if name is overwritten
        amended_ports: [{      
          name: "ip",
          buffered: true
        }, {
          name: "data",
          buffered: true
        }],
        groups: [{
          id: "group_id_9",
          ports: ["ip", "data"]
        }],
        tags: [{
          ref: "tag_id_2",
          groups: ["group_id_9"]
        }]
      }
    }],


    edges: [{
      id: "edge_id_1",
      source: {
        node: "node_request_id",
        port: "ip"
      },
      target: {
        node: "node_merge_id_1",
        port: "ip"
      }
    }, {
      id: "edge_id_2",
      source: {
        node: "node_request_id",
        port: "data"
      },
      target: {
        node: "node_merge_id_1",
        port: "data"
      }
    }, {
      id: "edge_id_3",
      source: {
        node: "node_request_id",
        port: "ip"
      },
      target: {
        node: "node_merge_id_2",
        port: "ip"
      }
    }, {
      id: "edge_id_4",
      source: {
        node: "node_request_id",
        port: "data"
      },
      target: {
        node: "node_merge_id_2",
        port: "data"
      }
    }, {
      id: "edge_id_5",
      // this extracts one field 
      field: "ip",
      description: "only sends the IP of merged data",
      source: {
        node: "node_merge_id_1",
        port: "out"
      },
      target: {
        node: "node_ip_process_id_1",
        port: "ip"
      }
    }, {
      id: "edge_id_6",
      field: "data",
      source: {
        node: "node_merge_id_1",
        port: "out"
      },
      target: {
        node: "node_data_process_id_1",
        port: "data"
      }
    }, {
      id: "edge_id_7",
      field: "ip",
      source: {
        node: "node_merge_id_2",
        port: "out"
      },
      target: {
        node: "node_ip_process_id_2",
        port: "ip"
      }
    }, {
      id: "edge_id_8",
      field: "data",
      source: {
        node: "node_merge_id_2",
        port: "out"
      },
      target: {
        node: "node_data_process_id_2",
        port: "data"
      }
    }, {
      id: "edge_id_9",
      source: {
        node: "node_ip_process_id_1",
        port: "ip"
      },
      target: {
        node: "node_response_id",
        port: "ip"
      }
    }, {
      id: "edge_id_10",
      source: {
        node: "node_data_process_id_1",
        port: "data"
      },
      target: {
        node: "node_response_id",
        port: "data"
      }
    }, {
      id: "edge_id_11",
      source: {
        node: "node_ip_process_id_2",
        port: "ip"
      },
      target: {
        node: "node_response_id",
        port: "ip"
      }
    }, {
      id: "edge_id_12",
      source: {
        node: "node_data_process_id_2",
        port: "data"
      },
      target: {
        node: "node_response_id",
        port: "data"
      }
    }]
  },

  bindings: {
    node_request_id: {
      type: "fixed",
      hub: "unique_hub_id_2"
    },
    node_merge_id_1: {
      type: "fixed",
      hub: "unique_hub_id_1"
    },
    node_ip_process_id_1: {
      type: "fixed",
      hub: "unique_hub_id_1"
    }
  },


  // this stores the customized style adjustments
  styles: {
    theme: "molokai",
    nodes: {
      node_request_id: {
        x: 200,
        y: 300
      }, 
      node_merge_id_1: {
        x: 400,
        y: 150
      },
      node_merge_id_2: {
        x: 400,
        y: 450
      },
      node_ip_process_id_1: {
        x: 600,
        y: 80,
        color: 6
      },
      node_data_process_id_1: {
        x: 600,
        y: 220,
        color: 6
      },
      node_ip_process_id_2: {
        x: 600,
        y: 380,
        color: 6
      },
      node_data_process_id_2: {
        x: 600,
        y: 520,
        color: 6
      },
      node_response_id: {
        x: 800,
        y: 300
      }
    }

  }

};


module.exports = JSON.stringify(graph);