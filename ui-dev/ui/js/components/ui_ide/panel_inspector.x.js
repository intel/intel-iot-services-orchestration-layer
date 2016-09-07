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
import Panel from "../common/panel.x";
import WidgetDetails from "./widget_details.x";

export default class PanelInspector extends ReactComponent {

  _on_click_min(e) {
    var inspector = $hope.app.stores.ui_ide.panel.inspector;
    inspector.visible = !inspector.visible;
    this.forceUpdate();
    e.stopPropagation();
  }

  _on_track(left, top) {
    $hope.trigger_action("ui_ide/move/panel", {
      panel: "inspector",
      left: left,
      top: top
    });
  }

  render() {
    var inspector = $hope.app.stores.ui_ide.panel.inspector;
    var view = $hope.app.stores.ui.active_view;
    var body;
    if (view) {
      var widgets = _.keys(view.selected_widgets);
      if (widgets.length === 1) {
        var w = view.selected_widgets[widgets[0]];
        body = <WidgetDetails widget={w} />;
      }
    }

    var minbtn = <i onClick={this._on_click_min}
      className={"hope-panel-icon-min fa fa-" + (inspector.visible ? "minus-square-o" : "plus-square-o")} />;

    return (
      <Panel icon="info" title={__("Inspector")}
            onTrack={this._on_track}
            left={inspector.left}
            top={inspector.top}
            width={inspector.width}
            visible={inspector.visible}
            buttons={minbtn} >
        {body}
      </Panel>
    );
  }
}
