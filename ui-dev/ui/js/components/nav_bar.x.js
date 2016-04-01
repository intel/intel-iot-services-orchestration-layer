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
import {Link} from "react-router";
import auth from "../lib/auth";

export default React.createClass({

  getInitialState() {
    return {
      app: null
    };
  },

  _on_auth_event(e) {
    switch(e.event) {
      case "login":
      case "logout":
        this.forceUpdate();
        break;
    }
  },

  _on_app_event(e) {
    switch(e.event) {
      case "actived":
        this.setState({
          app: e.app
        });
        break;
    }
  },

  componentDidMount() {
    $hope.app.stores.app.on("app", this._on_app_event);
    auth.on("auth", this._on_auth_event);
  },

  componentWillUnmount() {
    $hope.app.stores.app.removeListener("app", this._on_app_event);
    auth.removeListener("auth", this._on_auth_event);
  },

  render() {
    var store = $hope.app.stores.ide;
    var app = this.state.app;
    var to, btn, extra;
    if (app) {
      if (_.startsWith(location.hash, "#/ide/")) {
        var active_ui = $hope.app.stores.ui.active_view;
        if (active_ui && active_ui.get_app() === app) {
          to = "/ui_ide/" + active_ui.id;
        }
        else if (app && app.uis && app.uis.length > 0) {
          to = "/ui_ide/" + app.uis[0].id;
        }
        btn = "UI Editor";
      }
      else if (_.startsWith(location.hash, "#/ui_ide/")) {
        var active_graph = $hope.app.stores.graph.active_view;
        if (active_graph && active_graph.get_app() === app) {
          to = "/ide/" + active_graph.id;
        }
        else if (app && app.graphs && app.graphs.length > 0) {
          to = "/ide/" + app.graphs[0].id;
        }
        btn = "Workflow Editor";
      }
      if (to) {
        extra = [
          <span key="sep" className="hope-nav-bar-sep">{"|"}</span>,
          <Link key="sw" to={to}>
            <i className="fa fa-hand-o-right hope-nav-bar-app" />
            <span className="hope-nav-bar-app">{" " + __(btn)}</span>
          </Link>];
      }
    }

    return (
      <div className="hope-nav-bar">
        <Link to={auth.is_logged_in() ? "/app" : "/"}>
          <img className="hope-logo" src="images/logo.png" style={{
            width: 228,
            height: 60,
            padding: "5px 0 5px 15px"
          }}/>
        </Link>

        <div style={{
          position: "absolute",
          top: 16,
          right: 180
        }}>
          <a href={location.origin + "/app-dev"} target="_blank">
            {__("Help")}
          </a>
        </div>

        <div style={{
          position: "absolute",
          top: 16,
          right: 100
        }}>
          {$hope.ui_user_port &&
            <a href={location.protocol + "//" + location.hostname + ":" + $hope.ui_user_port} target="_blank">
              {__("EndUser")}
            </a>
          }
        </div>

        { app &&
          <div style={{
              position: "absolute",
              top: 16,
              left: store.left_toolbar.width + store.panel.library.width
              }}>
            <Link to={`/app_home/${app.id}`}>
              <i className="fa fa-hand-o-right hope-nav-bar-app" />
              <span className="hope-nav-bar-app">{" " + __("App") + ": " + app.name}</span>
            </Link>
            {extra}
          </div>
        }
      </div>
    );
  }
});

