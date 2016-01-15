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
import Overlay from "../overlay.x";

export default class LeftToolbar extends ReactComponent {

  _on_change_theme() {
    var theme = $hope.app.stores.ide.theme === "hope-theme-dark" ? 
                            "hope-theme-light" : "hope-theme-dark";
    $hope.trigger_action("ide/change/theme", {theme: theme});
  }

  _on_trash() {
    var view = $hope.app.stores.graph.active_view;
    $hope.trigger_action("graph/remove/selected", {graph_id: view.id});
  }

  _on_undo() {
    var view = $hope.app.stores.graph.active_view;
    $hope.trigger_action("graph/undo", {graph_id: view.id});
  }

  _on_redo() {
    var view = $hope.app.stores.graph.active_view;
    $hope.trigger_action("graph/redo", {graph_id: view.id});
  }

  _on_save() {
    $hope.confirm(__("Save to Server"),
      __("This would create or overwrite the workflow deployed on the server. Please make sure this is what you expect!"),
      "warning", () => {
      $hope.trigger_action("graph/save", {});
    });
    //$hope.trigger_action("ide/show/code",
    //  {code: JSON.stringify(view.graph.$serialize(), null, "\t")});
  }

  _on_fit() {
    var view = $hope.app.stores.graph.active_view;
    $hope.trigger_action("graph/fit", {graph_id: view.id});
  }

  _on_autolayout() {
    var view = $hope.app.stores.graph.active_view;
    $hope.trigger_action("graph/autolayout", {graph_id: view.id});
  }

  _on_click_library() {
    $hope.app.stores.ide.toggle_library();
  }

  _on_run() {
    var view = $hope.app.stores.graph.active_view;

    if (view.modified) {
      $hope.confirm(__("Save and Run"), 
        __("This would create or overwrite the workflow deployed on the server. Please make sure this is what you expect!"),
        "warning", () => {
        $hope.trigger_action("graph/save_and_start", {});
      });
    }
    else {
      $hope.trigger_action("graph/start", {
        graphs: [view.id],
        tracing: true
      });
    }
  }

  _on_stop() {
    var view = $hope.app.stores.graph.active_view;

    if (view.is_debugging()) {
      $hope.trigger_action("graph/stop_replay", {});
    }
    else {
      $hope.trigger_action("graph/stop", {
        graphs: [view.id]
      });
    }
  }

  _on_step(type) {
    var view = $hope.app.stores.graph.active_view;
    $hope.trigger_action("graph/step", {graph_id: view.id, type: type});
  }

  render() {
    var undo_stack_len = 0;
    var undo_times = 0;
    var selected = false;
    var view = $hope.app.stores.graph.active_view;
    var panel = $hope.app.stores.ide.panel;

    if (!view) {
      return <div className="hope-left-toolbar" />;
    }

    if (view) {
      selected = view.has_selections();
      undo_stack_len = view.undo_stack.length;
      undo_times = view.undo_times;

      if (view.is_running()) {
        return (
          <div className="hope-left-toolbar">
            <Overlay overlay={__("Click to stop the workflow")}>
              <i onClick={this._on_stop} className="fa fa-stop" />
            </Overlay>
          </div>
        );
      }

      if (view.is_debugging()) {
        var logs = view.$logs;
        var idx = view.$logidx || 0;
        var len = logs ? logs.length : 0;
        return (
          <div className="hope-left-toolbar">
            <Overlay overlay={__("Click to stop the workflow")}>
              <i onClick={this._on_stop} className="fa fa-circle-o-notch" />
            </Overlay>
            <Overlay overlay={__("Continue")}>
              <i onClick={this._on_step.bind(this, "go")} className={"fa fa-arrow-circle-right" + (view.is_auto_replaying() ? " disabled" : "")} />
            </Overlay>
            <Overlay overlay={__("Step forward")}>
              <i onClick={this._on_step.bind(this, "step")} className={"fa fa-step-forward" + (logs && idx < len - 1 ? "" : " disabled")} />
            </Overlay>
            <Overlay overlay={__("Step backward")}>
              <i onClick={this._on_step.bind(this, "back")} className={"fa fa-step-backward" + (logs && idx > 0 ? "" : " disabled")} />
            </Overlay>
            <Overlay overlay={__("Back to the beginning")}>
              <i onClick={this._on_step.bind(this, "begin")} className={"fa fa-fast-backward" + (logs && idx !== 0 ? "" : " disabled")} />
            </Overlay>
          </div>
        );
      }
    }

    return (
      <div className="hope-left-toolbar">
        <Overlay overlay={__("Click to show or hide the library")}>
          <i onClick={this._on_click_library} className={"fa fa-list" + (panel.library.visible ? " disabled" : "")} />
        </Overlay>
        <Overlay overlay={__("Click to run the workflow")}>
          <i onClick={this._on_run} className="fa fa-play" />
        </Overlay>
        <Overlay overlay={__("Click to save the workflow")}>
          <i onClick={this._on_save} className={"fa fa-floppy-o" + (view && view.modified ? "" : " disabled")} />
        </Overlay>
        <Overlay overlay={__("Click to delete the selected objects")}>
          <i onClick={this._on_trash} className={"fa fa-trash-o" + (selected ? "" : " disabled")} />
        </Overlay>
        <Overlay overlay={__("Undo")}>
          <i onClick={this._on_undo} className={"fa fa-undo" + (undo_stack_len <= undo_times ? " disabled" : "")} />
        </Overlay>
        <Overlay overlay={__("Redo")}>
          <i onClick={this._on_redo} className={"fa fa-repeat" + (undo_times === 0 ? " disabled" : "")} />
        </Overlay>
        <Overlay overlay={__("Click to fit the view")}>
          <i onClick={this._on_fit} className={"fa fa-arrows-alt"} />
        </Overlay>
        <Overlay overlay={__("Click to auto layout the workflow")}>
          <i onClick={this._on_autolayout} className={"fa fa-sitemap"} />
        </Overlay>
        <Overlay overlay={__("Click to change theme")}>
          <i onClick={this._on_change_theme} className="fa fa-cog" />
        </Overlay>
      </div>
    );
  }
}

