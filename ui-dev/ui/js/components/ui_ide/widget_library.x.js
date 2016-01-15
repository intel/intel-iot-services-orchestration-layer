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
import {Row} from "react-bootstrap";

import SearchBox from "../ide/search_box.x";
import Tree from "../ide/tree.x";
import Spec from "../ide/panel_library/spec.x";
import Bundle from "../ide/panel_library/bundle.x";

var _key = 0;


export default class WidgetLibrary extends ReactComponent {

  static propTypes = {
    defaultExpanded: React.PropTypes.bool
  };

  _on_search(search) {
    $hope.trigger_action("library/search_widget_spec", {search: search});
  }


  render() {

    var view = $hope.app.stores.library.widget_spec_view;
    var ui_view = $hope.app.stores.ui.active_view;
    var library_store = $hope.app.stores.library;

    function _update_expand_state(first_level, second_level, is_expanded) {
      if (is_expanded) {
        view.expand(first_level, second_level);
      } else {
        view.collapse(first_level, second_level);
      }
    }

    function _add_node(spec, x, y) {
      $hope.trigger_action("ui/add_widget", {
        ui_id: ui_view.id,
        widget: {
          spec: spec.id,
          x: 0,
          y: 0
        }
      });
    }

    var bundles = [], catalogs, specs;
    // We used getInitialState in Tree.Node 
    // So to ensure everytime we changed the defaultExpanded property
    // it always get updated, we need to set the key carefully
    // so generate a new key upon change of properties thus a new 
    // component would be created and getInitialState would be invoked
    if (_key > 10000) {
      _key = 0;
    }
    _.forOwn(view.get_render_data().children, (b, b_id) => {
      catalogs = [];
      _.forOwn(b.children, (c, c_id) => {
        specs = [];
        _.forOwn(c.children, s => {
          specs.push(<Tree.Node key={s.obj.id}>
            <Spec
              spec={s.obj} 
              draggable={true}
              scalable={false}
              onDoubleClick={_add_node.bind({}, s.obj, 0, 0)}/> 
            </Tree.Node>);
        });
        
        catalogs.push(<Tree.Node key={_key ++} 
          onToggle={_update_expand_state.bind({}, b_id, c_id)}
          defaultExpanded={c.styles.expanded}> 
          <Tree.Item text={c.name} indent={1} 
            className="hope-panel-lib-view-second-level"/>
          {specs}
          </Tree.Node>);
      });
      bundles.push(<Tree.Node key={_key ++} 
        onToggle={_update_expand_state.bind({}, b_id, undefined)}
        defaultExpanded={b.styles.expanded}> 
        <Bundle bundle={b.obj}/>
        {catalogs}
      </Tree.Node>);
    });

    return (
      <div className="hope-panel match-parent">
        <div className="hope-panel-header" >
          <i className={"hope-panel-icon fa fa-list"} />
          <span className="hope-panel-title">{__("Widgets")}</span>
        </div>
        <div className="hope-panel-body">
          <Row>
            <SearchBox 
              onSubmit={this._on_search}
              onChange={this._on_search}
              initialSearchString={library_store.search_string}/>
          </Row>
          <Row>
            <Tree.Node defaultExpanded={true} className="hope-panel-lib-view">
              {bundles}
            </Tree.Node>
          </Row>
          

        </div>
      </div>
    );
  }  
}


