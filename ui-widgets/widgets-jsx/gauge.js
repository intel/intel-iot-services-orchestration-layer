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
import D3Gauge from "d3-gauge-x";

var SIMPLE_CSS = ".d3-gauge.simple .outer-circle {fill:#ccc;stroke:#000;stroke-width:0.5px;} .d3-gauge.simple .inner-circle {fill:#fff;stroke:#E0E0E0;stroke-width:2px;} .d3-gauge.simple .label {fill:#333;font-size:24px;} .d3-gauge.simple .major-tick {stroke:#333;stroke-width:2px;} .d3-gauge.simple .minor-tick {stroke:#666;stroke-width:1px;} .d3-gauge.simple .major-tick-label {fill:darkblue;stroke-width:2px;font-size:15px;}.d3-gauge.simple .needle {fill:#dc3912;stroke:#c63310;fill-opacity:0.7;} .d3-gauge.simple .needle-container {fill:#4684EE;stroke:#666;fill-opacity:1;}.d3-gauge.simple .current-value {fill:#000;stroke-width:0px;} .d3-gauge.simple .green-zone {fill:#FF9900} .d3-gauge.simple .yellow-zone {fill:#FF9900} .d3-gauge.simple .red-zone {fill:#DC3912}";

export default class GaugeWidget extends Widget {

  gauge_object = null;

  _on_settings_changed() {
    this.init_gauge();
  }

  init_gauge() {
    var w = this.props.widget;
    var size = this.get_height();
    var config = {
      clazz: "simple",
      label: w.config.title || "",
      size: size - 4,
      min: w.config.min || 0,
      max: w.config.max || 100,
      minorTicks: w.config.minor_ticks || 5,
      zones: []
    };

    function valToPercent(v) {
      var range = config.max - config.min;
      return (v - config.min) / range;
    }

    if (!isNaN(w.config.yellow_min) && !isNaN(w.config.yellow_max)) {
      config.zones.push({clazz: "yellow-zone", from: valToPercent(w.config.yellow_min), to: valToPercent(w.config.yellow_max) });
    }
    if (!isNaN(w.config.red_min) && !isNaN(w.config.red_max)) {
      config.zones.push({clazz: "red-zone", from: valToPercent(w.config.red_min), to: valToPercent(w.config.red_max) });
    }

    $(this.refs.container).empty();
    this.gauge_object = new D3Gauge(this.refs.container, config);
  }

  componentDidMount() {
    super.componentDidMount();

    this.set_css("d3gauge", SIMPLE_CSS);
    this.init_gauge();
  }

  componentWillUnmount() {
    $(this.refs.container).empty();
    this.gauge_object = null;
    super.componentWillUnmount();
  }

  componentDidUpdate() {
    var data = this.get_data();
    if (_.isArray(data) && data.length > 0) {
      var val = parseFloat(data[0].value);
      this.gauge_object.write(val);
    }
  }

  render() {
    return super.render(
      <div style={{
        width: "100%",
        textAlign: "center"
      }}>
        <div ref="container" />
      </div>
    );
  }
}


