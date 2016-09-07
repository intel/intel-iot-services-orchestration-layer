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
import UIBoard from "./ui_board.x";
import {Row} from "react-bootstrap";
import DotLoader from "halogen/DotLoader";

export default class UIIDE extends ReactComponent {

  _on_ui_ide_event(e) {
    $hope.log("forceUpdate", "UIIDE");
    switch(e.event) {
      case "update/inspector":
        break;
      default:
        $hope.log("forceUpdate", "UIIDE");
        this.forceUpdate();
        break;
    }
  }

  _on_ui_event(e) {
    $hope.log("forceUpdate", "UIIDE");
    switch(e.event) {
      case "saved":
        break;
      case "data/received":
        if (this.refs.ui_board) {
          this.refs.ui_board.forceUpdate();
        }
        break;
      case "data/sended":
        break;
      case "selected":
      case "unselected":
        break;
      default:
        this.forceUpdate();
        break;
    }
  }

  _on_resize() {
    $hope.app.stores.ui_ide.layout();
    $hope.log("forceUpdate", "UI_IDE");
    this.forceUpdate();
  }

  _need_switch_current_view() {
    // we might need to switch the IDE to the graph required
    var id = this.props.params.id;
    var store = $hope.app.stores.ui;
    return id && (!store.active_view || 
      store.active_view.id !== id); 
  }

  componentWillMount() {
    this.componentWillReceiveProps(this.props);
    $hope.app.stores.ui_ide.layout();
  }

  componentWillReceiveProps(nextProps) {
    var id = nextProps.params.id;
    $hope.check(id, "UIIDE - No id passed in");
    $hope.trigger_action("ui/set_active", {
      ui_id: id
    });
  }

  componentDidMount() {
    $hope.app.stores.ui_ide.on("ui_ide", this._on_ui_ide_event);
    $hope.app.stores.ui.on("ui", this._on_ui_event);

    window.addEventListener("resize", this._on_resize);
  }

  componentWillUnmount() {
    $hope.app.stores.ui_ide.removeListener("ui_ide", this._on_ui_ide_event);
    $hope.app.stores.ui.removeListener("ui", this._on_ui_event);

    window.removeEventListener("resize", this._on_resize);
  }

  render() {
    var ui_ide_store = $hope.app.stores.ui_ide;
    var ui_store = $hope.app.stores.ui;
    var view = ui_store.active_view;
    var ui;

    // we only show the active view
    if (view && !this._need_switch_current_view()) {
      ui = <UIBoard ref="ui_board" key={view.id} view={view}
              width={ui_ide_store.ui_ide.width} />;
    } else { 
      var reason = ui_store.no_active_reason;
      var reason_content;
      if (reason === "loading") {
        reason_content = <div><DotLoader/><br/>{__("Loading") + " ..."}</div>;
      } else {
        reason_content = <div>{__("Failed to load due to ") + reason}</div>;
      }
      ui = <div 
        className="hope-ui-container">
        <div style={{
          position: "absolute",
          left: (ui_ide_store.ui_ide.width) / 2,
          top: (ui_ide_store.ui_ide.height) / 2 - 5,
          color: "#aaa"
        }}> {reason_content}
        </div>
      </div>;
    }

    $hope.log("render", "IDE");

    return (
      <Row>
          <Row style={{
            height: ui_ide_store.ui_ide.height
          }}>
          {ui}
          </Row>
      </Row>
    );

  }
}
