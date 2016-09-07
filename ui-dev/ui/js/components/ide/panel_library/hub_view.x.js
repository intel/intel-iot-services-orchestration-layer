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
import Tree from "../../common/tree.x";
import Service from "./service.x";
import Thing from "./thing.x";
import Hub from "./hub.x";

export default class HubView extends ReactComponent {

  render() {

    var ide = $hope.app.stores.ide;
    var hub_view = $hope.app.stores.library.hub_view;
    var graph = $hope.app.stores.graph.active_view;

    function _update_expand_state(hub_id, thing_id, is_expanded) {
      if (is_expanded) {
        hub_view.expand(hub_id, thing_id);
      } else {
        hub_view.collapse(hub_id, thing_id);
      }
    }

    function _add_node(service, x, y) {
      var pos;
      if (!x || !y) {
        pos = graph.view_to_logic(ide.panel.library.width + 30,
          ide.nav_bar.height + 30);
      }
      $hope.trigger_action("graph/create/node", {
        graph_id: graph.id,
        node: {
          spec: service.spec
        },
        styles: {
          x: x || pos.x,
          y: y || pos.y
        },
        binding: {
          type: "fixed",
          service: service.id,
          thing: service.$thing.id,
          hub: service.$thing.$hub.id
        }
      });
    }

    var hubs = [], things, services;
    _.forOwn(hub_view.get_render_data().children, (d, d_id) => {
      things = [];
      _.forOwn(d.children, (t, t_id) => {
        services = [];
        _.forOwn(t.children, s => {
          let spec = s.obj.$get_spec();
          if (spec && spec.nr && spec.nr.category === "config") {
            return;
          }
          services.push(<Tree.Node key={s.name}>
            <Service
              service={s.obj}
              draggable={true}
              error={!spec}
              onDoubleClick={_add_node.bind({}, s.obj, 0, 0)}/>
            </Tree.Node>);
        });


        things.push(<Tree.Node key={t.name}
          onToggle={_update_expand_state.bind({}, d_id, t_id)}
          defaultExpanded={t.styles.expanded}>
          <Thing thing={t.obj} />
          {services}
          </Tree.Node>);
      });
      var hnode = (<Tree.Node key={d.name}
        onToggle={_update_expand_state.bind({}, d_id, undefined)}
        defaultExpanded={d.styles.expanded}>
        <Hub hub={d.obj} />
        {things}
      </Tree.Node>);
      if (d.obj.type === "builtin") {
        hubs.unshift(hnode);
      } else {
        hubs.push(hnode);
      }
    });


    return (
      <Tree.Node defaultExpanded={true} className="hope-panel-lib-view">
        {hubs}
      </Tree.Node>
    );
  }
}


