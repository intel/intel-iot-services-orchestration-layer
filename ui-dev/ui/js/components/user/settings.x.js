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
import auth from "../../lib/auth";
import Dialog from "../common/dialog.x";

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

  render() {
    return (
      <div className={"hope-settings" + (this.state.collapsed ? " collapsed" : "")}>
        
        <div className="hope-settings-bg"
            onClick={this._on_toggle} />

        {this.state.logged && auth.get_user_role() === "admin" &&
          <div className="hope-settings-users hope-settings-item"
              onClick={this._on_users}>
            <span className="fa fa-users"/>
            <span>{" " + __("Users")}</span></div>
        }

        {this.state.logged &&
          <div className="hope-settings-chpass hope-settings-item"
              onClick={this._on_chpass}>
            <span className="fa fa-lg fa-key"/>
            <span>{" " + __("Change Password")}</span>
          </div>
        }

        {this.state.logged &&
          <div className="hope-settings-logout hope-settings-item"
              onClick={this._on_logout}>
            <span className="fa fa-lg fa-sign-out" />
            <span>{" " + __("Logout")}</span>
          </div>
        }

        <div className="fa fa-lg fa-cog hope-settings-cog hope-settings-item"
            onClick={this._on_toggle} />
      </div>
    );
  }
});

