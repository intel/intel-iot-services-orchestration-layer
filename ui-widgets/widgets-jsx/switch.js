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

export default class SwitchWidget extends Widget {

  _on_change_state(e) {
    var val = e.target.checked;

    e.stopPropagation();
    this.send_data({
      state: val
    });
    this.$val = val;
    this.forceUpdate();
  }

  _on_settings_changed() {
    this.forceUpdate();
  }

  componentWillUpdate() {
    if (this.$pstate !== this.$state) {
      this.$pstate = this.$state;

      var data = this.get_data();
      if (_.isArray(data) && data.length > 0 && ("preset" in data[0])) {
        var nv = Boolean(data[0].preset);
        if (nv !== this.$val) {
          this.$val = nv;
          this.forceUpdate();
        }
      }
    }
  }

  render() {
    var w = this.props.widget;
    var sw =
      <div className="onoffswitch">
        <input onChange={this._on_change_state}
            type="checkbox"
            checked={this.$val}
            className="onoffswitch-checkbox"
            id={w.id + "-onoff"} />
        <label className="onoffswitch-label" htmlFor={w.id + "-onoff"}>
          <div className="onoffswitch-inner">
            <span className="on">{w.config.on}</span>
            <span className="off">{w.config.off}</span>
          </div>
          <div className="onoffswitch-switch" />
        </label>
      </div>;

    var body;
    if (w.config.label) {
      body =
        <div className="row" style={{
          width: "100%"
        }}>
          <div className="col-xs-6">
            <div style={{
              textAlign: "right",
              padding: "2px 10px 0 0"
            }}>
              {w.config.label}
            </div>
          </div>
          <div className="col-xs-6">
            {sw}
          </div>
        </div>;
    }
    else {
      body = sw;
    }

    return super.render(
      <div className="hv-center" style={{
        height: this.get_height()
      }}>
        {body}
      </div>
    );
  }
}


