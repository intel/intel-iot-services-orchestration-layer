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
//////////////////////////////////////////////////////////////////
// TreeList - show a tree in list style
// 
// Tree has Nodes, each Node could be the leaf or be parent of other nodes
// The node which has children could be expanded
//
// Usage:
// <List>
//   <Node>
//     <..>
//     
//     <Node> <...> </Node>
//     <Node> <...> </Node>
//   </Node>
// </List>
// 
// NOTE that for a Node, we handle its children in a special way, i.e.
// all immediate chidlren that is a <Node> would be controlled by its parent
// i.e. parent controls its layout and visiblity
// 
//////////////////////////////////////////////////////////////////

import {Row, Col, Collapse} from "react-bootstrap";
import class_names from "classnames";


var Node = React.createClass({
  displayName: "TreeNode",

  propTypes: {
    defaultExpanded: React.PropTypes.bool,
    onToggle: React.PropTypes.func      // function(new_expand_state)
  },

  _on_toggle(e) {
    e.preventDefault();
    var new_expanded = !this.state.expanded;
    var dom = $(this.refs.toggle_area);
    if (new_expanded) {
      dom.addClass("hope-tree-node__is-expanded")
         .removeClass("hope-tree-node__not-expanded");
    } else {
      dom.removeClass("hope-tree-node__is-expanded")
         .addClass("hope-tree-node__not-expanded");
    }
    this.setState({expanded: new_expanded});
    if (_.isFunction(this.props.onToggle)) {
      this.props.onToggle(new_expanded);
    }
  },

  getInitialState() {
    return {
      expanded: this.props.defaultExpanded
    };
  },

  componentWillReceiveProps(nextProps) {
    this.setState({
      expanded: nextProps.defaultExpanded
    });
  },

  render() {
    // collect all children
    var normal_children = [], children = [];


    React.Children.forEach(this.props.children, e => {
      if (e.type === Node) {
        children.push(e);
      } else {
        normal_children.push(e);
      }
    });


    var toggle_area_style = this.state.expanded ? 
      "hope-tree-node__is-expanded" : "hope-tree-node__not-expanded";

    return (
      <div className={class_names(this.props.className, "hope-tree-node")}>
        <div ref="toggle_area" 
             className={class_names("hope-tree-node-itself", toggle_area_style)}
             onClick={this._on_toggle} >
          {normal_children}
        </div>
        {this.props.defaultExpanded !== undefined &&
          <Collapse in={this.state.expanded}>
            <div>{children}</div>
          </Collapse>
        }
      </div>
    );
  }
});



class ExpandSign extends ReactComponent {
  render() {
    return (
      <div>
      <i className="fa fa-caret-down hope-tree-node__sign-expanded"/>
      <i className="fa fa-caret-right hope-tree-node__sign-collapsed"/>
      </div>
    );
  }
}


class Item extends ReactComponent {
  static propTypes = {
    text: React.PropTypes.string.isRequired,
    indent: React.PropTypes.number.isRequired
  };

  render() {
    var indent;
    if (this.props.indent > 0) {
      indent = <Col xs={this.props.indent}/>;
    }
    return (
      <Row className={this.props.className}>
        {indent} 
        <Col className="text-center" xs={1}><ExpandSign/></Col>
        <Col xs={11 - this.props.indent}>{this.props.text}</Col>
      </Row>
    );
  }
}


export default {Node, Item, ExpandSign};
