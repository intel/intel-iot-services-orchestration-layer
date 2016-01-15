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
export default class Panel extends ReactComponent {

  constructor(props) {
    super();

    this.state = {
      left: props.left,
      top: props.top
    };
  }

  static propTypes = {
    icon: React.PropTypes.string.isRequired,
    id: React.PropTypes.string.isRequired
  };

  _on_click(e) {
    e.stopPropagation();
    $hope.trigger_action("ide/hide/palette", {});
  }

  _on_key(e) {
    e.stopPropagation();
  }

  _on_track(e) {
    e.stopPropagation();
    this.setState({
        left: this.state.left + e.ddx,
        top: this.state.top + e.ddy
      },
      () => {
        $hope.trigger_action("ide/move/panel", {
          panel: this.props.id,
          left: this.state.left,
          top: this.state.top
        });
      });
  }

  componentDidMount() {
    var dom = ReactDOM.findDOMNode(this);
    dom.addEventListener("keydown", this._on_key);
    dom.addEventListener("keyup", this._on_key);
    dom.addEventListener("keypress", this._on_key);

    if (!this.props.fixed) {
      var dom_node = dom.children[0]; // header
      PolymerGestures.addEventListener(dom_node, "trackstart", _.noop);
      PolymerGestures.addEventListener(dom_node, "track", _.noop);
      PolymerGestures.addEventListener(dom_node, "trackend", _.noop);
      dom_node.addEventListener("trackstart", this._on_track);
      dom_node.addEventListener("track", this._on_track);
      dom_node.addEventListener("trackend", this._on_track);
    }
  }

  componentWillUnmount() {
    var dom = ReactDOM.findDOMNode(this);
    dom.removeEventListener("keydown", this._on_key);
    dom.removeEventListener("keyup", this._on_key);
    dom.removeEventListener("keypress", this._on_key);

    if (!this.props.fixed) {
      var dom_node = dom.children[0]; // header
      PolymerGestures.removeEventListener(dom_node, "trackstart", _.noop);
      PolymerGestures.removeEventListener(dom_node, "track", _.noop);
      PolymerGestures.removeEventListener(dom_node, "trackend", _.noop);
      dom_node.removeEventListener("trackstart", this._on_track);
      dom_node.removeEventListener("track", this._on_track);
      dom_node.removeEventListener("trackend", this._on_track);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      left: nextProps.left,
      top: nextProps.top
    });
  }

  render() {
    var body;
    if (this.props.visible) {
      body =
        <div className="hope-panel-body">
          {this.props.children}
        </div>;
    }
    return (
      <div onClick={this._on_click} className="hope-panel" style={{
            position: "absolute",
            left: this.state.left + "px",
            top: this.state.top + "px",
            width: this.props.width + "px"}}>
        <div className="hope-panel-header" >
          <i className={"hope-panel-icon fa fa-" + this.props.icon} />
          <span className="hope-panel-title">
            {this.props.title}
          </span>
          {this.props.buttons}
        </div>
        { body }
      </div>
    );
  }
}