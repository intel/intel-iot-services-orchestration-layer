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
import {ModalTrigger} from "react-bootstrap";
import {Navigation, Link} from "react-router";
import DlgOpenGraph from "./dlg_open_graph.x";

// Don't use class here as we need mixin 
var FileTabs = React.createClass({

  propTypes: {
    app: React.PropTypes.object.isRequired,
    width: React.PropTypes.number.isRequired
  },

  mixins: [Navigation],

  _on_open: function(id) {
    this.transitionTo("ide", {id: id});
  },

  _close: function(id, e) {
    e.stopPropagation();
    e.preventDefault();

    var self = this;
    var graph_store = $hope.app.stores.graph;
    var oldview = graph_store.active_view;
    var v = graph_store.view(id);
    $hope.check(v, "FileTabs", "No such view: " + id);

    function close_force() {
      $hope.trigger_action("graph/close", {
        graph_id: id
      });

      if (_.isEmpty(graph_store.views)) {
        return self.transitionTo("/", {});
      }
      
      if (v === oldview) {
        var rcs = [];
        _.forOwn(graph_store.views, vx => {
          if (self.is_visible(vx)) {
            rcs.push(vx.id);
          }
        });
        if (rcs.length === 0) {
          rcs = _.keys(graph_store.views);
        }
        self.replaceWith("ide", {id: rcs[0]});
      }
      else {
        self.forceUpdate();
      }
    }

    if (!v.modified) {
      return close_force();
    }

    $hope.confirm("Close", 
      "This would discard the changes of workflow. Please make sure this is what you expect!",
      "warning", () => {
      close_force();
    });
  },

  is_visible(v) {
    var app = this.props.app;
    if (!app) {
      return true;
    }
    return v.get_app_id() === app.id;
  },

  componentWillUpdate: function() {
    var ul = $('<ul class="hope-ftabs">').appendTo(document.body);
    var width = {};
    var total = 0;

    _.forEach($hope.app.stores.graph.views, (v, id) => {
      if (this.is_visible(v)) {
        var li = $('<li><span class="hope-ftabs-name">' + v.graph.name + '</span><span class="fa fa-close hope-ftabs-btn"/></li>');
        li.appendTo(ul);
        width[id] = li.outerWidth(true);
        total += li.outerWidth(true);
        li.remove();
      }
    });

    ul.remove();
    this.$origin = width;
    this.$request = total;
  },

  render: function() {
    var graph_store = $hope.app.stores.graph;
    var view = graph_store.active_view;
    var avg = 0;

    var files = [];
    _.forEach(graph_store.views, (v, id) => {
      if (!view || !this.is_visible(v)) {
        return;
      }
      if (avg === 0) {
        //
        // TODO: if active_view is null (maybe intermediate stage now),
        // we using an approximate width temporarily, next redrawing will come soon.
        //
        avg = (this.props.width - 70 - (view ? this.$origin[view.id] : 0)) / (_.size(graph_store.views) - 1) - 16; // border
      }
      
      let style;
      if (this.$request + 70 > this.props.width && v !== view && this.$origin[id] > avg) {
        style = {
          textOverflow: "ellipsis",
          overflow: "hidden",
          width: avg
        };
      }
      files.push(
        <Link to="ide" params={{id: id}} key={id}>
          <li className={v === view ? "active" : ""}>
            <span style={style}
                className={"hope-ftabs-name" + (v.modified ? " modified" : "")}>
              {v.graph.name}
            </span>
            { v === view &&
              <span onClick={this._close.bind(this, id)} className="fa fa-close hope-ftabs-btn" />
            }
          </li>
        </Link>
      );
    }, this);

    return (
      <div className="hope-ftabs-wrapper" style={{width: this.props.width}}>
        <ul className="hope-ftabs">

          { files }

          { view &&
            <ModalTrigger modal={<DlgOpenGraph onClickOpen={this._on_open} />}>
              <li style={{width: 40}}>
                <span className="fa fa-folder-open-o fa-lg hope-ftabs-btn"/>
              </li>
            </ModalTrigger>
          }
        </ul>
      </div>
    );
  }
});

export default FileTabs;
