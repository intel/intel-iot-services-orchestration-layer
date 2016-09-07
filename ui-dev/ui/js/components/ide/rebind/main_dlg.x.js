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
import {Modal, Button, Popover, Panel, Well} from "react-bootstrap";
import TreeView from "react-treeview";
import Overlay from "../../common/overlay.x";

export default class DlgRebinding extends ReactComponent {

  constructor(props) {
    super(props);

    this.state = {
      right_selected: null,
      left_selected: null,
      left_type: "",
      unresolved: {},
      binding: {}
    };
  }

  componentDidMount() {
    this._init_unresolved(this.props);
  }

  componentWillReceiveProps(props) {
    this._init_unresolved(props);
  }

  _init_unresolved(props) {
    var view = props.view;
    var hub_manager = $hope.app.stores.hub.manager;
    var unres = {};

    _.forEach(view.graph.nodes, node => {
      let binding = node.$get_binding();
      if (binding && binding.type === "fixed" && !binding.widget) {
        let service = hub_manager.get_service(binding.hub, binding.thing, binding.service);
        if (!service) {
          let hv = unres[binding.hub];
          if (!hv) {
            hv = unres[binding.hub] = {};
          }
          let nodes = hv[binding.thing];
          if (!nodes) {
            nodes = hv[binding.thing] = [];
          }
          nodes.push(node);
        }
      }
    });
    this.setState({
      left_selected: null,
      left_type: "",
      unresolved: unres,
      binding: {}
    });
  }

  _select_left_svc(id) {
    var tgt = this.state.binding[id];
    this.setState({
      right_selected: tgt ? tgt.id : null,
      left_selected: id,
      left_type: "Service"
    });
  }

  _select_left_thing(id) {
    var tgt = this.state.binding[id];
    this.setState({
      right_selected: tgt ? tgt.id : null,
      left_selected: id,
      left_type: "Thing"
    });
  }

  _select_left_hub(id) {
    var tgt = this.state.binding[id];
    this.setState({
      right_selected: tgt ? tgt.id : null,
      left_selected: id,
      left_type: "Hub"
    });
  }

  _select_right(id) {
    this.setState({
      right_selected: id
    });
  }

  _rebind_hub(id) {
    var hub_manager = $hope.app.stores.hub.manager;
    var hub = hub_manager.get_hub(id);
    var binding = this.state.binding;
    var src = this.state.left_selected;
    binding[src] = hub;

    _.forOwn(this.state.unresolved[src], (nodes, tid) => {
      _.forOwn(nodes, node => {
        let svcs = hub.get_services_using_specs([node.spec]);
        binding[node.id] = svcs[0];
        binding[tid] = svcs[0].$thing;
      });
    });

    this.setState({
      binding: binding
    });
  }

  _rebind_thing(id) {
    var hub_manager = $hope.app.stores.hub.manager;
    var th = hub_manager.get_thing(id);
    var binding = this.state.binding;
    var src = this.state.left_selected;
    binding[src] = th;

    _.forOwn(this.state.unresolved, (hv, hid) => {
      _.forOwn(hv, (nodes, tid) => {
        if (tid !== src) {
          return false;
        }
        _.forOwn(nodes, node => {
          let svcs = th.get_services_using_specs([node.spec]);
          binding[node.id] = svcs[0];
        });
        binding[hid] = th.$hub;
        return false;
      });
    });

    this.setState({
      binding: binding
    });
  }

  _rebind_service(id) {
    var svc = $hope.app.stores.hub.manager.get_service(id);
    var binding = this.state.binding;
    var src = this.state.left_selected;
    binding[src] = svc;

    _.forOwn(this.state.unresolved, (hv, hid) => {
      _.forOwn(hv, (nodes, tid) => {
        var node = _.find(nodes, ["id", src]);
        if (node) {
          binding[tid] = svc.$thing;
          binding[hid] = svc.$thing.$hub;
          return false;
        }
      });
    });

    this.setState({
      binding: binding
    });
  }

  _on_rebind() {
    var tgt = this.state.right_selected;
    switch(this.state.left_type) {
      case "Hub":
        return this._rebind_hub(tgt);
      case "Thing":
        return this._rebind_thing(tgt);
      case "Service":
        return this._rebind_service(tgt);
    }
  }

