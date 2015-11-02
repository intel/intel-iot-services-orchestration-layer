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
    this.props.onRequestHide();
  }

  render_app(app, all_others) {
    var graphs = [];
    _.forEach(app.graphs, g => {
      if (all_others || !_.find($hope.app.stores.graph.views, "id", g.id)) {
        graphs.push(
          <div className={"hv-center hope-open-dialog-item" + (this.state.selected_id === g.id ? " selected" : "")}
              key={g.id}
              onClick={this._on_selected.bind(this, g.id)}>
            {g.name}
          </div>
        );
      }
    });
    return graphs.length > 0 && (
      <div key={app.id} style={{clear: "both"}}>
        <div>
          <strong>{app.name}</strong>
        </div>
        <div>
          { graphs }
        </div>
      </div>
    );
  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var all_apps = $hope.app.stores.app.get_all_apps();
    var list = [];
    var cur_app = view ? view.get_app() : null;

    if (cur_app) {
      list.push(this.render_app(cur_app, false));
    }

    if (!cur_app || this.state.show_other_apps) {
      _.forOwn(all_apps, a => {
        if (a !== cur_app && !_.isEmpty(a.graphs)) {
          list.push(this.render_app(a, true));
        }
      });
    }
    else if (_.keys(all_apps).length > 1) {
      list.push(
        <div key="others" style={{clear: "both"}}>
          <Button style={{marginTop: 8}}
            bsSize="small"
            bsStyle="warning"
            onClick={this._on_show_others}>Other Apps</Button>
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
      <Modal {...this.props} title="Open Workflow" animation={true}>
        <div className="modal-body hope-open-dialog-list">
          {list}
        </div>
        <div className="modal-footer">
          <Button bsStyle="primary" {...open_btn_props} onClick={this._on_open}>Open</Button>
          <Button bsStyle="default" onClick={this.props.onRequestHide}>Cancel</Button>
        </div>
      </Modal>
    );
  }
}

