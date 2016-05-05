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
import {Badge} from "react-bootstrap";

export default class App extends ReactComponent {

  static propTypes = {
    app: React.PropTypes.object.isRequired
  };

  state = {
    working: []
  };

  _on_delete(e) {
    e.preventDefault();
    e.stopPropagation();

    $hope.confirm(__("Delete from Server"),
      __("This would delete the app deployed on the server. Please make sure this is what you expect!"),
      "warning", () => {
      $hope.trigger_action("app/remove/app", {
        id: this.props.app.id
      });
    });
  }

  componentDidMount() {
    var app = this.props.app;
    $hope.app.server.graph.status$(_.map(app.graphs, "id")).then((sts) => {
      var working = _.map(_.filter(sts, ["status", "Working"]), "graph");
      this.setState({
        working: working
      });
    }).done();

    this.listener = $hope.listen_system("wfe/changed", ev => {
      var working = this.state.working;
      if (ev.stoped) {
        _.forEach(ev.stoped, id => _.pull(working, id));
      }
      if (ev.started) {
        _.forEach(ev.started, id => {
          if (_.find(app.graphs, ["id", id]) && working.indexOf(id) < 0) {
            working.push(id);
          }
        })
      }
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this.listener.dispose();
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