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
import auth from "../../lib/auth";
import Dialog from "../common/dialog.x";
import {NavDropdown, MenuItem} from "react-bootstrap";

export default React.createClass({
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  getInitialState() {
    return {
      collapsed: true,
      logged: $hope.ui_auth_required && auth.is_logged_in()
    };
  },

  _on_auth_event(e) {
    switch(e.event) {
      case "login":
        this.setState({
          logged: true
        });
        break;

      case "logout":
        this.setState({
          logged: false
        });
        break;
    }
  },

  _on_users(e) {
    e.stopPropagation();

    this.setState({
      collapsed: true
    }, ()=> {
      this.context.router.replace("/users");
    });
  },

  _on_chpass(e) {
    e.stopPropagation();

    var name = auth.get_last_user();
    Dialog.show_chpass_dialog(name, (old, np)=> {
      auth.change_passwd(name, np, old, ok => {
        if (!ok) {
          return $hope.alert(__("Error"), __("User does not exists, or incorrect password"), "error");
        }
        $hope.alert(__("Tips"), __("Success to change password"), "success");
      });
    });
  },

  _on_logout(e) {
    e.stopPropagation();

    this.setState({
      collapsed: true
    }, ()=> {
      auth.logout(()=> {
        $hope.app.stores.graph.clear_cache();
        $hope.app.stores.ui.clear_cache();
        $hope.app.stores.app.clear_cache();
        this.context.router.replace("/login");
      });
    });
  },

  _on_toggle(e) {
    e.stopPropagation();

    this.setState({
      collapsed: !this.state.collapsed
    });
  },

  componentDidMount() {
    auth.on("auth", this._on_auth_event);
  },

  componentWillUnmount() {
    auth.removeListener("auth", this._on_auth_event);
  },

  _on_set_proxy() {
    var self = this;
    $hope.app.server.config.proxy_get$().then(function(data) {
      Dialog.show_proxy_set_dialog(__("User Proxy"), self._set_proxy, data);
    }).catch(function(err) {
      console.log(err);
    });
  },

  _set_proxy(http_proxy, https_proxy,apply_to_all_hub) {
    http_proxy = http_proxy || "";
    https_proxy = https_proxy || "";
    var proxy = {
      http_proxy: http_proxy,
      https_proxy: https_proxy,
      apply_to_all_hub: apply_to_all_hub
    };
    $hope.app.server.config.proxy_set$(proxy).then(function() {
      $hope.notify("success", __("User proxy successfully apply"));
    });
  },

  _on_add_npm_user() {
    var self = this;
    $hope.app.server.config.npm_account_get$().then(function(data) {
      Dialog.show_npm_account_dialog(__("Add npm account"), self._add_npm_user, data);
    }).catch(function(err) {
      console.log(err);
    });
  },

  _add_npm_user(user) {
    $hope.app.server.config.npm_account_set$(user).then(function() {
      $hope.notify("success", __("npm account successfully add"));
    });
  },

  render() {
    return (
    <div className="hope-nav-bar-navigation first">
      <i className="fa fa-lg fa-cog">&nbsp;</i>
      <NavDropdown title={__("User Setting")} id="hope-nav-bar-user-setting">
        <MenuItem onClick={this._on_set_proxy}>
          {__("Proxy Settings")}
        </MenuItem>
        <MenuItem onClick={this._on_add_npm_user}>
          {__("NPM Account")}
        </MenuItem>
        {$hope.ui_auth_required && this.state.logged && auth.get_user_role() === "admin" &&
          <MenuItem onClick={this._on_users}>
            {" " + __("Users")}
          </MenuItem>
        }
        {$hope.ui_auth_required && this.state.logged &&
          <MenuItem onClick={this._on_chpass}>
            {" " + __("Change Password")}
          </MenuItem>
        }
        {$hope.ui_auth_required && this.state.logged &&
          <MenuItem onClick={this._on_logout}>
            {" " + __("Logout")}
          </MenuItem>
        }
      </NavDropdown>
    </div>
    )
  }
});

