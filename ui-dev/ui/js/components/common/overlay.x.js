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
import {Popover, Overlay} from "react-bootstrap";
import createChainedFunction from "react-bootstrap/lib/utils/createChainedFunction";
import contains from 'dom-helpers/query/contains';

var _mountNode = document.createElement("div");
var _prev;
var _tleave, _tenter;

function isOneOf(one, of) {
  return Array.isArray(of) ? of.indexOf(one) >= 0 : one === of;
}

function handleMouseOut(handler, e) {
  let target = e.currentTarget;
  let related = e.relatedTarget || e.nativeEvent.toElement;

  if (!related || related !== target && !contains(target, related)) {
    handler(e);
  }
}

function cancelTimer() {
  if (_tenter) {
    clearTimeout(_tenter);
    _tenter = null;
  }
  if (_tleave) {
    clearTimeout(_tleave);
    _tleave = null;
  }
}

export default React.createClass({
  __show() {
    _tenter = null;
    if (!this._overlay) {
      return;
    }
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this, this._overlay, _mountNode
    );
    _prev = this;
  },

  __hide() {
    ReactDOM.unmountComponentAtNode(_mountNode);
    _prev = null;
  },

  show() {
    cancelTimer();
    if (_prev === this) {
      return;
    }
    if (_prev) {
      setTimeout(()=> {
        this.__hide();
        _tenter = setTimeout(this.__show, 500);
      }, 0);
    }
    else {
      _tenter = setTimeout(this.__show, 500);
    }
  },

  hide() {
    if (_prev !== this) {
      return;
    }
    setTimeout(this.__hide, 0);
  },

  toggle() {
    if (_prev !== this) {
      this.show();
    }
    else {
      this.hide();
    }
  },

  getOverlayTarget() {
    return ReactDOM.findDOMNode(this);
  },

  onMouseOut() {
    cancelTimer();
    _tleave = setTimeout(()=> {
      _tleave = null;
      this.hide();
    }, 600);
  },

  render() {
    const child = React.Children.only(this.props.children);
    const triggerProps = child.props;

    var o = this.props.overlay;
    this._overlay = o ?
      <Overlay show={true}
        rootClose={true}
        onHide={this.hide}
        placement={this.props.placement || "right"}
        target={this.getOverlayTarget}>
        {
          React.cloneElement(_.isString(o) ? <Popover id={o}>{o}</Popover> : o, {
            onMouseOver: cancelTimer,
            onMouseOut: handleMouseOut.bind(this, this.hide)
          }) 
        }
      </Overlay> : null;

    const trigger = this.props.trigger || ["hover", "focus"];
    const props = {};
    props.onClick = createChainedFunction(triggerProps.onClick, this.props.onClick);

    if (isOneOf("click", trigger)) {
      props.onClick = createChainedFunction(this.toggle, props.onClick);
    }

    if (isOneOf("hover", trigger)) {
      props.onMouseOver = createChainedFunction(this.show, this.props.onMouseOver, triggerProps.onMouseOver);
      props.onMouseOut = createChainedFunction(handleMouseOut.bind(this, this.onMouseOut), this.props.onMouseOut, triggerProps.onMouseOut);
    }

    if (isOneOf("focus", trigger)) {
      props.onFocus = createChainedFunction(this.show, this.props.onFocus, triggerProps.onFocus);
      props.onBlur = createChainedFunction(this.props.onBlur, triggerProps.onBlur);
    }

    return React.cloneElement(child, props);
  }
});