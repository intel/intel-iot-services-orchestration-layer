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
import {Link, History} from "react-router";
import auth from "../lib/auth";

export default React.createClass({
  mixins: [ History ],

  getInitialState() {
    return {
      logged: auth.is_logged_in()
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

  _on_logout() {
    auth.logout(()=> {
      $hope.app.stores.ui.clear_cache();
      $hope.app.stores.app.clear_cache();
      this.history.replaceState(null, "/login");
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
      <div className="hope-nav-bar">
        <Link to={auth.is_logged_in() ? "/app" : "/"}>
          <img className="hope-logo" src="images/logo.png" style={{
            width: 228,
            height: 60,
            padding: "5px 0 5px 15px"
          }}/>
        </Link>

        {this.state.logged &&
          <div className="hope-nav-bar-bg" />
        }
        {this.state.logged &&
          <div className="fa fa-lg fa-sign-out hope-nav-bar-sign-out" onClick={this._on_logout} />
        }
        </div>
    );
  }
});

