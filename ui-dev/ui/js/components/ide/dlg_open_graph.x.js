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
import {Modal, Button} from "react-bootstrap";

export default class DlgOpenGraph extends ReactComponent {

  static propTypes = {
    app: React.PropTypes.object,
    onClickOpen: React.PropTypes.func,
    onClickDelete: React.PropTypes.func,
    onClickCreate: React.PropTypes.func
  };

  constructor(props) {
    super(props);

    var view = $hope.app.stores.graph.active_view;
    this.state = {
      selected_id: view ? view.id : null,
      working: []
    };
  }

  get_app_status() {
    var app = this.props.app;
    if (!app || app.graphs.length === 0) {
      this.setState({
        working: []
      });
      return;
    }
    $hope.app.server.graph.status$(_.map(app.graphs, "id")).then((sts) => {
      var working = _.map(_.filter(sts, ["status", "Working"]), "graph");
      this.setState({
        working: working
      });
    }).done();
  }

  componentWillReceiveProps(nextProps) {
    var view = $hope.app.stores.graph.active_view;
    this.setState({
      selected_id: view ? view.id : null
    });
    if (nextProps.show) {
      this.get_app_status();
    }
  }

  componentDidMount() {
    this.get_app_status();

    this.listener = $hope.listen_system("wfe/changed", ev => {
      var app = this.props.app;
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

  _on_click(id, e) {
    e.preventDefault();
    e.stopPropagation();

    this.setState({
      selected_id: id
    });
  }

  _on_dbclick(id, e) {
    e.preventDefault();
    e.stopPropagation();

    if (_.isFunction(this.props.onClickOpen)) {
      this.props.onClickOpen(id);
      this.props.onHide();
    }
  }

  _on_del(id, e) {
    e.preventDefault();
    e.stopPropagation();

    var running = this.state.working.indexOf(id) >= 0;
    if (running) {
      $hope.notify("error", __("Workflow is running, please stop it before deleting"));
      return;
    }

    if (_.isFunction(this.props.onClickDelete)) {
      this.props.onClickDelete(id, ()=> this.forceUpdate());
      if (this.state.selected_id === id) {
        this.state.selected_id = null;
      }
    }
  }

  _on_create(e) {
    e.preventDefault();
    e.stopPropagation();

    if (_.isFunction(this.props.onClickCreate)) {
      this.props.onClickCreate();
      this.props.onHide();
    }
  }

  _on_open(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.state.selected_id && _.isFunction(this.props.onClickOpen)) {
      this.props.onClickOpen(this.state.selected_id);
      this.props.onHide();
    }
  }

  _on_keydown(e) {
    if(e.keyCode === 13) { // ENTER KEY
      this._on_open(e);
    }
  }

  _on_control(id, e) {
    e.preventDefault();
    e.stopPropagation();

    var running = this.state.working.indexOf(id) >= 0;
    if (running) {
      $hope.trigger_action("graph/stop", {
        graphs: [id]
      });
    }
    else {
      $hope.trigger_action("graph/start", {
        graphs: [id],
        tracing: false
      });
    }
  }

  render_app(app) {
    return (
      <div key={app.id} style={{clear: "both"}}>
        { _.map(app.graphs, g => {
          var running = this.state.working.indexOf(g.id) >= 0;
          return (
            <div className={"text-center hope-open-dialog-item" + (this.state.selected_id === g.id ? " selected" : "")}
                key={g.id}
                onClick={this._on_click.bind(this, g.id)}
                onDoubleClick={this._on_dbclick.bind(this, g.id)}>
              <div className="fa fa-cubes hope-open-dialog-icon margin-top" />
              <div className="margin-top">
                {g.name}
              </div>
              <i className="fa fa-trash hope-open-dialog-trash"
                onClick={this._on_del.bind(this, g.id)} />
              { running &&
                <i className="fa fa-cog fa-spin hope-open-dialog-graph-status-icon" />
              }
              <i onClick={this._on_control.bind(this, g.id)}
                className={"hope-open-dialog-graph-control fa fa-" + (running ? "power-off" : "play")} />
            </div>);
          })
        }
      </div>
    );
  }

  render() {
    var btn_props;
    if (!this.state.selected_id) {
      btn_props = {
        disabled: true
      };
    }

    return (
      <Modal {...this.props} animation={true} onKeyDown={this._on_keydown}>
        <Modal.Header closeButton>
          <Modal.Title>{__("Workflow")}</Modal.Title>
        </Modal.Header>
        <div className="modal-body hope-open-dialog-list">
          {this.props.app && this.render_app(this.props.app)}
        </div>
        <div className="modal-footer">
          <Button bsStyle="default" onClick={this.props.onHide}>{__("Cancel")}</Button>
          <Button bsStyle="warning" onClick={this._on_create}>{__("Create")}</Button>
          <Button bsStyle="primary" {...btn_props} onClick={this._on_open}>{__("Open")}</Button>
        </div>
      </Modal>
    );
  }
}