  _on_apply() {
    var view = this.props.view;
    var binding = this.state.binding;

    // rebinding
    _.forOwn(binding, (obj, src) => {
      if (obj.$type === "service") {
        binding[src] = null;

        var node = view.get("node", src);
        node.$set_binding({
          type: "fixed",
          hub: obj.$thing.$hub.id,
          thing: obj.$thing.id,
          service: obj.id
        });
        $hope.trigger_action("graph/change/node", {graph_id: view.id, id: src}, {});
      }
    });

    // remove rebinded items
    _.forOwn(this.state.unresolved, (hv, hid) => {
      _.forOwn(hv, (nodes, tid) => {
        _.forOwn(nodes, (node, idx) => {
          if (binding[node.id] === null) {
            delete binding[node.id];
            nodes.splice(idx, 1);
          }
        });
        if (_.isEmpty(nodes)) {
          delete hv[tid];
        }
      });
      if (_.isEmpty(hv)) {
        delete this.state.unresolved[hid];
      }
    });

    this.setState({
      binding: binding,
      left_selected: null,
      left_type: "",
      right_selected: null
    }, ()=> {
      if (_.isEmpty(binding)) {
        this.props.onHide();
      }
    });
  }

  render_left_hubs() {
    var hub_manager = $hope.app.stores.hub.manager;
    var binding = this.state.binding;

    return _.map(this.state.unresolved, (hv, hid) => {
      let hub = hub_manager.get_hub(hid);
      let things = _.map(hv, (nodes, tid) => {
        let th = hub_manager.get_thing(hid, tid);
        let services = _.map(nodes, node => {
          let svc = binding[node.id];
          return (
            <Overlay key={node.id} placement="bottom" overlay={<Popover id="PO">{node.spec}</Popover>}>
              <div className={"node" + (this.state.left_selected === node.id ? " selected" : "")}
                onClick={this._select_left_svc.bind(this, node.id)}>
                  {node.$get_name() || __("Unknown Service")}
                  {svc &&
                    <span className="binding-target">
                      <i className="fa fa-angle-double-right" />
                      {" " + svc.$name()}
                    </span>
                  }
              </div>
            </Overlay>);
        });

        let thtgt = binding[tid];
        let tlab = (
          <Overlay placement="bottom" overlay={<Popover id="PO">{tid}</Popover>}>
            <span className="node" onClick={this._select_left_thing.bind(this, tid)}>
              {(th && th.$name()) || __("Unknown Thing")}
              {thtgt &&
                <span className="binding-target">
                  <i className="fa fa-angle-double-right" />
                  {" " + thtgt.$name()}
                </span>
              }
            </span>
          </Overlay>);

        return (
          <TreeView key={tid}
            nodeLabel={tlab}
            itemClassName={this.state.left_selected === tid ? "selected" : ""}
            defaultCollapsed={false}>
              {services}
          </TreeView>);
      });

      let htgt = binding[hid];
      let hlab = (
        <Overlay placement="bottom" overlay={<Popover id="PO">{hid}</Popover>}>
          <span className="node" onClick={this._select_left_hub.bind(this, hid)}>
            {(hub && hub.$name()) || __("Unknown Hub")}
            {htgt &&
              <span className="binding-target">
                <i className="fa fa-angle-double-right" />
                {" " + htgt.$name()}
              </span>
              }
          </span>
        </Overlay>);

      return (
        <TreeView key={hid}
          nodeLabel={hlab}
          itemClassName={this.state.left_selected === hid ? "selected" : ""}
          defaultCollapsed={false}>
            {things}
        </TreeView>);
    });
  }

  render_right_hubs_one_level() {
    var hub_manager = $hope.app.stores.hub.manager;
    var hubs = [];
    _.forOwn(this.state.unresolved, (hv, hid) => {
      if (hid !== this.state.left_selected) {
        return;
      }
      let unres_specs = [], added = {};
      _.forOwn(hv, nodes => {
        _.forOwn(nodes, node => {
          if (unres_specs.indexOf(node.spec) < 0) {
            unres_specs.push(node.spec);
          }
        });
      });

      _.forOwn(hub_manager.hubs, (hub, hid) => {
        let svcs = hub.get_services_using_specs(unres_specs);
        if (svcs.length === unres_specs.length && !added[hid]) {
          added[hid] = true;
          hubs.push(
            <div key={hid}
              className={"node" + (this.state.right_selected === hid ? " selected" : "")}
              onClick={this._select_right.bind(this, hid)}
              onDoubleClick={this._rebind_hub.bind(this, hid)}>
                {hub.$name() || __("Unnamed Hub")}
            </div>);
        }
      });
    });
    return hubs;
  }

