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
var {Modal, Button} = require("react-bootstrap");

var dlg_mount_node = document.getElementById("hope-modal-dialog");

var NodeCfgDlg = React.createClass({

  _on_click_ok() {
    var node = this.props.node;
    var spec = node.$get_spec();
    var configuration = $hope.get_spec_configuration(spec.id);
    var view = $hope.app.stores.graph.active_view;

    if (configuration && configuration.onok) {
      try {
        configuration.onok.call(node);
      } catch (err) {
        console.log("onok", node.id, node.$name(), err.toString());
      }
    }

    var items = spec.extra ? spec.config.concat(spec.extra) : spec.config;
    _.forEach(items, cfg => {
      var input = $("#isol-input-" + cfg.name);
      if (input.length === 0) {
        return;
      }
      node.config[cfg.name] = input.val();
    });

    $hope.trigger_action("graph/change/node", {
      graph_id: view.id,
      id: node.id,
      data: {}    // will be merged in
    });

    this._close();
  },

  _on_click_cancel() {
    var node = this.props.node;
    var spec = node.$get_spec();
    var configuration = $hope.get_spec_configuration(spec.id);

    if (configuration && configuration.oncancel) {
      try {
        configuration.oncancel.call(node);
      } catch (err) {
        console.log("oncancel", node.id, node.$name(), err.toString());
      }
    }

    this._close();
  },

  _close() {
    this.refs.dlg._onHide();
    process.nextTick(() => {
      ReactDOM.unmountComponentAtNode(dlg_mount_node);
    });
  },

  componentDidMount() {
    var node = this.props.node;
    var spec = node.$get_spec();
    var items = spec.extra ? spec.config.concat(spec.extra) : spec.config;

    var script = $("script[data-spec='" + spec.id + "']");
    if (script.length === 0) {
      $("body").append(spec.$config_ui);

      script = $("script[data-spec='" + spec.id + "']");
    }
    var dlgcontainer = $("#iot-sol-style");
    var div = $("<div/>").appendTo(dlgcontainer);
    div.html(script.html());

    _.forEach(items, cfg => {
      var input = $("#isol-input-" + cfg.name);
      if (input.length === 0) {
        return;
      }
      if (input.attr('type') === "checkbox") {
        var val = node.config[cfg.name];
        input.prop('checked', val);
      } else {
        var val = node.config[cfg.name] || "";
        input.val(val);
      }
    });

    var configuration = $hope.get_spec_configuration(spec.id);
    if (configuration && configuration.oninitdialog) {
        try {
          configuration.oninitdialog.call(node);
        } catch (err) {
          console.log("oninitdialog", node.id, node.$name(), err.toString());
        }
    }
  },

  render() {
    var node = this.props.node;
    return (
      <Modal ref="dlg" show={true} onHide={this._close} {...this.props.modal}>
        <Modal.Header closeButton>
          <Modal.Title>{node.$get_name() + " - " + __("Config")}</Modal.Title>
        </Modal.Header>
        <Modal.Body bsClass={"modal"}>
          <div id="iot-sol-style" className="modal-body" />
        </Modal.Body>
        <Modal.Footer>
          <Button key="x" onClick={this._on_click_cancel}>{__("Cancel")}</Button>
          <Button key="c" bsStyle="primary" onClick={this._on_click_ok}>{ __("OK")}</Button>
        </Modal.Footer>
      </Modal>
    );
  }
});

module.exports = {
  show: function(node) {
    ReactDOM.render(<NodeCfgDlg node={node} />, dlg_mount_node);
  }
};