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

export default class DlgOpenUI extends ReactComponent {

  static propTypes = {
    onClickOpen: React.PropTypes.func
  };

  state = {
    show_other_apps: false,
    selected_id: null
  };

  _on_show_others(e) {
    e.preventDefault();
    e.stopPropagation();

    this.setState({
      show_other_apps: true
    });
  }

  _on_selected(id, e) {
    e.preventDefault();
    e.stopPropagation();

    this.setState({
      selected_id: id
    });
  }

  _on_open(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.state.selected_id && _.isFunction(this.props.onClickOpen)) {
      this.props.onClickOpen(this.state.selected_id);
    }
    this.props.onHide();
  }

  render_app(app, all_others) {
    var uis = [];
    _.forEach(app.uis, ui => {
      if (all_others || !_.find($hope.app.stores.ui.views, "id", ui.id)) {
        uis.push(
          <div className={"hv-center hope-open-dialog-item" + (this.state.selected_id === ui.id ? " selected" : "")}
              key={ui.id}
              onClick={this._on_selected.bind(this, ui.id)}>
            {ui.name || ui.id}
          </div>
        );
      }
    });
    return uis.length > 0 && (
      <div key={app.id} style={{clear: "both"}}>
        <div>
          <strong>{app.name}</strong>
        </div>
        <div>
          { uis }
        </div>
      </div>
    );
  }

  render() {
    var view = $hope.app.stores.ui.active_view;
    var all_apps = $hope.app.stores.app.get_all_apps();
    var list = [];
    var cur_app = view ? view.get_app() : null;

    if (cur_app) {
      list.push(this.render_app(cur_app, false));
    }

    if (!cur_app || this.state.show_other_apps) {
      _.forOwn(all_apps, a => {
        if (a !== cur_app && !_.isEmpty(a.uis)) {
          list.push(this.render_app(a, true));
        }
      });
    }
    else if (_.keys(all_apps).length > 1) {
      list.push(
        <div key="other" style={{clear: "both"}}>
          <Button style={{marginTop: 8}}
            bsSize="small"
            bsStyle="warning"
            onClick={this._on_show_others}>{__("Other Apps")}</Button>
        </div>
      );
    }

    var open_btn_props;
    if (!this.state.selected_id) {
      open_btn_props = {
        disabled: true
      };
    }

    return (
      <Modal {...this.props} animation={true}>
        <Modal.Header closeButton>
          <Modal.Title>{__("Open UI")}</Modal.Title>
        </Modal.Header>
        <div className="modal-body hope-open-dialog-list">
          {list}
        </div>
        <div className="modal-footer">
          <Button bsStyle="default" onClick={this.props.onHide}>{__("Cancel")}</Button>
          <Button bsStyle="primary" {...open_btn_props} onClick={this._on_open}>{__("Open")}</Button>
        </div>
      </Modal>
    );
  }
}

