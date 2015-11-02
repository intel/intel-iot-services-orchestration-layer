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
import {Tabs, Tab} from "../tabs.x";
import {Row, Col} from "react-bootstrap";
import Dialog from "../dialog.x";

export default class EdgeDetails extends ReactComponent {

  static propTypes = {
    id: React.PropTypes.string.isRequired
  };

  constructor(props) {
    super();

    var view = $hope.app.stores.graph.active_view;
    this.state = {
      edge: view ? view.get("edge", props.id) : null
    };
  }

  componentWillReceiveProps(nextProps) {
    var view = $hope.app.stores.graph.active_view;
    if (view && nextProps.id) {
      this.setState({
        edge: view.get("edge", nextProps.id)
      });
    }
  }

  _on_change_field(e) {
    var view = $hope.app.stores.graph.active_view;
    if (e.target.value.length > 0) {
      this.state.edge.field = e.target.value;
    }
    else {
      delete this.state.edge.field;
    }
    this.forceUpdate();
    view.change("edge", this.props.id, null);
  }

  _on_change_nostore(e) {
    var view = $hope.app.stores.graph.active_view;
    if (e.target.checked) {
      this.state.edge.no_store = true;
    }
    else {
      delete this.state.edge.no_store;
    }
    this.forceUpdate();
    view.change("edge", this.props.id, null);
  }

  _on_color_selected(i) {
    var view = $hope.app.stores.graph.active_view;
    this.state.edge.$merge_styles({color: i});
    this.forceUpdate();
    view.change("edge", this.props.id, null);
  }

  _on_click_color_palette(e) {
    e.stopPropagation();
    var rect = React.findDOMNode(this.refs.color).getBoundingClientRect();
    $hope.trigger_action("ide/show/palette", {
      x: rect.left + rect.width + 10,
      y: rect.top,
      onSelect: this._on_color_selected
    });
  }

  _on_show_extractor() {
    Dialog.show_svg_animation_dialog("Extractor Decorator",
      require("./help_svg/extract_decorator.x"));
  }

  _on_show_nostore() {
    Dialog.show_svg_animation_dialog("No Store Decorator",
      require("./help_svg/nostore_decorator.x"));
  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var edge = this.state.edge;
    if (!edge) {
      return null;
    }
    var styles = edge.$get_styles() || {};
    var valdiv;

    if (view.is_debugging() && ("$lastdat" in edge) && view.is_selected("edge", edge.id)) {
      var v = edge.$lastdat;
      var date = new Date();
      date.setTime(edge.$lasttim);
      var time = date.toLocaleString();
      if (_.isArray(v) || _.isObject(v)) {
        v = JSON.stringify(v, null, 2);
      }
      else {
        v = String(v);
      }
      valdiv =
        <div>
          <div className="hope-inspector-time">{ time }</div>
          <div className="hope-inspector-data">{ v }</div>
        </div>;
    }

    return (
      <div>
        <div className="hope-inspector-header" >
          <div className={"hope-inspector-icon fa fa-long-arrow-right" + $hope.color(styles.color)} />
          <div className="hope-inspector-detail">
            <div className="hope-inspector-detail-name">Edge</div>
            <div className="hope-inspector-detail-desc">simple connection</div>
          </div>
        </div>
        { valdiv }
        {view.is_editing() &&
        <Tabs>
          <Tab title="Details">
            <Row className="hope-panel-details-row text-center border-bottom">
              <Col xs={6}>
                <div>Extract Field</div>
              </Col>
              <Col xs={4}>
                <input type="text"
                  className="hope-inspector-detail-field"
                  value={edge.field || ""}
                  onChange={this._on_change_field} />
              </Col>
              <Col xs={2}>
                <i className="fa fa-question-circle hope-hover-icon-btn"
                  onClick={this._on_show_extractor} />
              </Col>
            </Row>
{ false &&    <Row className="hope-panel-details-row text-center border-bottom">
              <Col xs={6}>
                <div>No Store</div>
              </Col>
              <Col xs={1}>
                <input type="checkbox"
                  className="hope-inspector-detail-checkbox"
                  checked={edge.no_store}
                  onChange={this._on_change_nostore} />
              </Col>
              <Col xs={2}>
                <i className="fa fa-question-circle hope-hover-icon-btn"
                  onClick={this._on_show_nostore} />
              </Col>
            </Row>
}
            <Row className="hope-panel-details-row text-center">
              <Col xs={6}>
                <div>Color</div>
              </Col>
              <Col xs={1}>
                <i ref="color"
                  className={"fa fa-circle" + $hope.color(styles.color, "color", "hover")}
                  onClick={this._on_click_color_palette} />
              </Col>
            </Row>
          </Tab>
        </Tabs>
      }
      </div>
    );
  }
}
