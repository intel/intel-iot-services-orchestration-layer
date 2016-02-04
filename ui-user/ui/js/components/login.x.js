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
import {History} from "react-router";
import {Input} from "react-bootstrap";
import auth from "../lib/auth";

export default React.createClass({
  mixins: [ History ],

  _on_submit(e) {
    e.stopPropagation();
    e.preventDefault();

    var name = this.refs.Name.getValue();
    var pwd = this.refs.Pwd.getValue();

    auth.login(name, pwd, ok => {
      if (!ok) {
        return $hope.alert(__("Error"), __("User does not exists, or incorrect password"), "error");
      }
      this.history.replaceState(null, $hope.ui_redirect || "/app");
    });
  },

  render() {
    return (
      <div className="hope-login-dialog">
        <form className="form-signin" onSubmit={this._on_submit}>
          <Input type="text" ref="Name" className="form-control" label={__("User Name")} defaultValue={auth.get_last_user()} required autofocus />
          <Input type="password" ref="Pwd" className="form-control" label={__("Password")} />
          <button className="btn btn-lg btn-primary btn-block" type="submit">{__("Sign in")}</button>
        </form>
      </div>
    );
  }
});
