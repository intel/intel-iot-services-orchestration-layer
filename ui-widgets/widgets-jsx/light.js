/******************************************************************************
Copyright (c) 2016, Intel Corporation

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
var CSS = ".indicator-light{border-radius:50%;width:22px;height:22px;border:2px solid #3d3d3d;float:left;background-color:#222;margin:0 10px;} .indicator-light.on {background-color:#FFC773;box-shadow: 0px 0px 15px #FF9900;border-color:#FDF1DF;} .indicator-text {text-align:left;margin-top:10px;}";

export default class LightWidget extends Widget {

  $status = false;

  componentDidMount() {
    super.componentDidMount();

    this.set_css("LightWidget", CSS);
  }

  componentWillUpdate() {
    var data = this.get_data();
    if (_.isArray(data) && data.length > 0) {
      var on = Boolean(data[0].state);
      if (on === this.$status) {
        return;
      }
      this.$status = on;
      this.forceUpdate();
    }
  }

  render() {
    var w = this.props.widget;
    return super.render(
      <div className="hv-center" style={{
        height: this.get_height(),
        width: "100%"
      }}>
        <div>
          <span className={"indicator-light" + (this.$status ? " on" : "")} />
          <span className="indicator-text">{(this.$status ? w.config.on : w.config.off) || ""}</span>
        </div>
      </div>
    );
  }
}


