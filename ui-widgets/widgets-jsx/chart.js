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

export default class ChartWidget extends Widget {

  chart_obj = null;
  chart_data = {
    labels : [],
      datasets : [{
        fillColor : "rgba(220,220,220,0.2)",
        strokeColor : "rgba(220,220,220,1)",
        data : []
      }]
  };

  _on_settings_changed() {
    this.settings_changed = true;
    this.forceUpdate();
  }

  init_dataset() {
    var data = this.get_data();
    var vals = this.chart_data.datasets[0].data;
    var w = this.props.widget;
    var data_cache_size = w.$get_data_cache_size();
    if (vals.length !== data_cache_size) {
      var lables = new Array(data_cache_size);
      vals = new Array(data_cache_size);
      for (let i = 0; i < data_cache_size; i++) {
        lables[i] = i;
        vals[i] = 0;
      }
      this.chart_data.labels = lables;
      this.chart_data.datasets[0].data = vals;
      return;
    }

    if (this.chart_obj && _.isArray(data)) {
      var pts = this.chart_obj.datasets[0].points;
      if (data.length === data_cache_size) {
        for (let i = 0; i < data_cache_size; i++) {
          pts[i].value = data[i].series1;
        }
      }
      else {
        var offst = data_cache_size - data.length;
        for (let i = 0; i < data.length; i++) {
          pts[offst + i].value = data[i].series1;
        }
      }
    }
  }

  init_chart() {
    var w = this.props.widget;
    var canvas = React.findDOMNode(this.refs.canvas);
    var ctx = canvas.getContext("2d");

    if (this.chart_obj) {
      this.chart_obj.destroy();
    }
    this.chart_obj = new Chart(ctx).Line(this.chart_data, {
      animation: false,
      showScale: false,
      scaleShowGridLines: false,
      showTooltips: false,
      bezierCurve: !!w.config.bezier,
      datasetStrokeWidth: 1,
      pointDot: false,
      datasetFill: w.config.type === "area"
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.chart_data.labels = [];
    this.chart_data.datasets[0].data = [];
  }

  componentDidMount() {
    if (this.chart_obj) {
      this.chart_obj.destroy();
      this.chart_obj = null;
    }
    super.componentDidMount();
  }

  componentDidUpdate() {
    var h = this.get_height();
    var w = this.get_width();

    this.init_dataset();

    if (h !== this.$height || w !== this.$width || this.settings_changed) {
      this.$height = h;
      this.$width = w;
      this.settings_changed = false;
      this.init_chart();
    }
    else {
      this.chart_obj.update();
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


