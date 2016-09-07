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
import {Modal, Button} from "react-bootstrap";

export default class DlgOpenUI extends ReactComponent {

  static propTypes = {
    app: React.PropTypes.object,
    onClickOpen: React.PropTypes.func,
    onClickDelete: React.PropTypes.func,
    onClickCreate: React.PropTypes.func
  };

  constructor(props) {
    super(props);

    var view = $hope.app.stores.ui.active_view;
    this.state = {
      selected_id: view ? view.id : null
    };
  }

  componentWillReceiveProps() {
    var view = $hope.app.stores.ui.active_view;
    this.setState({
      selected_id: view ? view.id : null
    });
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

  _on_home(id, e) {
    e.preventDefault();
    e.stopPropagation();

    var app = this.props.app;
    if (app && app.main_ui !== id) {
      app.main_ui = id;
      $hope.trigger_action("app/update/app", {
        id: app.id,
        props: {
          main_ui: id
        }
      });
      this.forceUpdate();
    }
  }

  _on_import() {
    if (!window.File || !window.FileReader) {
      $hope.notify("error", __("Unable to import UI in this browser"));
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
          if (!json.id || !json.name || !_.isArray(json.widgets)) {
            d.reject(__("Invalid UI") + ": " + file.name);
            return;
          }
          if (_.find(app.uis, ["id", json.id])) {
            d.reject(__("This UI already exists") + ": " + file.name);
            return;
          }
          if (_.find(app.uis, ["name", json.name])) {
            d.reject(__("The name of this UI already exists") + ": " + file.name);
            return;
          }
          d.resolve(json);
        });
        reader.readAsText(file);
        return d.promise;
      });
      $Q.all(loadq).then(jsons => {
        var createq = _.map(jsons, json => {
          return $hope.app.server.app.create_ui$(app.id, json).then(()=> {
            app.uis.push(json);
          });
        });
        $Q.all(createq).then(()=> {
          this.forceUpdate();
          $hope.notify("success", __("UI successfully imported!"));
        });
      }).catch(e => {
        $hope.notify("error", e);
      });
    });
    input.trigger("click");
  }

  _on_export() {
    if (!window.Blob) {
      $hope.notify("error", __("Unable to export UI in this browser"));
      return;
    }

    $hope.app.stores.ui.ensure_ui_loaded$(this.state.selected_id).then(view => {
      var data = view.get_ui().$serialize();
      delete data.app;

      var filename = view.get_app().name + "-" + (view.get_ui().name || "") + ".json";
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
      $hope.notify("error", __("Failed to export the UI because"),
        $hope.error_to_string(err));
    }).done();
  }

  render_app(app) {
    return (
      <div key={app.id} style={{clear: "both"}}>
        { _.map(app.uis, ui => (
            <div className={"text-center hope-open-dialog-item" + (this.state.selected_id === ui.id ? " selected" : "")}
                key={ui.id}
                onClick={this._on_click.bind(this, ui.id)}
                onDoubleClick={this._on_dbclick.bind(this, ui.id)}>
              <div className="fa fa-user hope-open-dialog-icon margin-top" />
              <div className=" margin-top">
                {ui.name || ui.id}
              </div>
              <i className={"hope-open-dialog-ui-home fa fa-home" + (app.main_ui === ui.id ? " home-ui" : "")}
                onClick={this._on_home.bind(this, ui.id)} />
              <i className="fa fa-trash hope-open-dialog-trash"
                onClick={this._on_del.bind(this, ui.id)} />
            </div>)
          )}
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
          <Modal.Title>{__("User UI")}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="hope-open-dialog-list">
          {this.props.app && this.render_app(this.props.app)}
        </Modal.Body>
        <Modal.Footer>
          {this.props.app &&
            <Button bsStyle="info" style={{float: "left"}} onClick={this._on_import}>{__("Import")}</Button>
          }
          {this.state.selected_id &&
            <Button bsStyle="success" style={{float: "left"}} onClick={this._on_export}>{__("Export")}</Button>
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

