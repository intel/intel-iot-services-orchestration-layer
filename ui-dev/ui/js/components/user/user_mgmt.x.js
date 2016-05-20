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
import {Row} from "react-bootstrap";
import User from "./user.x";
import Dialog from "../common/dialog.x";
import auth from "../../lib/auth";

export default React.createClass({

  getInitialState() {
    return {
      users: {}
    }
  },

  componentDidMount() {
    this.update_list();
  },

  update_list() {
    $hope.app.server.user.list$().then(users => {
      this.setState({
        users: users
      });
    }).done();
  },

  _on_del(user) {
    $hope.confirm(__("Delete from Server"),
      __("This would delete the user and all apps included by. Please make sure this is what you expect!"),
      "warning", () => {
      $hope.app.server.user.remove$(user.id).then(ok => {
        if (!ok) {
          return $hope.alert(__("Error"), __("Failed to delete user"), "error");
        }
        this.update_list();
        $hope.alert(__("Tips"), __("Success to delete user"), "success");
      }).done();
    });
  },

  _on_add() {
    Dialog.show_new_user_dialog(data => {
      var name = data && data.name && data.name.trim();
      if (!name) {
        return $hope.notify("error", __("Invalid User name"));
      }

      data.name = name;
      auth.register(data, ok => {
        if (!ok) {
          return $hope.alert(__("Error"), __("User name exists"), "error");
        }
        this.update_list();
      });
    });
  },

  render() {
    var me = auth.get_last_user();
    var users = _.map(this.state.users, u =>
      <li key={u.id}>
        <User user={u} onDelete={u.name !== "admin" && me !== u.name ? this._on_del : null} />
      </li>
    );
    return (
      <div className="hope-user-manager">
        <Row className="hope-user-mgr-title-bar">
          <span className="hope-user-mgr-title">{__("Users")}</span>
        </Row>
        <Row>
          <ul className="hope-user-mgr-list">
            {users}
            <li onClick={this._on_add}>
              <div className="hv-center hope-user add-new">
                <i className="fa fa-2x fa-user-plus" />
              </div>
            </li>
          </ul>
        </Row>
      </div>
    );
  }
});
