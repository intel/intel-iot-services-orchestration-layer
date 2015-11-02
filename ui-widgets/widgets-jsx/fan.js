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

export default class FanWidget extends Widget {

  previous = false;
  timer = null;
  ang = 0;

  _on_settings_changed(prev, next) {
    if (prev.height !== next.height) {
      var svg = React.findDOMNode(this.refs.svg);
      var size = this.get_height();
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
    }
  }

  componentWillUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    super.componentWillUnmount();
  }

  componentDidUpdate() {
    var self = this;
    var dom = React.findDOMNode(self.refs.hdr);
    var data = self.get_data();
    if (_.isArray(data) && data.length > 0) {
      var on = Boolean(data[0].state);
      if (on === self.previous) {
        return;
      }
      self.previous = on;

      if (on) {
        self.timer = setInterval(() => {
            dom.setAttribute("transform", "rotate(" + self.ang + " 120 110)");
            self.ang += 30;
          }, 100);
      }
      else {
        if (self.timer) {
          clearTimeout(self.timer);
          self.timer = null;
        }
      }
    }
  }

  render() {
    var size = this.get_height();

    return super.render(
      <div style={{
        width: "100%",
        textAlign: "center"
      }}>
        <svg ref="svg" width={size} height={size} viewBox="0 0 240 240"
            strokeLinecap="null" strokeLinejoin="null"
            strokeWidth="3" stroke="#eee" fill="none">
          <g ref="hdr" strokeWidth="0" fill="#FFF">
            <ellipse ry="32" rx="16" cy="67" cx="120" />
            <ellipse ry="16" rx="32" cy="110" cx="77" />
            <ellipse ry="16" rx="32" cy="110" cx="163" />
            <ellipse ry="32" rx="16" cy="153" cx="120" />
          </g>
          <circle r="83" cy="110" cx="120" />
          <circle r="10" cy="110" cx="120" />
          <ellipse ry="8" rx="74" cy="215" cx="120" />
          <line y2="207" x2="96" y1="191" x1="106" />
          <line y2="207" x2="147" y1="190" x1="138" />
        </svg>
      </div>
    );
  }
}


