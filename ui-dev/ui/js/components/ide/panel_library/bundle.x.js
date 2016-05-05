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
import {Row, Col} from "react-bootstrap";
import {ExpandSign} from "../tree.x";
import class_names from "classnames";

export default class Bundle extends ReactComponent {
  static propTypes = {
    bundle: React.PropTypes.object.isRequired
  };


  _on_color_selected(i) {
    $hope.trigger_action("spec/change/bundle_color", {
      bundle_id: this.props.bundle.id,
      color_id: i
    });
  }

  _on_click_color_palette(e) {
    e.stopPropagation();
    var rect = this.refs.color.getBoundingClientRect();
    $hope.trigger_action("ide/show/palette", {
      x: rect.left + rect.width + 10,
      y: rect.top,
      onSelect: this._on_color_selected
    });
  }


  render() {

    var bundle = this.props.bundle;
    return (
      <Row className="hope-panel-lib-view-first-level">
        <Col className="text-center" xs={1}><ExpandSign/></Col>
        <Col xs={9}>{bundle.name}</Col>
        <Col xs={2} className="text-center">
          <i ref="color"
            className={class_names("fa fa-circle", 
            $hope.color(bundle.$color_id, "color", "hover"))} 
            onClick={this._on_click_color_palette} />
        </Col>
      </Row>
    );
  }
}

