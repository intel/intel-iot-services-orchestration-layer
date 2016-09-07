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
import {Row} from "react-bootstrap";
import Dialog from "../../common/dialog.x";

export default class NodeHelpTopic extends ReactComponent {

  _on_cng() {
    Dialog.show_svg_animation_dialog("Cached Mode",
      require("./help_svg/cached.x"));
  }

  _on_bg() {
    Dialog.show_svg_animation_dialog("Buffered Mode",
      require("./help_svg/buffered.x"));
  }

  _on_mix() {
    Dialog.show_svg_animation_dialog("Mixed Mode",
      require("./help_svg/mixed.x"));
  }

  render() {
    return (
      <div className="hope-note">
          <Row className="hope-panel-details-row padding-left">
            <div>{__("Click each item for tips")}</div>
          </Row>
          <Row className="hope-panel-details-note-row" onClick={this._on_cng}>
            <div><i className="fa fa-hand-o-right"/>{" " + __("Cached Mode")}</div>
          </Row>
          <Row className="hope-panel-details-note-row" onClick={this._on_bg}>
            <div><i className="fa fa-hand-o-right"/>{" " + __("Buffered Mode")}</div>
          </Row>
          <Row className="hope-panel-details-note-row" onClick={this._on_mix}>
            <div><i className="fa fa-hand-o-right"/>{" " + __("Mixed Mode")}</div>
          </Row>
        </div>
    );
  }
}
