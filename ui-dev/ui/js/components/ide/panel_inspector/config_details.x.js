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
import Dialog from "../../common/dialog.x";

export default class ConfigDetails extends ReactComponent {

  static propTypes = {
    id:         React.PropTypes.string.isRequired,
    onChange:   React.PropTypes.func
  };

  constructor(props) {
    super();
  
    this.state = this._get_states(props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.id !== this.props.id) {
      this.setState(this._get_states(nextProps));
    }
  }

  _get_states(props) {
    var states = {};
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", props.id);
    var spec = node.$get_spec();
    var items = spec.extra ? spec.config.concat(spec.extra) : spec.config;
    _.forOwn(items, i => {
      if (i.name) {
        var v = i.name in node.config ? node.config[i.name] : i.default;
        states[i.name] = v === undefined || ((i.type === "int" || i.type === "number") && isNaN(v)) ? "" : v;
      }
    });
    return states;
  }

  set_modified() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    $hope.trigger_action("graph/change/node", {
      graph_id: view.id,
      id: node.id,
      data: {}    // will be merged in
    });
  }

  _on_change_xxx(cfg, e) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
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

    node.config[cfg.name] = val;

    this.set_modified();
    this.setState({
      [cfg.name]: cfg.type === "boolean" ? val : e.target.value
    });
  }

  _on_change_glyphicon(cfg, e) {
    e.stopPropagation();
    Dialog.show_iconpicker_dialog(__("Change the icon of node"), icon => {
      var view = $hope.app.stores.graph.active_view;
      var node = view.get("node", this.props.id);
      var val;
      if (_.startsWith(icon, "fa-")) {
        val = icon.substr(3);
      }
      else {
        val = "";
      }

      node.config[cfg.name] = val;

      this.set_modified();
      this.setState({
        [cfg.name]: val
      });
    },
    this.state[cfg.name] || "");
  }

  _on_change_color(cfg, e) {
    e.stopPropagation();
    Dialog.show_colorpicker_dialog(__("Change the color"), color => {
      var view = $hope.app.stores.graph.active_view;
      var node = view.get("node", this.props.id);

      node.config[cfg.name] = color;

      this.set_modified();
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
    opt[prop] = e.target.value;

    this.set_modified();
  }

  _on_del_row(cfg, opt) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    _.pull(node.config[cfg.name], opt);

    this.set_modified();
    this.forceUpdate();
  }

  _on_add_row(cfg) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var opts = node.config[cfg.name];
    var opt = {name: "", value: ""};
    if (!_.isArray(opts)) {
      node.config[cfg.name] = opts = [];
    }
    opts.push(opt);

    this.set_modified();
    this.forceUpdate();
  }

  render_cfg(cfg) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var v = this.state[cfg.name];
    var content;

    if (cfg.depend) {
      var fn = new Function("$$", "return " + cfg.depend);
      var visible = fn.call(undefined, this.state);
      if (!visible) {
        delete node.config[cfg.name];
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
            $hope.check(false, "IDE", "Invalid option type: " + opts);
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
      var rows = _.map(node.config[cfg.name], (opt, idx) => 
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
        <div className="text-center hope-inspector-detail-field" onClick={this._on_change_glyphicon.bind(this, cfg)}>
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
            className={"hope-inspector-detail-field" + ((!cfg.required || v) ? "" : " hope-input-highlighted")}
            value={v}
            onChange={this._on_change_xxx.bind(this, cfg)} />;
    }
    return (
      <Row key={cfg.name} className="hope-panel-details-row text-center border-bottom">
        <Col xs={5}>
          <div className="cfg-name">{cfg.display || cfg.name}</div>
        </Col>
        <Col xs={6}>
          { content }
        </Col>
      </Row>);
  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var spec = node.$get_spec();
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
        { spec && _.map(spec.config, cfg => this.render_cfg(cfg)) }
        { extras }
      </div>
    );
  }
}
