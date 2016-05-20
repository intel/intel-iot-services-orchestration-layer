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
import class_names from "classnames";
import SearchBox from "../common/search_box.x";
import HubView from "./panel_library/hub_view.x";
import SpecView from "./panel_library/spec_view.x";


export default class PanelLibrary extends ReactComponent {

  _get_current_view() {
    return $hope.app.stores.library.current_view;
  }

  _switch_to_view(view) {
    $hope.trigger_action("library/switch/view", {view: view});
  }

  _on_search(search) {
    $hope.trigger_action("library/search", {search: search});
  }

  _on_expand_all() {
    $hope.trigger_action("library/expand_all", {});
  }

  _on_collapse_all() {
    $hope.trigger_action("library/collapse_all", {});
  }

  render() {
    var lib_style = $hope.app.stores.ide.panel.library;
    if (!lib_style.visible) {
      return null;
    }
    $hope.log("render", "panel_library");

    var current_view = this._get_current_view();
    var library_store = $hope.app.stores.library;

    var view_component;
    switch (current_view.type) {
      case "HubView":
        view_component = <HubView/>;
        break;
      case "WidgetView":
        view_component = <SpecView isUI={true} />;
        break;
      case "SpecView":
        view_component = <SpecView/>;
        break;
    }

    // TODO we hard coded the height of {view_component}, maybe there
    // is a smarter solution
    // TODO we don't use a general Tab control here. Maybe don't need
    // since it is quite simple for this case
    return (
      <div className="hope-panel match-parent">
        <div className="hope-panel-header" >
          <i className={"hope-panel-icon fa fa-list"} />
          <span className="hope-panel-title">{__("Library")}</span>
        </div>
        <div className="hope-panel-body">
          <Row>
            <SearchBox 
              onSubmit={this._on_search}
              onChange={this._on_search}
              initialSearchString={library_store.current_view.search_string}/>
          </Row>
          
          <Row className="hope-panel-lib-tabs">
            
            <Col xs={3} className={class_names("hope-panel-lib-tab-item", {
              on: current_view.type === "HubView"
            })} onClick={this._switch_to_view.bind(this, "hub")}> 
              <div> Hubs </div>
            </Col>

            <Col xs={3} className={class_names("hope-panel-lib-tab-item", {
              on: current_view.type === "WidgetView"
            })} onClick={this._switch_to_view.bind(this, "widget")}> 
              <div> Widgets </div>
            </Col>

            
            {/* <Col xs={3} className={class_names("hope-panel-lib-tab-item", {
              on: current_view.type === "SpecView"
            })} onClick={this._switch_to_view.bind(this, "spec")}> 
              <div> Specs </div>
            </Col> */}

            <Col xs={4} /> 

            <Col xs={1} className="hope-panel-lib-tab-item-addon"> 
              <i className="fa fa-chevron-circle-right"
                 onClick={this._on_collapse_all} />
            </Col>
            <Col xs={1} className="hope-panel-lib-tab-item-addon"> 
              <i className="fa fa-chevron-circle-down"
                 onClick={this._on_expand_all} />
            </Col>

          </Row>
          
          <Row style={{
            overflowY: "auto",
            height: lib_style.height - 120
          }}>
            {view_component}
          </Row>
        </div>
      </div>
    );
  }
}


