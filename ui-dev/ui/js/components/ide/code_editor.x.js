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
var AceEditor  = require("react-ace");

require("brace/mode/javascript");
require("brace/theme/monokai");

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
var class_names = require("classnames");

var CodeEditor = React.createClass({
  propTypes: {
    id: React.PropTypes.string.isRequired,
    code: React.PropTypes.string
  },

  _on_click: function() {
    $hope.trigger_action("ide/hide/code", {});
  },



  render: function() {
    var editor;
    var code = this.props.code;
    if (code) {
      editor = (<div className={class_names("hope-code-editor", this.props.className)}
        id={this.props.id} key={this.props.id} 
        style={{
          zIndex: 100       /* TODO maybe shouldn't hard code this */
        }}>       
      <button onClick={this._on_click}> Close </button>
      <AceEditor mode="javascript" theme="monokai" 
        name={this.props.id + "_ace"}
        width="100%"
        height="100%"
        value={code} />
      </div>);
    }
    return (
      <div>
      <ReactCSSTransitionGroup transitionName="hope-code-editor">
      {editor}
      </ReactCSSTransitionGroup>
      </div>
    );
  }
});


module.exports = CodeEditor;