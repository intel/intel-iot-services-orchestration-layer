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
import class_names from "classnames";
import {Row, Col} from "react-bootstrap";


export default class ColorPalette extends ReactComponent {

  _on_click(i) {
    var ide_store = $hope.app.stores.ide;
    if (_.isFunction(ide_store.palette.onSelect)) {
      ide_store.palette.onSelect(i);
    }
    $hope.trigger_action("ide/hide/palette", {});
  }

  render() {
    var items = [];

    var ide_store = $hope.app.stores.ide;

    var i, j, color;
    for (i = 0; i < 3; i++) {
      let row = [];
      for (j = 0; j < 3; j ++) {
        color = 3 * i + j + 1;
        row.push(<Col key={j} xs={4}>
        <i className={class_names("fa fa-circle", 
          $hope.color(color, "color", "hover"))}
          onClick={_.partial(this._on_click, color)} />
        </Col>);
      }
      items.push(<Row key={i}>{row}</Row>);
    }

    // 6px in top to remove the padding, border etc.
    return (
      <div className={class_names("hope-color-palette", this.props.className)}
      style={{
        position: "absolute",
        left: ide_store.palette.x,
        top: ide_store.palette.y - 6,
        padding: 3,
        display: ide_store.palette.visible ? "block" : "none"
      }}>
      {items}
      </div>
    );
  }
}

