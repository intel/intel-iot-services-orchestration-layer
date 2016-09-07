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

// As we may allow multiple graphs in the system
// So to operate the graph, the params of Action should have a field
// called as graph_id to indicate which graph is targetting

$hope.register_action({         // params of Action
  "graph/set_active":       null,   // {graph_id: ...}, it would fetch json and load it from server if not in store yet
  "graph/close":            null,   // {graph_id: ...}
  "graph/save":             null,   // {}
  "graph/remove":           null,   // {graphs: ...}
  "graph/start":            null,   // {graphs: ..., tracing: ...}
  "graph/save_and_start":   null,   // {}
  "graph/stop_replay":      null,   // {}
  "graph/stop":             null,   // {graphs: ...}
  "graph/replay":           null,   // {graphs: ...}
  "graph/step":             null,   // {graphs: ...}

  "graph/undo":         null,   // {graph_id: ...}
  "graph/redo":         null,   // {graph_id: ...}
  "graph/copy":         null,   // {graph_id: ...}
  "graph/paste":        null,   // {graph_id: ...}

  "graph/move":         null,   // {graph_id:..., ddx: ..., ddy: ..., phase: ...}
                                // phase is start, ongoing, end
  "graph/zoom":         null,   // {graph_id:..., ratio: ..., x: ..., y: ...}
                                // will keep the point under (x, y) remains unchanged after zoom
  "graph/fit":          null,   // let it fit and in center of the window {graph_id: ...}
  "graph/autolayout":   null,   // autolayout the nodes and then fit {graph_id: ...}

  "graph/create/node":  null,   // {graph_id:...,  node: {...}, styles: {...}, binding: {...}}
  "graph/remove/node":  null,   // {graph_id: ..., id: node_id}
  "graph/change/node":  null,   // {graph_id: ..., id: node_id, data: ...}

  // although move is also kind of styles changes, we specifically make it as 
  // an action, this makes params easier, and also brings optimization potential
  "graph/move/node":    null,   // This simply moves the node, dx, dy as the delta
                                // {graph_id: ..., id: node_id, dx: ..., dy: ..., phase: ...}
  "graph/merge_styles/node":  null,   // This merges the styles
                                // {graph_id: ..., id: node_id, styles: {...}}
  "graph/resize/node":  null,   // This simply changes the size of the node
                                // {graph_id: ..., id: node_id, size: {...}}

  "graph/create/edge":  null,   // {graph_id: ..., edge: {...}}
  "graph/remove/edge":  null,   // {graph_id: ..., id: edge_id}
  "graph/change/edge":  null,   // {graph_id: ..., id: node_id, edge: {...}}

  "graph/merge_styles/edge":  null,   // This merge the styles
                                // {graph_id: ..., id: node_id, styles: {...}}

  // selection related
  "graph/unselect/all": null,   // {graph_id: ...}
  "graph/select/node":  null,   // {graph_id: ..., id: node_id, is_multiple_select: ...}
  "graph/unselect/node":null,   // {graph_id: ..., id: node_id}
  "graph/select/edge":  null,   // {graph_id: ..., id: edge_id, is_multiple_select: ...}
  "graph/unselect/edge":null,   // {graph_id: ..., id: edge_id}
  "graph/remove/selected": null, // {graph_id: ...}
  "graph/select/port":  null,   // {graph_id: ..., id: node_id, name: port_name, type: port_type}

  "graph/animate/edge": null,   // {graph_id: ..., id: edge_id}
  "graph/unanimate/edge": null, // {graph_id: ..., id: edge_id}
  "graph/animate/node": null,   // {graph_id: ..., id: node_id}
  "graph/unanimate/node": null  // {graph_id: ..., id: node_id}
});