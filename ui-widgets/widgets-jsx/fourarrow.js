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
function emit(name, value, e) {
  var w = this.props.widget;

  e.stopPropagation();

  if (!this[name] === !value) {
    return;
  }

  this[name] = value;

  if (value === true || w.config.relev) {
    this.send_data({
      [name]: value
    });
  }

  if (w.config.pressed) {
    var svg = this.refs[name];
    svg.style.fill = (value ? w.config.pressed : w.config.color) || "#fff";
  }
}

export default class FourArrowWidget extends Widget {

  _on_settings_changed(prev, next) {
    if (prev.height !== next.height) {
      var svg = this.refs.svg;
      var size = this.get_height();
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
    }
  }

  render() {
    var w = this.props.widget;
    var size = this.get_height();

    var N1 = emit.bind(this, "N", true);
    var N0 = emit.bind(this, "N", false);
    var W1 = emit.bind(this, "W", true);
    var W0 = emit.bind(this, "W", false);
    var S1 = emit.bind(this, "S", true);
    var S0 = emit.bind(this, "S", false);
    var E1 = emit.bind(this, "E", true);
    var E0 = emit.bind(this, "E", false);

    return super.render(
      <div style={{
        width: "100%",
        textAlign: "center"
      }}>
        <svg ref="svg" width={size} height={size} viewBox="0 0 120 120"
          fill={w.config.color || "#fff"} stroke="none">
          <polygon ref="N" points="60,0 40,40 80,40"
            onMouseDown={N1}
            onMouseUp={N0}
            onMouseOut={N0}
            onTouchStart={N1}
            onTouchEnd={N0} />
          <polygon ref="W" points="0,60 40,40 40,80"
            onMouseDown={W1}
            onMouseUp={W0}
            onMouseOut={W0}
            onTouchStart={W1}
            onTouchEnd={W0} />
          <polygon ref="S" points="60,120 40,80 80,80"
            onMouseDown={S1}
            onMouseUp={S0}
            onMouseOut={S0}
            onTouchStart={S1}
            onTouchEnd={S0} />
          <polygon ref="E" points="120,60 80,40 80,80"
            onMouseDown={E1}
            onMouseUp={E0}
            onMouseOut={E0}
            onTouchStart={E1}
            onTouchEnd={E0} />
        </svg>
      </div>
    );
  }
}

