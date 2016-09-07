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
  "ui/set_active":       null,   // {ui_id: ...}, it would fetch json and load it from server if not in store yet
  "ui/add_widget":       null,   // {ui_id: ..., widget: ...}
  "ui/change_widgets":   null,  // {ui_id: ..., widgets: [...]}
  "ui/save":             null,  // {}
  "ui/close":            null,  // {ui_id: ...}
  "ui/remove":           null,  // {uis: [...]}
  "ui/send_data":        null,  // {ui_id: ..., id: widget_id, data: {...}}
  "ui/unselect/all":     null,   // {ui_id: ...}
  "ui/select/widget":    null,   // {ui_id: ..., id: widget_id, is_multiple_select: ...}
  "ui/unselect/widget":  null,   // {ui_id: ..., id: widget_id}
  "ui/remove/selected":  null,   // {ui_id: ...}
  "ui/remove/widget":    null    // {ui_id: ..., id: ...}
});