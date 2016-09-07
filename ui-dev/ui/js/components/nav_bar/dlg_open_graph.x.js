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
import {Modal, Button, SplitButton, MenuItem} from "react-bootstrap";
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
    e.stopPropagation();
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

  _on_import_nodered() {
    if (!window.File || !window.FileReader) {
      $hope.notify("error", __("Unable to import workflow in this browser"));
      return;
    }

    var input = $("<input type='file' accept='.json' multiple />").appendTo(this.refs.bh);
    var app = this.props.app;
    input.on("change", event => {
      let loadq = _.map(event.target.files, file => {
        let reader = new FileReader();
        var d = $Q.defer();
        reader.addEventListener("error", event => {
          console.log(event);
          d.reject(__("Reading operation encounter an error") + ": " + file.name);
        });
        reader.addEventListener("load", event => {
          let json = JSON.parse(event.target.result);
          if (!_.isArray(json)) {
            d.reject(__("Invalid nodered workflow") + ": " + file.name);
            return;
          }
          let graph = {};
          graph.id = $hope.uniqueId("GRAPH_NR_");
          graph.name = file.name;
          graph.nr_flow = json
          d.resolve(graph);
        });
        reader.readAsText(file);
        return d.promise;
      });
      $Q.all(loadq).then(jsons => {
        var createq = _.map(jsons, json => {
          return $hope.app.server.app.create_nr_graph$(app.id, json).then(()=> {
            app.graphs.push(json);
          });
        });
        $Q.all(createq).then(()=> {
          this.forceUpdate();
          $hope.notify("success", __("Workflow successfully imported!"));
        });
      }).catch(e => {
        $hope.notify("error", e);
      });
    });
    input.trigger("click");
  }



  _on_import() {
    if (!window.File || !window.FileReader) {
      $hope.notify("error", __("Unable to import workflow in this browser"));
      return;
    }

    var input = $("<input type='file' accept='.json' multiple />").appendTo(this.refs.bh);
    var app = this.props.app;
    input.on("change", event => {
      let loadq = _.map(event.target.files, file => {
        let reader = new FileReader();
        var d = $Q.defer();
        reader.addEventListener("error", event => {
          console.log(event);
          d.reject(__("Reading operation encounter an error") + ": " + file.name);
        });
        reader.addEventListener("load", event => {
          let json = JSON.parse(event.target.result);
          if (!json.id || !json.name || !_.isObject(json.graph)) {
            d.reject(__("Invalid workflow") + ": " + file.name);
            return;
          }
          if (_.find(app.graphs, ["id", json.id])) {
            d.reject(__("This workflow already exists") + ": " + file.name);
            return;
          }
          if (_.find(app.graphs, ["name", json.name])) {
            d.reject(__("The name of this workflow already exists") + ": " + file.name);
            return;
          }
          d.resolve(json);
        });
        reader.readAsText(file);
        return d.promise;
      });
      $Q.all(loadq).then(jsons => {
        var createq = _.map(jsons, json => {
          return $hope.app.server.app.create_graph$(app.id, json).then(()=> {
            app.graphs.push(json);
          });
        });
        $Q.all(createq).then(()=> {
          this.forceUpdate();
          $hope.notify("success", __("Workflow successfully imported!"));
        });
      }).catch(e => {
        $hope.notify("error", e);
      });
    });
    input.trigger("click");
  }

  _on_export() {
    if (!window.Blob) {
      $hope.notify("error", __("Unable to export workflow in this browser"));
      return;
    }

    $hope.app.stores.graph.ensure_graph_loaded$(this.state.selected_id).then(view => {
      var data = view.graph.$serialize();
      delete data.app;
      delete data.path;

      var filename = view.get_app().name + "-" + (view.graph.name || "") + ".json";
      var blob = new Blob([JSON.stringify(data, null, "\t")], {"type": "application/octet-stream"});
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
      }
      else {
        var a = this.refs.a;
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }
    }).catch(err => {
      $hope.notify("error", __("Failed to export the workflow because"),
        $hope.error_to_string(err));
    }).done();
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
        <Modal.Body className="hope-open-dialog-list">
          {this.props.app && this.render_app(this.props.app)}
        </Modal.Body>
        <Modal.Footer>
          {this.props.app &&
            <span style={{float: "left"}}>
              <SplitButton bsStyle="info" title={__("Import")} id="isb" onClick={this._on_import}>
                <MenuItem onClick={this._on_import}>{"IoT SOL " + __("Workflow")}</MenuItem>
                <MenuItem divider />
                <MenuItem onClick={this._on_import_nodered}>{"Node-RED " + __("Workflow")}</MenuItem>
              </SplitButton>
            </span>
          }
          {this.state.selected_id &&
            <Button bsStyle="success" style={{marginLeft: 5, float: "left"}} onClick={this._on_export}>{__("Export")}</Button>
          }
          <Button bsStyle="default" onClick={this.props.onHide}>{__("Cancel")}</Button>
          <Button bsStyle="primary" {...btn_props} onClick={this._on_open}>{__("Open")}</Button>
          <div ref="bh" style={{display: "none"}}>
            <a ref="a" target="_self" />
          </div>
        </Modal.Footer>
      </Modal>
    );
  }
}

