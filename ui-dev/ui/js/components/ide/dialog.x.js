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
var {Modal, Input, Button} = require("react-bootstrap");
var ColorPicker = require("react-colorpickr");

var dlg_mount_node = null;
$(function() {
  function stoppropa(e) {
    e.stopPropagation(); //TODO: to avoid 'DEL' key propagation
  }
  var mount = $("<div></div>").appendTo("body");
  mount.keydown(stoppropa).keyup(stoppropa).keypress(stoppropa);
  dlg_mount_node = mount[0];
});

function _focus_input(selector) {
  var input = $(selector);
  if(input[0].setSelectionRange) {
    var len = input.val().length;
    input[0].setSelectionRange(len, len);
  } else {
    input.val(input.val());
  }
  input.focus();
}

var Dialog = React.createClass({
  _on_key_up(e) {
    if (e.keyCode === 13 && this.props.onOK) { // ENTER
      e.stopPropagation();
      this._on_click_ok();
    }
  },
  _on_click_ok() {
    this.props.onOK();
    this._on_close();
  },
  _on_close() {
    this.refs.dlg._onHide();
    process.nextTick(() => {
      ReactDOM.unmountComponentAtNode(dlg_mount_node);
    });
  },
  componentDidMount() {
    document.addEventListener("keyup", this._on_key_up);
  },
  componentWillUnmount() {
    document.removeEventListener("keyup", this._on_key_up);
  },
  render() {
    return (
      <Modal ref="dlg" show={true} onHide={this._on_close} {...this.props.modal}>
        <Modal.Header closeButton>
          <Modal.Title>{this.props.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body bsClass={this.props.clazz || "modal"}>
          {this.props.children}
        </Modal.Body>
        {!this.props.no_footer &&
        <Modal.Footer>
          <Button key="x" onClick={this._on_close}>{this.props.cancelStr || __("Cancel")}</Button>
          <Button key="c" bsStyle="primary" onClick={this._on_click_ok}>{this.props.okStr || __("OK")}</Button>
        </Modal.Footer>}
      </Modal>
    );
  }
});

//////////////////////////////////////////////////////////////////
// Create dialog
//////////////////////////////////////////////////////////////////

Dialog.show_create_dialog = function(title, ok_cb, ok_str, name_def, desc_def) {
  ReactDOM.render(
    <Dialog title={title}
      okStr={ok_str || __("Create")}
      onOK={() => {
        ok_cb({
          name: $("#Dlg_Create_Name").val(),
          description: $("#Dlg_Create_Desc").val()
        });
      }}>
      <Input type="text"
             label={__("Name")}
             id="Dlg_Create_Name"
             defaultValue={name_def || ""}
             placeholder={__("Enter Name")}/>
      <Input type="text"
             label={__("Description")}
             id="Dlg_Create_Desc"
             defaultValue={desc_def || ""}
             placeholder={__("Enter Description")}/>
    </Dialog>, dlg_mount_node);

  _focus_input("#Dlg_Create_Name");
};

//////////////////////////////////////////////////////////////////
// Text Edit dialog
//////////////////////////////////////////////////////////////////

Dialog.show_edit_dialog = function(title, ok_cb, txt, placeholder, ok_str) {
  ReactDOM.render(
    <Dialog title={title}
      okStr={ok_str || __("Save")}
      onOK={() => {
        ok_cb(input.val());
      }} >
      <Input type="text"
        id="dlg_edit_InPuT"
        className="form-control"
        placeholder={placeholder || ""}
        defaultValue={txt || ""} />
    </Dialog>, dlg_mount_node);

  _focus_input("#dlg_edit_InPuT");
};

//////////////////////////////////////////////////////////////////
// Icon picker dialog
//////////////////////////////////////////////////////////////////

Dialog.show_iconpicker_dialog = function(title, ok_cb, icon) {
  var newicon = icon;
  ReactDOM.render(
    <Dialog title={title}
      onOK={() => {
        ok_cb(newicon);
      }} >
      <div role="iconpicker" data-iconset="fontawesome" data-rows="8" data-cols="12" data-icon={"fa-" + icon} />
    </Dialog>, dlg_mount_node);
  $('div[role="iconpicker"]').iconpicker().on('change', e => newicon = e.icon);
};


//////////////////////////////////////////////////////////////////
// Color picker dialog
//////////////////////////////////////////////////////////////////

Dialog.show_colorpicker_dialog = function(title, ok_cb, color) {
  var newcr = color;
  ReactDOM.render(
    <Dialog title={title} modal={{
        dialogClassName: "hope-color-picker-modal"
      }}
      onOK={() => {
        ok_cb(newcr);
      }} >
      <div>
        <ColorPicker value={color} onChange={cr => newcr = "#" + cr.hex} />
      </div>
    </Dialog>, dlg_mount_node);
};

//////////////////////////////////////////////////////////////////
// Show SVG animation dialog
//////////////////////////////////////////////////////////////////

Dialog.show_svg_animation_dialog = function(title, svg) {
  ReactDOM.render(
    <Dialog clazz=" svg-dialog" no_footer={1} title={title} modal={{
        dialogClassName: "svg-dialog-content"
      }} >
      {svg}
    </Dialog>, dlg_mount_node);
};

//////////////////////////////////////////////////////////////////
// Show html help dialog
//////////////////////////////////////////////////////////////////

Dialog.show_html_dialog = function(url) {
  ReactDOM.render(
    <Dialog clazz=" html-dialog" no_footer={1} title={__("Help")} modal={{
        dialogClassName: "html-dialog-content"
      }}>
      <iframe id="html-dialog-iframe" src={url} />
    </Dialog>, dlg_mount_node);
};


module.exports = Dialog;
