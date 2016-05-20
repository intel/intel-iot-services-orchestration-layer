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
import Tree from "../../common/tree.x";
import Spec from "./spec.x";
import Bundle from "./bundle.x";

export default class SpecView extends ReactComponent {

  render() {

    var ide = $hope.app.stores.ide;
    var view = this.props.isUI ? $hope.app.stores.library.widget_view : $hope.app.stores.library.spec_view;
    var graph = $hope.app.stores.graph.active_view;

    function _update_expand_state(first_level, second_level, is_expanded) {
      if (is_expanded) {
        view.expand(first_level, second_level);
      } else {
        view.collapse(first_level, second_level);
      }
    }

    function _add_node(spec, instance, x, y) {
      var pos;
      if (!x || !y) {
        pos = graph.view_to_logic(ide.panel.library.width + 30, 
          ide.nav_bar.height + 30);
      }

      var info = {
        graph_id: graph.id,
        node: {
          spec: spec.id
        },
        styles: {
          x: x || pos.x,
          y: y || pos.y 
        }
      };
      var hub = $hope.app.stores.hub.manager.center_built_in;
      var app = graph.get_app();
      // see ui_thing.js in backend for id conversions
      if (this.props.isUI && instance) {
        info.binding = {
          type: "fixed",
          widget: instance.id,
          service: "UI_SERVICE__" + instance.id,
          thing: "HOPE_UI_THING__" + hub.id + app.id,
          hub: hub.id
        };
      }
      $hope.trigger_action("graph/create/node", info);
    }

    var bundles = [], catalogs, specs;
    _.forOwn(view.get_render_data().children, (b, b_id) => {
      catalogs = [];
      _.forOwn(b.children, (c, c_id) => {
        specs = [];
        _.forOwn(c.children, (s, s_id) => {
          specs.push(<Tree.Node key={s_id}>
            <Spec
              spec={s.obj}
              instance={s.instance}
              draggable={true}
              scalable={true}
              onDoubleClick={_add_node.bind(this, s.obj, s.instance, 0, 0)}/> 
            </Tree.Node>);
        });
        
        catalogs.push(<Tree.Node key={c.name} 
          onToggle={_update_expand_state.bind({}, b_id, c_id)}
          defaultExpanded={c.styles.expanded}> 
          <Tree.Item text={c.name} indent={1} 
            className="hope-panel-lib-view-second-level"/>
          {specs}
          </Tree.Node>);
      });
      bundles.push(<Tree.Node key={b_id} 
        onToggle={_update_expand_state.bind({}, b_id, undefined)}
        defaultExpanded={b.styles.expanded}> 
        <Bundle bundle={b.obj}/>
        {catalogs}
      </Tree.Node>);
    });


    return (
      <Tree.Node defaultExpanded={true} className="hope-panel-lib-view">
        {bundles}
      </Tree.Node>
    );
  }  
}


