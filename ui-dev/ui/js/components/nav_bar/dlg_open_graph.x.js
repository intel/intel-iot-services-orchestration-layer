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
      selected_id: view ? view.id : null
    };
  }

  componentWillReceiveProps() {
    var view = $hope.app.stores.graph.active_view;
    this.setState({
      selected_id: view ? view.id : null
    });
  }

  _on_wfe_event() {
    this.forceUpdate();
  }

  componentDidMount() {
    $hope.app.stores.app.on("wfe/changed", this._on_wfe_event);
  }

  componentWillUnmount() {
    $hope.app.stores.app.removeListener("wfe/changed", this._on_wfe_event);
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

    var running = $hope.app.stores.app.is_workflow_running(id);
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

    var running = $hope.app.stores.app.is_workflow_running(id);
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
          var running = $hope.app.stores.app.is_workflow_running(g.id);
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
        <div className="hv-center hope-open-dialog-item add-new" key="NeW" onClick={this._on_create}>
          <i className="fa fa-2x fa-plus" />
        </div>
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
      <Modal {...this.props} backdrop="static" animation={true} onKeyDown={this._on_keydown}>
        <Modal.Header closeButton>
          <Modal.Title>{__("Workflow")}</Modal.Title>
        </Modal.Header>
        <div className="modal-body hope-open-dialog-list">
          {this.props.app && this.render_app(this.props.app)}
        </div>
        <div className="modal-footer">
          <Button bsStyle="default" onClick={this.props.onHide}>{__("Cancel")}</Button>
          <Button bsStyle="primary" {...btn_props} onClick={this._on_open}>{__("Open")}</Button>
        </div>
      </Modal>
    );
  }
}

