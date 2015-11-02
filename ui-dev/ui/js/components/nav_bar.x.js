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

export default class NavBar extends ReactComponent {

  state = {
    app_name: "",
    app_id: ""
  };

  _on_app_event(e) {
    switch(e.event) {
      case "actived":
        this.setState({
          app_name: e.name,
          app_id: e.id
        });
        break;
    }
  }

  componentDidMount() {
    $hope.app.stores.app.on("app", this._on_app_event);
  }

  componentWillUnmount() {
    $hope.app.stores.app.removeListener("app", this._on_app_event);
  }

  render() {
    return (
      <div className="hope-nav-bar">
        <Link to="/">
          <img className="hope-logo" src="images/logo.png" style={{
            width: 228,
            height: 60,
            padding: "5px 0 5px 15px"
          }}/>
        </Link>
        <div style={{
          position: "absolute",
          top: 8,
          right: 20
        }}>
          <Link to="/" > App </Link>
          | Device | EndUser
        </div>

        { this.state.app_name &&
          <div style={{
              position: "absolute",
              top: 16,
              left: 260
              }}>
            <Link to="app_home" params={{id: this.state.app_id}}>
              <i className="fa fa-sitemap hope-nav-bar-app">{" " + this.state.app_name}</i>
            </Link>
          </div>
        }
        </div>
    );
  }
}

