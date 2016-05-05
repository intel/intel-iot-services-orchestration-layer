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
function click(val, e) {
  e.stopPropagation();
  this.$preset = val;
  this.forceUpdate();
  this.send_data({
    value: val
  });
}

export default class RadioWidget extends Widget {

  _on_settings_changed() {
    this.forceUpdate();
  }

  render() {
    var w = this.props.widget;
    var align = "hv-center";
    var buttons = [];
    _.forEach(w.config.buttons, b => {
      var name = b.name;
      var val = b.value || name;
      if (name) {
        buttons.push(<div key={name} onClick={click.bind(this, val)}>
          <input name={w.name} type="radio" value={val} checked={this.$preset === val} />
          {" " + name}
        </div>);
      }
    });
    switch(w.config.align) {
      case "left":    align = "left-center";  break;
      case "right":   align = "right-center"; break;
      case "center":  align = "hv-center";    break;
    }
    return super.render(
      <div className={"match-parent " + align} style={{padding: "6px"}}>
        <div style={{textAlign: "left"}}>
          <form>{buttons}</form>
        </div>
      </div>
    );
  }
}

