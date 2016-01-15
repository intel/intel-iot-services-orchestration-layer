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
import LeftToolbar from "./left_toolbar.x";
import WidgetLibrary from "./widget_library.x";
import PanelInspector from "./panel_inspector.x";
import FileTabs from "./file_tabs.x";
import UIBoard from "./ui_board.x";

import {Row, Col} from "react-bootstrap";
import {Lifecycle} from "react-router";

import Halogen from "halogen";

export default React.createClass({

  mixins: [ Lifecycle ],

  routerWillLeave(nextLocation) {
    if (_.startsWith(nextLocation.pathname, "/ui_ide/")) {
      return;
    }
    var view = $hope.app.stores.ui.active_view;
    var app = view ? view.get_app() : null;
    var modified = false;
    _.forEach($hope.app.stores.ui.views, v => {
      if (v.get_app() === app) {
        modified |= v.modified;
      }
    });
    if (modified) {
      return __("Your edit is NOT saved! Are you READLLY want to leave?");
    }
    if (!_.startsWith(nextLocation.pathname, "/ide/") &&
        !_.startsWith(nextLocation.pathname, "/ui_ide/")) {
      $hope.app.stores.app.active_app(null);
    }
  },

  _on_ui_ide_event(e) {
    $hope.log("forceUpdate", "UIIDE");
    switch(e.event) {
      case "update/toolbar":
        $hope.log("forceUpdate", "UIIDE - toolbar");
        this.refs.toolbar.forceUpdate();
        break;
      case "update/inspector":
        $hope.log("forceUpdate", "UIIDE - inspector");
        this.refs.inspector.forceUpdate();
        break;
      default:
        $hope.log("forceUpdate", "UIIDE");
        this.forceUpdate();
        break;
    }
  },

  _on_ui_event(e) {
    $hope.log("forceUpdate", "UIIDE");
    switch(e.event) {
      case "saved":
        $hope.notify("success", __("UI successfully saved!"));
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
        this.refs.inspector.forceUpdate();
        this.refs.toolbar.forceUpdate();
        if (this.refs.ui_board) {
          this.refs.ui_board.forceUpdate();
        }
        break;
      case "removed":
      case "set_active":
        var view = $hope.app.stores.ui.active_view;
        if (view) {
          $hope.app.stores.app.active_app(a => {
            if (view.info_for_new && view.info_for_new.app_id === a.id) {
              return true;
            }
            return _.find(a.uis, "id", view.id);
          });
        }
        if (e.event === "set_active") {
          let query = this.props.location.query;
          if (query && query.widget) {
            $hope.trigger_action("ui/select/widget", {
              ui_id: view.id, 
              id: query.widget
            });
          }
        }
        this.forceUpdate();
        break;
      case "status/changed":
        this.refs.file_tabs.forceUpdate();
        break;
      default:
        this.forceUpdate();
        break;
    }
  },

  _on_app_event() {
    $hope.log("forceUpdate", "UIIDE");
    this.forceUpdate();
  },

  _on_library_event() {
    $hope.log("forceUpdate", "UIIDE");
    this.forceUpdate();
  },


  _on_resize() {
    $hope.app.stores.ui_ide.layout();
    $hope.log("forceUpdate", "UI_IDE");
    this.forceUpdate();
  },

  _need_switch_current_view() {
    // we might need to switch the IDE to the graph required
    var id = this.props.params.id;
    var store = $hope.app.stores.ui;
    return id && (!store.active_view || 
      store.active_view.id !== id); 
  },

  _on_key_up(e) {
    var view = $hope.app.stores.ui.active_view;
    if(!view) {
      return;
    }
    switch(e.keyCode) {
      case 46:      // delete
        if (view.has_selections()) {
          $hope.trigger_action("ui/remove/selected", {ui_id: view.id});
        }
        break;
    }
  },

  componentWillMount() {
    this.componentWillReceiveProps(this.props);
    $hope.app.stores.ui_ide.layout();
  },

  componentWillReceiveProps(nextProps) {
    var id = nextProps.params.id;
    $hope.check(id, "UIIDE - No id passed in");
    $hope.trigger_action("ui/set_active", {
      ui_id: id
    });
  },

  componentDidMount() {
    $hope.app.stores.ui_ide.on("ui_ide", this._on_ui_ide_event);
    $hope.app.stores.ui.on("ui", this._on_ui_event);
    $hope.app.stores.app.on("app", this._on_app_event);
    $hope.app.stores.library.on("library", this._on_library_event);

    window.addEventListener("resize", this._on_resize);
    document.addEventListener("keyup", this._on_key_up);
  },


  componentWillUnmount() {
    $hope.app.stores.ui_ide.removeListener("ui_ide", this._on_ui_ide_event);
    $hope.app.stores.ui.removeListener("ui", this._on_ui_event);
    $hope.app.stores.app.removeListener("app", this._on_app_event);
    $hope.app.stores.library.removeListener("library", this._on_library_event);

    window.removeEventListener("resize", this._on_resize);
    document.removeEventListener("keyup", this._on_key_up);
  },

  render() {
    var ui_ide_store = $hope.app.stores.ui_ide;
    var ui_store = $hope.app.stores.ui;
    var view = ui_store.active_view;
    var app = view ? view.get_app() : null;
    var ui;

    // we only show the active view
    if (view && !this._need_switch_current_view()) {
      ui = <UIBoard ref="ui_board" key={view.id} view={view}
              width={ui_ide_store.ui_ide.width} />;
    } else { 
      var reason = ui_store.no_active_reason;
      var reason_content;
      if (reason === "loading") {
        reason_content = <div><Halogen.DotLoader/><br/>{__("Loading") + " ..."}</div>;
      } else {
        reason_content = <div>{__("Failed to load due to ") + reason}</div>;
      }
      ui = <div 
        className="hope-ui-container">
        <div style={{
          position: "absolute",
          left: (ui_ide_store.ui_ide.width) / 2 - ui_ide_store.widget_library.width,
          top: (ui_ide_store.ui_ide.height) / 2 - 5,
          color: "#aaa"
        }}> {reason_content}
        </div>
      </div>;
    }

    $hope.log("render", "IDE");

    return (
      <Row>
        <Col xs={1} style={{
          width: ui_ide_store.left_toolbar.width,
          height: ui_ide_store.left_toolbar.height
        }}>
          <LeftToolbar ref="toolbar" />
        </Col>
        <Col xs={1} style={{
          width: ui_ide_store.widget_library.width,
          height: ui_ide_store.widget_library.height
        }}>
          <WidgetLibrary/>
        </Col>
        <Col xs={10} style={{
          width: ui_ide_store.ui_ide.width
        }}>
          <Row style={{
            height: ui_ide_store.file_tabs.height
          }}>
            <FileTabs  ref="file_tabs" app={app}
                width={ui_ide_store.file_tabs.width} />
          </Row>
          <Row style={{
            height: ui_ide_store.ui_ide.height
          }}>
          {ui}
          </Row>
        </Col>
        <PanelInspector ref="inspector" />
      </Row>
    );

  }
});
