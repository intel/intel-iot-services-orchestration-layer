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
import {OverlayTrigger, Popover} from "react-bootstrap";

export default class LeftToolbar extends ReactComponent {

  _on_save() {
    $hope.confirm("Save to Server", 
      "This would overwrite the UI deployed on the server. Please make sure this is what you expect!",
      "warning", () => {
      $hope.trigger_action("ui/save", {});
    });

  }

  _on_trash() {
    var view = $hope.app.stores.ui.active_view;
    if (view) {
      $hope.trigger_action("ui/remove/selected", {ui_id: view.id});
    }
  }

  render() {
    var selected = false;
    var view = $hope.app.stores.ui.active_view;

    if (view) {
      selected = view.has_selections();
    }

    return (
      <div className="hope-left-toolbar"> 
        <OverlayTrigger trigger="hover" rootClose overlay={<Popover>Click to save the UI</Popover>}>
          <i onClick={this._on_save} className="fa fa-floppy-o"></i>
        </OverlayTrigger>
        <OverlayTrigger trigger="hover" rootClose overlay={<Popover>Click to delete the selected widgets</Popover>}>
          <i onClick={this._on_trash} className={"fa fa-trash-o" + (selected ? "" : " disabled")}></i>
        </OverlayTrigger>
      </div>
    );
  }
}

