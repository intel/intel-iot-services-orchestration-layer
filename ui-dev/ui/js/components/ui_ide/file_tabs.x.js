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
import {History, Link} from "react-router";
import DlgOpenUI from "./dlg_open_ui.x";

// Don't use class here as we need mixin 
var FileTabs = React.createClass({

  propTypes: {
    app: React.PropTypes.object,
    width: React.PropTypes.number.isRequired
  },

  mixins: [History],

  getInitialState() {
    return {
      origin: [],
      request: 0,
      show_dlg: false
    };
  },

  _on_open: function(id) {
    this.history.push(`/ui_ide/${id}`);
  },

  _close: function(id, e) {
    e.stopPropagation();
    e.preventDefault();

    var self = this;
    var ui_store = $hope.app.stores.ui;
    var oldview = ui_store.active_view;
    var v = ui_store.view(id);
    $hope.check(v, "FileTabs", "No such view: " + id);

    function close_force() {
      $hope.trigger_action("ui/close", {
        ui_id: id
      });

      if (_.isEmpty(ui_store.views)) {
        return self.history.push("/");
      }
      
      if (v === oldview) {
        var rcs = [];
        _.forOwn(ui_store.views, vx => {
          if (self.is_visible(vx)) {
            rcs.push(vx.id);
          }
        });
        if (rcs.length === 0) {
          rcs = _.keys(ui_store.views);
        }
        self.history.replace(`/ui_ide/${rcs[0]}`);
      }
      else {
        self.forceUpdate();
      }
    }

    if (!v.modified) {
      return close_force();
    }

    $hope.confirm(__("Close"),
      __("This would discard the changes of UI. Please make sure this is what you expect!"),
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

  _show_dlg(show) {
    this.setState({
      show_dlg: show
    });
  },

  componentDidMount() {
    this.componentWillReceiveProps();
  },

  componentWillReceiveProps: function() {
    var ul = $('<ul class="hope-ftabs">').appendTo(document.body);
    var width = {};
    var total = 0;

    _.forEach($hope.app.stores.ui.views, (v, id) => {
      if (this.is_visible(v)) {
        let ui = v.get_ui();
        let li = $('<li><span class="hope-ftabs-name">' + (ui.name || ui.id) + '</span><span class="fa fa-close hope-ftabs-btn"/></li>');
        li.appendTo(ul);
        width[id] = li.outerWidth(true);
        total += li.outerWidth(true);
        li.remove();
      }
    });

    ul.remove();

    if (total !== this.state.request) {
      this.setState({
        origin: width,
        request: total
      });
    }
  },

  render: function() {
    var ui_store = $hope.app.stores.ui;
    var view = ui_store.active_view;
    var avg = 0;

    var files = [];
    _.forEach(ui_store.views, (v, id) => {
      if (!view || !this.is_visible(v)) {
        return;
      }
      if (avg === 0) {
        //
        // TODO: if active_view is null (maybe intermediate stage now),
        // we using an approximate width temporarily, next redrawing will come soon.
        //
        avg = (this.props.width - 70 - (view ? this.state.origin[view.id] : 0)) / (_.size(ui_store.views) - 1) - 16; // border
      }
      
      let style;
      if (this.state.request + 70 > this.props.width && v !== view && this.state.origin[id] > avg) {
        style = {
          textOverflow: "ellipsis",
          overflow: "hidden",
          width: avg
        };
      }

      let ui = v.get_ui();
      files.push(
        <Link to={`/ui_ide/${id}`} key={id}>
          <li className={v === view ? "active" : ""}>
            <span style={style}
                className={"hope-ftabs-name" + (v.modified ? " modified" : "")}>
              {ui.name || ui.id}
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
            <li style={{width: 40}} onClick={this._show_dlg.bind(this, true)}>
              <span className="fa fa-folder-open-o fa-lg hope-ftabs-btn"/>
            </li>
          }
        </ul>
        <DlgOpenUI show={this.state.show_dlg}
          onHide={this._show_dlg.bind(this, false)}
          onClickOpen={this._on_open}/>
      </div>
    );
  }
});

export default FileTabs;
