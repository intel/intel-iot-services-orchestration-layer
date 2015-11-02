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

export default class EditWidget extends Widget {

  $txt = "";
  $pstate = null;

  _on_settings_changed() {
    this.forceUpdate();
  }

  _on_submit(e) {
    e.stopPropagation();
    this.send_data({
      text: this.$txt
    });
  }

  _on_change(e) {
    if (this.$txt !== e.target.value) {
      this.$txt = e.target.value;
      this.forceUpdate();

      if (this.props.widget.config.auto_submit) {
        this.send_data({
          text: this.$txt
        });
      }
    }
  }

  _on_key_down(e) {
    if (e.keyCode === 13) {   // enter
      this.send_data({
        text: this.$txt
      });
    }
  }

  componentDidMount() {
    super.componentDidMount();

    React.findDOMNode(this.refs.input).addEventListener("keydown",
      this._on_key_down);
  }

  componentWillUnmount() {
    React.findDOMNode(this.refs.input).removeEventListener("keydown", 
      this._on_key_down);
    super.componentWillUnmount();
  }

  componentWillUpdate() {
    if (this.$pstate !== this.$state) {
      this.$pstate = this.$state;

      var data = this.get_data();
      if (_.isArray(data) && data.length > 0 && ("preset" in data[0])) {
        var nv = String(data[0].preset);
        if (this.$txt !== nv) {
          this.$txt = nv;
          this.forceUpdate();
        }
      }
    }
  }

  render() {
    var w = this.props.widget;
    var body;

    switch (w.config.type)
    {
      case "sle":
        body =
          <div className="input-group">
            <input type="text" ref="input" className="form-control" 
              placeholder={w.config.placeholder || ""} 
              value={this.$txt}
              onChange={this._on_change} />
            {w.config.glyph &&
              <span onClick={this._on_submit} className={"input-group-addon fa fa-" + w.config.glyph} />
            }
          </div>;
        break;
      case "mle":
        body =
          <textarea onChange={this._on_change}
            value={this.$txt}
            style={{
              resize: "none",
              width: "100%",
              height: "100%"
            }}/>;
        break;
    }
    return super.render(
      <div style={{
        height: "100%",
        padding: "6px"
      }}>
        <form className="form-horizontal">
          {body}
        </form>
      </div>
    );
  }
}