  render_right_hubs_two_levels() {
    var hub_manager = $hope.app.stores.hub.manager;
    var hubchild = {};
    _.forOwn(this.state.unresolved, hv => {
      _.forOwn(hv, (nodes, tid) => {
        if (tid !== this.state.left_selected) {
          return;
        }
        let unres_specs = [];
        _.forOwn(nodes, node => {
          if (unres_specs.indexOf(node.spec) < 0) {
            unres_specs.push(node.spec);
          }
        });

        _.forOwn(hub_manager.hubs, (hub, hid) => {
          _.forOwn(hub.things, (thing, tid) => {
            if (hub.uses_all_specs_once(thing, unres_specs)) {
              let ths = hubchild[hid];
              if (!ths) {
                ths = hubchild[hid] = [];
              }
              ths.push(
                <div key={tid}
                  className={"node" + (this.state.right_selected === tid ? " selected" : "")}
                  onClick={this._select_right.bind(this, tid)}
                  onDoubleClick={this._rebind_thing.bind(this, tid)}>
                    {thing.$name() || __("Unnamed Thing")}
                </div>);
            }
          });
        });
      });
    });

    return _.map(hubchild, (ths, hid) => {
      let hub = hub_manager.get_hub(hid);
      let lab = (
        <span className="node gray" onClick={this._select_right.bind(this, null)}>
          {hub.$name() || __("Unnamed Hub")}
        </span>);

      return (
        <TreeView key={hid}
          nodeLabel={lab}
          itemClassName={this.state.right_selected === hid ? "selected" : ""}
          defaultCollapsed={false}>
            {ths}
        </TreeView>);
    });
  }

  render_right_hubs_three_levels() {
    var hub_manager = $hope.app.stores.hub.manager;
    var hubchild = {};
    _.forOwn(this.state.unresolved, hv => {
      _.forOwn(hv, nodes => {
        _.forOwn(nodes, node => {
          if (node.id !== this.state.left_selected) {
            return;
          }
          _.forOwn(hub_manager.hubs, (hub, hid) => {
            let svcs = hub.get_all_services_using_spec(node.spec);
            if (svcs.length === 1) {
              let svc = svcs[0];
              let children = hubchild[hid];
              if (!children) {
                children = hubchild[hid] = {};
              }
              let tch = children[svc.$thing.id];
              if (!tch) {
                tch = children[svc.$thing.id] = [];
              }
              if (tch.indexOf(svc) < 0) {
                tch.push(svc);
              }
            }
          });
        });
      });
    });

    return _.map(hubchild, (children, hid) => {
      let hub = hub_manager.get_hub(hid);
      let lab = (
        <span className="node gray" onClick={this._select_right.bind(this, null)}>
          {hub.$name() || __("Unnamed Hub")}
        </span>);

      return (
        <TreeView key={hid}
          nodeLabel={lab}
          itemClassName={this.state.right_selected === hid ? "selected" : ""}
          defaultCollapsed={false}>
            {_.map(children, (svcs, tid) => {
              let thing = hub_manager.get_thing(hid, tid);
              let tlab = (
                <span className="node gray" onClick={this._select_right.bind(this, null)}>
                  {thing.$name() || __("Unnamed Thing")}
                </span>);

              let services = _.map(svcs, svc => {
                let slab = (
                  <div key={svc.id} className={"node" + (this.state.right_selected === svc.id ? " selected" : "")}
                    onClick={this._select_right.bind(this, svc.id)}
                    onDoubleClick={this._rebind_service.bind(this, svc.id)}>
                      {svc.$name() || __("Unnamed Service")}
                  </div>);

                return svc.description ?
                  <Overlay key={svc.id} placement="bottom" overlay={<Popover id="PO">{svc.$description()}</Popover>}>
                    {slab}</Overlay> : slab;
              });

              return (
                <TreeView key={tid}
                  nodeLabel={tlab}
                  itemClassName={this.state.left_selected === tid ? "selected" : ""}
                  defaultCollapsed={false}>
                    {services}
                </TreeView>
                );
            })}
        </TreeView>);
    });
  }

  render_right_hubs() {
    switch(this.state.left_type) {
      case "Hub":
        return this.render_right_hubs_one_level();
      case "Thing":
        return this.render_right_hubs_two_levels();
      case "Service":
        return this.render_right_hubs_three_levels();
    }
  }

  render() {
    return (
      <Modal {...this.props}
          backdrop="static"
          dialogClassName="rebind-dialog"
          animation={true}
          onKeyDown={this._on_keydown}>
        <Modal.Header closeButton>
          <Modal.Title>{__("Workflow Rebinding")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Well className="tips">
            {__("For this workflow, we have some services that unable to resolve, please rebind them manually.")}
          </Well>
          <Panel header={__("Unresolved Services")} bsStyle="danger" className="rebind-dialog-left">
            {this.render_left_hubs()}
          </Panel>
          <Panel header={__("Available") + " " + this.state.left_type} bsStyle="success" className="rebind-dialog-right">
            {this.state.left_selected && this.render_right_hubs()}
          </Panel>
        </Modal.Body>
        <Modal.Footer>
          {this.state.left_selected && this.state.right_selected &&
            <Button bsStyle="danger" style={{float: "left"}}
              onClick={this._on_rebind}>{__("Rebind")}</Button>
          }
          <Button bsStyle="default"
            onClick={this.props.onHide}>{__("Close")}</Button>
          <Button bsStyle="primary"
            disabled={_.isEmpty(this.state.binding)}
            onClick={this._on_apply}>{__("Apply")}</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

