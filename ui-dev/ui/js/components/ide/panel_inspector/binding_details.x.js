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
import {DropdownButton, MenuItem} from "react-bootstrap";

var FIXED = "fixed";
var NO_BINDING = "*NO* Binding";

export default class BindingDetails extends ReactComponent {

  static propTypes = {
    id: React.PropTypes.string.isRequired
  };

  componentWillMount() {
    this._init_type(this.props.id);
  }

  componentWillReceiveProps(nextProps) {
    this._init_type(nextProps.id);
  }

  _init_type(id) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", id);
    var binding = node.$get_binding();
    this.setState({
      type: (binding && binding.type) ? binding.type : NO_BINDING
    });
  }

  _set_type(type) {
    if (type === NO_BINDING) {
      var view = $hope.app.stores.graph.active_view;
      var node = view.get("node", this.props.id);
      node.$remove_binding();
      view.change("node", this.props.id, null);
    }
    this.setState({
      type: type
    });
  }

  _set_fixed_dev(d) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var binding = node.$get_binding();
    var b2;

    if (binding && binding.type === FIXED) {  // Change hub id only
      b2 = _.clone(binding);
      b2.hub = d;
    }
    else {
      b2 = {
        type: FIXED,
        hub: d
      };
    }
    node.$set_binding(b2);
    view.change("node", this.props.id, null);
    this.forceUpdate();
  }

  _set_fixed_xxx_id(xxx, id) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var binding = node.$get_binding();
    binding[xxx] = id;
    node.$set_binding(binding);
    view.change("node", this.props.id, null);
    this.forceUpdate();
  }

  _set_widget(id) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var binding = node.$get_binding();

    var b2 = _.clone(binding);
    b2.widget = id;
    node.$set_binding(b2);
    view.change("node", this.props.id, null);
    this.forceUpdate();
  }

  render_th_svc(spec, binding, d) {
    var things = [], services = [];
    var curth = "", cursvc = "";

    _.forOwn(d.get_all_things_using_spec(spec.id), thing => {
      things.push(
        <MenuItem key={thing.id} onSelect={this._set_fixed_xxx_id.bind(this, "thing", thing.id)}>
          {thing.name}
        </MenuItem>
      );

      if (thing.id === binding.thing) {
        curth = thing.name;

        _.forOwn(thing.services, svc => {
          if (svc.spec !== spec.id) {
            return;
          }
          if (svc.id === binding.service) {
            cursvc = svc.name;
          }

          services.push(
            <MenuItem key={svc.id} onSelect={this._set_fixed_xxx_id.bind(this, "service", svc.id)}>
              {svc.name}
            </MenuItem>
          );
        });
      }
    });

    return <div>
      <div className="margin-top">{__("Active Thing")}</div>
      <DropdownButton id="t" buttonClassName="hope-dropdown"
          bsStyle="success" bsSize="small" title={curth} >
        { things }
      </DropdownButton>
      <div className="margin-top">{__("Active Service")}</div>
      <DropdownButton id="s" buttonClassName="hope-dropdown"
          bsStyle="success" bsSize="small" title={cursvc} >
        { services }
      </DropdownButton>
    </div>;
  }

  render_hubs(spec, binding) {
    var div_th_svc = null;
    var hubs = [];
    var curdev = "";
    var avail_hubs = $hope.app.stores.hub.get_all_hubs(spec.id);

    _.forOwn(avail_hubs, d => {
      hubs.push(
        <MenuItem key={d.id} onSelect={this._set_fixed_dev.bind(this, d.id)}>
          {d.name}
        </MenuItem>
      );
    });

    if (binding) {
      var d = $hope.app.stores.hub.manager.get_hub(binding.hub);
      if (d && avail_hubs.indexOf(d) >= 0) {
        curdev = d.name;

        if (d.get_all_services_using_spec(spec.id).length > 1) {
          div_th_svc = this.render_th_svc(spec, binding, d);
        }
      }
    }

    return (
      <div>
        <div className="margin-top">{__("Active Hub")}</div>
        <DropdownButton id="h" buttonClassName="hope-dropdown"
            bsStyle="success" bsSize="small" title={curdev} >
          { hubs }
        </DropdownButton>
        { div_th_svc }
      </div>
    );
  }

  render_widgets(node, binding) {
    var view = $hope.app.stores.library.widget_view;
    var spec = node.$get_spec();
    var instances = [];
    var widget_name = "";

    _.forOwn(view.get_render_data().children, b => {
      _.forOwn(b.children, c => {
        _.forOwn(c.children, s => {
          if (s.obj.id === spec.id) {
            if (binding && binding.widget === s.instance.id) {
              widget_name = s.instance.name;
            }
            instances.push(
              <MenuItem key={s.instance.id} onSelect={this._set_widget.bind(this, s.instance.id)}>
                {s.instance.name}
              </MenuItem>
            );
          }
        });
      });
    });
    return (
      <div>
        <div className="margin-top"> Active Widget </div>
        <DropdownButton id="i" buttonClassName="hope-dropdown"
            bsStyle="success" bsSize="small" title={widget_name} >
          { instances }
        </DropdownButton>
      </div>
    );
  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var spec = node.$get_spec();
    var binding = node.$get_binding();
    var extra = null;
    var no_binding = true;

    if (this.state.type === FIXED) {
      if (spec && spec.is_ui) {
        extra = this.render_widgets(node, binding);
        no_binding = false;
      }
      else {
        extra = this.render_hubs(spec, binding);
      }
    }

    return (
      <div>
        <div>{__("Binding Type")} </div>
        <DropdownButton id="X" buttonClassName="hope-dropdown"
            bsStyle="primary" bsSize="small" title={__(this.state.type)} >
          <MenuItem onSelect={this._set_type.bind(this, FIXED)}>
            {__(FIXED)}
          </MenuItem>
          { no_binding && <MenuItem divider /> }
          { no_binding &&
            <MenuItem onSelect={this._set_type.bind(this, NO_BINDING)}>
              {__(NO_BINDING)}
            </MenuItem>
          }
        </DropdownButton>
        { extra }
      </div>
    );
  }
}
