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
export default class EdgePreview extends ReactComponent {

  state = {
    sX: 0,
    sY: 0,
    tX: 0,
    tY: 0
  };

  render() {
    var sX = this.state.sX;
    var sY = this.state.sY;
    var tX = this.state.tX;
    var tY = this.state.tY;

    if (Math.abs(sX - tX) < 2 && Math.abs(sY - tY) < 2) {
      return null;
    }

    // Organic / curved edge
    var CURVE = $hope.config.graph.node_size.width;
    var c1X, c1Y, c2X, c2Y;
    if (tX - 5 < sX) {
      var curveFactor = (sX - tX) * CURVE / 200;
      if (Math.abs(tY - sY) < CURVE / 2) {
        // Loopback
        c1X = sX + curveFactor;
        c1Y = sY - curveFactor;
        c2X = tX - curveFactor;
        c2Y = tY - curveFactor;
      } else {
        // Stick out some
        c1X = sX + curveFactor;
        c1Y = sY + (tY > sY ? curveFactor : -curveFactor);
        c2X = tX - curveFactor;
        c2Y = tY + (tY > sY ? -curveFactor : curveFactor);
      }
    } else {
      // Controls halfway between
      c1X = sX + (tX - sX) / 2;
      c1Y = sY;
      c2X = c1X;
      c2Y = tY;
    }

    var path = [
        "M", sX, sY,
        "C", c1X, c1Y, c2X, c2Y, tX, tY
        ].join(" ");

    return (
      <g className="hope-graph-edge-preview" >
        <path d={path} />
      </g>
    );
  }
}
