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

export default class SearchBox extends ReactComponent {
  constructor(props) {
    super();
    this.state = {value: props.initialSearchString || ""};
  }

  static propTypes = {
    onSubmit: React.PropTypes.func,     // f(value)
    onChange: React.PropTypes.func,     // f(value)
    initialSearchString: React.PropTypes.string
  };


  _on_change(e) {
    this.setState({value: e.target.value});
    if (_.isFunction(this.props.onChange)) {
      this.props.onChange(e.target.value);
    }
  }

  _on_submit(e) {
    e.stopPropagation();
    e.preventDefault();
    if (_.isFunction(this.props.onSubmit)) {
      this.props.onSubmit(this.state.value);
    }
  }

  // we need this to handle the cancel
  _on_key_down(e) {
    if (e.keyCode === 27) {   // escape
      this.setState({value: ""});
      if (_.isFunction(this.props.onChange)) {
        this.props.onChange("");
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.initialSearchString || ""
    });
  }

  componentDidMount() {
    var dom = this.refs.input;
    dom.addEventListener("keydown", this._on_key_down);
    if (this.state.value.length > 0) {
      dom.focus();
    }
  }

  componentWillUnmount() {
    this.refs.input.removeEventListener("keydown",
      this._on_key_down);
  }

  render() {
    return (
      <div className="hope-search-box row">
      <form onSubmit={this._on_submit}>
      <div className="col-sm-12">
          <div className="input-group">
            <input type="search" ref="input" className="form-control" 
              placeholder={__("Search")}
              value={this.state.value}
              onChange={this._on_change} />
            <span className="input-group-addon">
              <button type="submit">
                <span className="fa fa-search"></span>
              </button>  
            </span>
          </div>
      </div>
      </form>
      </div>          
    );
  }
}

