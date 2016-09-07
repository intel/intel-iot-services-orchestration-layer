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
import Tbb from "../common/toolbar_button.x";

export default class LeftToolbar extends ReactComponent {

  _on_home() {
    var view = $hope.app.stores.ui.active_view;
    var app = view && view.get_app();
    if (app && app.main_ui !== view.id) {
      app.main_ui = view.id;
      $hope.trigger_action("app/update/app", {
        id: app.id,
        props: {
          main_ui: view.id
        }
      });
      this.forceUpdate();
    }
  }

  _on_save() {
    var view = $hope.app.stores.ui.active_view;
    if (view.get_ui().has_linter_error()) {
      $hope.confirm(__("Save to Server"),
        __("This UI looks like contain error(s), are you sure to deploy it on the server?"),
        "warning", res => {
        if (!res) {
          $hope.trigger_action("ui/save", {});
        }
      }, {
        cancelButtonText: __("Save"),
        confirmButtonText: __("Cancel and back to edit")
      });
    }
    else {
      $hope.confirm(__("Save to Server"),
        __("This would overwrite the UI deployed on the server. Please make sure this is what you expect!"),
        "warning", () => {
        $hope.trigger_action("ui/save", {});
      });
    }
  }

  _on_trash() {
    var view = $hope.app.stores.ui.active_view;
    if (view) {
      $hope.trigger_action("ui/remove/selected", {ui_id: view.id});
    }
  }

  render() {
    var home = true;
    var modified = false;
    var selected = false;
    var view = $hope.app.stores.ui.active_view;

    if (view) {
      home = view.get_app() && view.get_app().main_ui === view.id;
      modified = view.modified;
      selected = view.has_selections();
    }

    return (
      <div className="hope-left-toolbar"> 
        <Tbb icon="home" tips={__("Click to set this UI as home")} enabled={!home} onClick={this._on_home} />
        <Tbb icon="floppy-o" tips={__("Click to save the UI")} enabled={modified} onClick={this._on_save} />
        <Tbb icon="trash-o" tips={__("Click to delete the selected widgets")} enabled={selected} onClick={this._on_trash} />
      </div>
    );
  }
}

