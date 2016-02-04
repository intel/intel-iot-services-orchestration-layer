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
import {Row, Col} from "react-bootstrap";
import {Tabs, Tab} from "../ide/tabs.x";
import Dialog from "../ide/dialog.x";
import FONT_AWESOME from "../../lib/font-awesome.js";

var NAME_CFG = {
  name: "name",
  type: "string"
};

var CACHE_CFG = {
  name: "data_cache_size",
  display: "Cache Size",
  type: "int"
};

export default class WidgetDetails extends ReactComponent {

  static propTypes = {
    widget:         React.PropTypes.object.isRequired
  };

  constructor(props) {
    super();
  
    this.state = this._get_states(props.widget);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.widget !== this.props.widget) {
      this.setState(this._get_states(nextProps.widget));
    }
  }

  _get_states(w) {
    var states = {};
    var spec = $hope.app.stores.spec.get_spec(w.spec);
    if (spec) {
      var items = spec.extra ? spec.config.concat(spec.extra) : spec.config;
      _.forOwn(items, i => {
        if (i.name) {
          var v = i.name in w.config ? w.config[i.name] : i.default;
          states[i.name] = v === undefined || ((i.type === "int" || i.type === "number") && isNaN(v)) ? "" : v;
        }
      });
    }

    // special configuration
    states.name = w.name || "";
    states.data_cache_size = w.$get_data_cache_size();
    return states;
  }

  _on_change_xxx(cfg, e) {
    var w = this.props.widget;
    var view = $hope.app.stores.ui.active_view;
    var val;

    e.stopPropagation();
    switch(cfg.type) {
      case "boolean":
        val = e.target.checked;
        break;
      case "number":
        val = parseFloat(e.target.value);
        break;
      case "int":
        val = parseInt(e.target.value);
        break;
      default:
        val = e.target.value;
        break;
    }

    if (cfg === NAME_CFG || cfg === CACHE_CFG) {
      w[cfg.name] = val;
    } else {
      w.config[cfg.name] = val;
    }

    $hope.trigger_action("ui/change_widgets", {
      ui_id: view.id,
      widgets: [w]
    });

    this.setState({
      [cfg.name]: cfg.type === "boolean" ? val : e.target.value
    });
  }

  _on_change_glyphicon(cfg, e) {
    e.stopPropagation();
    Dialog.show_iconpicker_dialog(__("Change the icon"), icon => {
      var w = this.props.widget;
      var view = $hope.app.stores.ui.active_view;
      var val;
      if (_.startsWith(icon, "fa-")) {
        val = icon.substr(3);
      }
      else {
        val = "";
      }

      w.config[cfg.name] = val;

      $hope.trigger_action("ui/change_widgets", {
        ui_id: view.id,
        widgets: [w]
      });

      this.setState({
        [cfg.name]: val
      });
    },
    this.state[cfg.name] || "");
  }

  _on_change_color(cfg, e) {
    e.stopPropagation();
    Dialog.show_colorpicker_dialog(__("Change the color"), color => {
      var w = this.props.widget;
      var view = $hope.app.stores.ui.active_view;

      w.config[cfg.name] = color;

      $hope.trigger_action("ui/change_widgets", {
        ui_id: view.id,
        widgets: [w]
      });

      this.setState({
        [cfg.name]: color
      });
    },
    this.state[cfg.name] || "");
  }

  _on_show_extra(e) {
    e.stopPropagation();
    this.setState({
      show_extra: true
    });
  }

  _on_change_row_xxx(cfg, opt, prop, e) {
    var w = this.props.widget;
    var view = $hope.app.stores.ui.active_view;
    opt[prop] = e.target.value;

    $hope.trigger_action("ui/change_widgets", {
      ui_id: view.id,
      widgets: [w]
    });
  }

  _on_del_row(cfg, opt) {
    var w = this.props.widget;
    var view = $hope.app.stores.ui.active_view;
    _.pull(w.config[cfg.name], opt);

    $hope.trigger_action("ui/change_widgets", {
      ui_id: view.id,
      widgets: [w]
    });

    this.forceUpdate();
  }

  _on_add_row(cfg) {
    var w = this.props.widget;
    var view = $hope.app.stores.ui.active_view;
    var opts = w.config[cfg.name];
    var opt = {name: "", value: ""};
    if (!_.isArray(opts)) {
      w.config[cfg.name] = opts = [];
    }
    opts.push(opt);

    $hope.trigger_action("ui/change_widgets", {
      ui_id: view.id,
      widgets: [w]
    });

    this.forceUpdate();
  }

  render_cfg(cfg) {
    var view = $hope.app.stores.ui.active_view;
    var w = this.props.widget;
    var v = this.state[cfg.name];
    var content;

    if (cfg.depend) {
      var fn = new Function("$$", "return " + cfg.depend);
      var visible = fn.call(undefined, this.state);
      if (!visible) {
        delete w.config[cfg.name];
        return;
      }
    }
    if (cfg.type === "option") {
      var opts = cfg.options;
      if (_.isString(opts)) {
        switch (opts) {
          case "__HOPE_APP_UI_LIST__":
            opts = _.map(view.get_app().uis, ui => {
              return {
                name: ui.name || ui.id,
                value: ui.id
              };
            });
            break;
          default:
            $hope.check(false, "UIIDE", "Invalid option type: " + opts);
            opts = [];
            break;
        }
      }
      else if (_.isArray(opts) && !_.isObject(opts[0])) {
        opts = opts.map(s => {
          return {name: s, value: s};
        });
      }
      content =
        <div className="styled-select">
          <select value={v}
              onChange={this._on_change_xxx.bind(this, cfg)}>
            { _.map(opts, opt => <option key={opt.value} value={opt.value}>{opt.name}</option>) }
          </select>
        </div>;
    }
    else if (cfg.type === "object") {
      var rows = _.map(w.config[cfg.name], (opt, idx) => 
        <tr key={idx} >
          <td>
            <input className="hope-tbl-row-key"
              type="text"
              value={opt.name}
              onChange={this._on_change_row_xxx.bind(this, cfg, opt, "name")} />
          </td>
          <td>
            <input className="hope-tbl-row-val"
              type={cfg.sub_type || "text"}
              value={opt.value}
              onChange={this._on_change_row_xxx.bind(this, cfg, opt, "value")} />
          </td>
          <td>
            <i className="fa fa-trash"
              onClick={this._on_del_row.bind(this, cfg, opt)} />
          </td>
        </tr>);

      var headers = cfg.headers || ["Name", "Value"];
      return (
        <Row key={cfg.name} className="hope-panel-details-row text-center border-bottom">
          <Row>
            <Col xs={11}>
              <div>{cfg.display || cfg.name}</div>
            </Col>
            <Col xs={1}>
              <div className="fa fa-plus" onClick={this._on_add_row.bind(this, cfg)} />
            </Col>
          </Row>
          {rows.length > 0 && <Row>
            <table className="hope-tbl">
              <thead>
                <tr>
                  <th>{__(headers[0])}</th><th>{__(headers[1])}</th>
                </tr>
              </thead>
              <tbody ref="combox_tbody">
                {rows}
              </tbody>
            </table>
          </Row>}
        </Row>);
    }
    else if (cfg.type === "glyphicon") {
      content =
        <div className="text-center" onClick={this._on_change_glyphicon.bind(this, cfg)}>
          <i className={"hope-hover-icon-btn fa fa-" + v} />
        </div>;
    }
    else if (cfg.type === "color") {
      content =
        <div className="text-center" onClick={this._on_change_color.bind(this, cfg)}>
          <i className={"hope-hover-icon-btn fa fa-circle"} style={{color: v}} />
        </div>;
    }
    else if (cfg.type === "boolean") {
      content =
        <div className="onoffswitch">
          <input onChange={this._on_change_xxx.bind(this, cfg)}
              type="checkbox"
              checked={v}
              className="onoffswitch-checkbox"
              id={cfg.name + "-onoff-" + view.id} />
          <label className="onoffswitch-label" htmlFor={cfg.name + "-onoff-" + view.id}>
            <div className="onoffswitch-inner">
              <span className="on">{__("YES")}</span>
              <span className="off">{__("NO")}</span>
            </div>
            <div className="onoffswitch-switch" />
          </label>
        </div>;
    }
    else {
      content =
        <input type="text"
            className="hope-inspector-detail-field"
            value={v}
            onChange={this._on_change_xxx.bind(this, cfg)} />;
    }
    return (
      <Row key={cfg.name} className="hope-panel-details-row text-center border-bottom">
        <Col xs={5}>
          <div>{cfg.display || cfg.name}</div>
        </Col>
        <Col xs={6}>
          { content }
        </Col>
      </Row>);
  }

  render() {
    var w = this.props.widget;
    var spec = $hope.app.stores.spec.get_spec(w.spec);
    var extras;

    if (spec && spec.extra) {
      if (this.state.show_extra) {
        extras = _.map(spec.extra, cfg => this.render_cfg(cfg));
      }
      else {
        extras =
          <div className="hope-widget-details-extra"
            onClick={this._on_show_extra}>
            <i className="fa fa-chevron-circle-down">{" " + __("More")}</i>
          </div>;
      }
    }

    return (
      <div>
        <div className="hope-inspector-header" >
          <div className="hope-inspector-icon">
            { FONT_AWESOME[(spec && spec.is_ui && spec.icon) || "cog"] }
          </div>
          <div className="hope-inspector-detail">
            <div className="hope-inspector-detail-name">
              { (spec && spec.is_ui && spec.name) || __("Unknown")}
            </div>
            <div className="hope-inspector-detail-desc">
              { (spec && spec.is_ui && spec.description) || __("Unknown") }
            </div>
          </div>
        </div>
        <Tabs>
          <Tab title={__("Basic")}>
            { this.render_cfg(NAME_CFG) }
            { spec && _.map(spec.config, cfg => this.render_cfg(cfg)) }
            { extras }
          </Tab>
          <Tab title={__("Advanced")}>
            { this.render_cfg(CACHE_CFG) }
          </Tab>
        </Tabs>
      </div>
    );
  }
}
