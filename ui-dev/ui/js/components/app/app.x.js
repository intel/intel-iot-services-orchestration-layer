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
import {Link} from "react-router";
import {Badge} from "react-bootstrap";

export default class App extends ReactComponent {

  static propTypes = {
    app: React.PropTypes.object.isRequired
  };

  _on_delete(e) {
    e.preventDefault();
    e.stopPropagation();

    var appstore = $hope.app.stores.app;
    var running;
    _.forEach(this.props.app.graphs, g => {
      if (appstore.is_workflow_running(g.id)) {
        running = true;
        return false;
      }
    });
    if (running) {
      $hope.notify("error", __("Workflow is running, please stop it before deleting"));
      return;
    }

    $hope.confirm(__("Delete from Server"),
      __("This would delete the app deployed on the server. Please make sure this is what you expect!"),
      "warning", () => {
      $hope.trigger_action("app/remove/app", {
        id: this.props.app.id
      });
    });
  }

  render() {
    var app = this.props.app;

    return (
      <Link to={`/ide/${app.graphs.length > 0 ? app.graphs[0].id : app.id}`}>
        <div className="text-center hope-app">
          <div className="fa fa-home hope-app-icon margin-top" />
          <div className="hope-app-name">{app.name}</div>
          <div className="hope-app-desc">{app.description}</div>
          <div className="hope-app-stats">
            <div>{__("Workflow") + " "}<Badge>{app.graphs.length}</Badge></div>
            <div>{__("User UI") + " "}<Badge>{app.uis.length}</Badge></div>
          </div>
          { !app.is_builtin &&
            <i onClick={this._on_delete} className="fa fa-trash hope-app-trash" />
          }
        </div>
      </Link>
    );
  }
}