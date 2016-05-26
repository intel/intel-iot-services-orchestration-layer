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
    if (this.props.onOK() === false) {
      return;
    }
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
    <Dialog title={title} modal={{backdrop: "static"}}
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
    <Dialog title={title} modal={{backdrop: "static"}}
      okStr={ok_str || __("Save")}
      onOK={() => {
        ok_cb($("#dlg_edit_InPuT").val());
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


//////////////////////////////////////////////////////////////////
// Change password dialog
//////////////////////////////////////////////////////////////////

Dialog.show_chpass_dialog = function(user, ok_cb) {
  ReactDOM.render(
    <Dialog title={__("Change Password")} modal={{backdrop: "static"}}
      onOK={() => {
        var old = $("#dlg_chpass_old").val();
        var np = $("#dlg_chpass_new").val();
        var np2 = $("#dlg_chpass_new2").val();
        if (np !== np2) {
          $hope.alert(__("Error"), __("Password mismatched"), "error");
          return false;
        }
        ok_cb(old, np);
      }} >
      <Input type="text" label={__("User Name")} disabled={true} defaultValue={user} />
      <Input type="password" id="dlg_chpass_old"  label={__("Old password")} />
      <Input type="password" id="dlg_chpass_new"  label={__("New password")} />
      <Input type="password" id="dlg_chpass_new2" label={__("Confirm password")} />
    </Dialog>, dlg_mount_node);

  _focus_input("#dlg_chpass_old");
};

//////////////////////////////////////////////////////////////////
// Add new user dialog
//////////////////////////////////////////////////////////////////

Dialog.show_new_user_dialog = function(cb) {
  ReactDOM.render(
    <Dialog title={__("Add New User")} modal={{backdrop: "static"}}
      onOK={() => {
        var name = $("#au_name").val();
        var role = $("#au_role").val();
        var p1 = $("#au_p1").val();
        var p2 = $("#au_p2").val();
        if (p1 !== p2) {
          $hope.alert(__("Error"), __("Password mismatched"), "error");
          return false;
        }
        cb({
          name: name,
          passwd: p1,
          role: role
        });
      }} >
      <Input type="text" id="au_name" label={__("User Name")} />
      <div className="form-group">
        <label className="control-label">
          <span>{__("Role")}</span>
        </label>
        <select className="form-control" defaultValue="guest" id="au_role">
          <option value="admin">{__("Administrator")}</option>
          <option value="guest">{__("Guest")}</option>
        </select>
      </div>
      <Input type="password" id="au_p1" label={__("Password")} />
      <Input type="password" id="au_p2" label={__("Confirm password")} />
    </Dialog>, dlg_mount_node);

  _focus_input("#au_name");
},

module.exports = Dialog;
