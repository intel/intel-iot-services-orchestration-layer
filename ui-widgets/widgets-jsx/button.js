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
function emit(value, e) {
  e.stopPropagation();
  if (!this.prev_state === !value) {
    return;
  }

  this.prev_state = value;

  this.send_data({
    event: value
  });
}

export default class ButtonWidget extends Widget {

  _on_settings_changed() {
    this.forceUpdate();
  }

  _on_click(e) {
    var w = this.props.widget;
    e.stopPropagation();
    switch (w.config.action) {
      case "event":
        this.send_data({
          event: w.config.message
        });
        break;
      case "ui":
        this.switch_ui(w.config.target_ui);
        break;
    }
  }

  render() {
    var w = this.props.widget;
    var props = {};
    switch (w.config.action) {
      case "event":
      case "ui":
        props.onClick = this._on_click;
        break;
      case "twoev":
        props.onMouseDown = props.onTouchStart = emit.bind(this, true);
        props.onMouseUp = props.onTouchEnd = props.onMouseOut = emit.bind(this, false);
        break;
    }
    return super.render(
      <div className="hv-center" style={{
        height: this.get_height()
      }}>
        <button {...props}
          className={"btn btn-" + (w.config.style || "default")}>
          {w.config.caption || "Button"}
        </button>
      </div>
    );
  }
}


