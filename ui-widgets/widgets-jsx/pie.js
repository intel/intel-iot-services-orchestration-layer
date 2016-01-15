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
var DEFAULT_COLORS = ["#ff1111", "#11ff11", "#1111ff", "#ffff11", "#11ffff", "#ff11ff", "#ffaa55", "#ff55aa", "#55ffaa", "#aa55ff"];

export default class PieWidget extends Widget {

  chart_obj = null;

  _on_settings_changed() {
    this.forceUpdate();
  }

  update_chart(input) {
    var w = this.props.widget;
    var ctx = this.refs.canvas.getContext("2d");

    var data = [], idx = 0;
    _.forOwn(input, (v, k) => {
      var color = _.result(_.find(w.config.colors, 'name', k), 'value') || DEFAULT_COLORS[idx++ % DEFAULT_COLORS.length];
      data.push({
        label: k,
        value: v,
        color: color,
        highlight: color
      });
    });

    if (this.chart_obj) {
      this.chart_obj.destroy();
    }
    var options = {
      animation: false
    };
    if (w.config.type === "Doughnut") {
      options.percentageInnerCutout = w.config.percentageInnerCutout;
    }
    this.chart_obj = new Chart(ctx)[w.config.type](data, options);
  }

  componentDidMount() {
    if (this.chart_obj) {
      this.chart_obj.destroy();
      this.chart_obj = null;
    }
    super.componentDidMount();
  }

  componentDidUpdate() {
    var data = this.get_data();
    if (_.isArray(data) && data.length > 0 && _.isObject(data[0].input)) {
      this.update_chart(data[0].input);
    }
  }

  render() {
    var h = this.get_height();
    var w = this.get_width();

    return super.render(
      <div style={{
        height: "100%",
        width: "100%",
        padding: "6px"
      }}>
        <canvas ref="canvas" key={w + "x" + h} height={h - 12} width={w - 12}/>
      </div>
    );
  }
}


