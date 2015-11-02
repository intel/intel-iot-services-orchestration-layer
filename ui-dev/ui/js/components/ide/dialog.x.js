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

function _on_close() {
  setTimeout(() => {
    React.unmountComponentAtNode(dlg_mount_node);
  }, 0);
}

var Dialog = React.createClass({
  render: function() {
    return (
      <div className="static-modal">
        <Modal onRequestHide={_on_close} {...this.props.modal}>
          <div className={"modal-body" + (this.props.clazz || "")}>
            {this.props.children}
          </div>
          { this.props.footer &&
            <div className="modal-footer">
              {this.props.footer}
            </div>
          }
        </Modal>
      </div>
    );
  }
});

//////////////////////////////////////////////////////////////////
// Text Edit dialog
//////////////////////////////////////////////////////////////////

Dialog.show_edit_dialog = function(title, ok_cb, txt, placeholder, ok_btn) {
  function _on_ok() {
    setTimeout(() => {
      React.unmountComponentAtNode(dlg_mount_node);
      if (ok_cb) {
        ok_cb(input.val());
      }
    }, 0);
  }

  var footer = [
    <Button onClick={_on_close}>Cancel</Button>,
    <Button onClick={_on_ok} bsStyle="primary">{ok_btn || "Save"}</Button>
  ];

  React.render(
    <Dialog modal={{
        title: title
      }}
      footer={footer} >
      <Input type="text"
        id="dlg_edit_InPuT"
        className="form-control"
        placeholder={placeholder || ""}
        defaultValue={txt || ""} />
    </Dialog>, dlg_mount_node);

  var input = $("#dlg_edit_InPuT");
  if(input[0].setSelectionRange) {
    var len = input.val().length;
    input[0].setSelectionRange(len, len);
  } else {
    input.val(input.val());
  }
  input[0].focus();
};

//////////////////////////////////////////////////////////////////
// Icon picker dialog
//////////////////////////////////////////////////////////////////

Dialog.show_iconpicker_dialog = function(title, ok_cb, icon) {
  var newicon = icon;
  function _on_ok() {
    setTimeout(() => {
      React.unmountComponentAtNode(dlg_mount_node);
      if (ok_cb) {
        ok_cb(newicon);
      }
    }, 0);
  }

  var footer = [
    <Button onClick={_on_close}>Cancel</Button>,
    <Button onClick={_on_ok} bsStyle="primary">Save</Button>
  ];

  React.render(
    <Dialog modal={{
        title: title
      }}
      footer={footer} >
      <div role="iconpicker" data-iconset="fontawesome" data-rows="8" data-cols="12" data-icon={"fa-" + icon} />
    </Dialog>, dlg_mount_node);
  $('div[role="iconpicker"]').iconpicker().on('change', e => newicon = e.icon);
};


//////////////////////////////////////////////////////////////////
// Show SVG animation dialog
//////////////////////////////////////////////////////////////////

Dialog.show_svg_animation_dialog = function(title, svg) {
  React.render(
    <Dialog clazz=" svg-dialog-body" modal={{
        dialogClassName: "svg-dialog-content",
        title: title
      }} >
      {svg}
    </Dialog>, dlg_mount_node);
};

module.exports = Dialog;
