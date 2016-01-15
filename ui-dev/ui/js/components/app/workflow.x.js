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
import {Row} from "react-bootstrap";

export default class Workflow extends ReactComponent {

  static propTypes = {
    app: React.PropTypes.object.isRequired,
    graph: React.PropTypes.object.isRequired
  };

  _on_delete(e) {
    e.preventDefault();
    e.stopPropagation();

    $hope.confirm(__("Delete from Server"),
      __("This would delete the workflow deployed on the server. Please make sure this is what you expect!"),
      "warning", () => {
        $hope.trigger_action("graph/remove", {
          graphs: [this.props.graph.id]
        });
    });
  }

  _on_control(e) {
    e.preventDefault();
    e.stopPropagation();

    var graph = this.props.graph;
    var running = this.props.working.indexOf(graph.id) >= 0;
    if (running) {
      $hope.trigger_action("graph/stop", {
        graphs: [graph.id]
      });
    }
    else {
      $hope.trigger_action("graph/start", {
          graphs: [graph.id],
          tracing: false
        });
    }
  }

  render() {
    var app = this.props.app;
    var graph = this.props.graph;
    var running = this.props.working.indexOf(graph.id) >= 0;
    return (
      <Link to={`/ide/${graph.id}`}>
        <div className="hope-workflow">
          <Row className="hope-workflow-bar">
            <div className="fa fa-cubes hope-workflow-icon" />
          </Row>
          <Row>
            <div className="hope-workflow-name">{graph.name}</div>
          </Row>
          <Row>
            <div className="hope-workflow-desc">{graph.description}</div>
          </Row>
          <i onClick={this._on_control} className={"hope-workflow-control fa fa-" + (running ? "power-off" : "play")} />
          { !app.is_builtin &&
            <i onClick={this._on_delete} className="fa fa-trash hope-workflow-trash" />
          }
          { running &&
            <i className="fa fa-cog fa-spin hope-workflow-status-icon" />
          }
        </div>
      </Link>
    );
  }
}
