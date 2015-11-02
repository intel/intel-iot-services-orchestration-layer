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
import {Row, Col, SplitButton, MenuItem, ModalTrigger} from "react-bootstrap";
import {Navigation} from "react-router";
import AppPanel from "./app_panel.x";
import DlgCreate from "../ide/dlg_create.x";
import Workflow from "./workflow.x";

// Don't use class here as we need mixin 
var AppHome = React.createClass({

  mixins: [Navigation],

  statics: {
    willTransitionTo: function(transition, params) {
      if (!params.id) {
        $hope.check(false, "AppHome", "No id passed in");
        transition.abort();
      }
    }
  },

  getInitialState: function() {
    return {
      app: $hope.app.stores.app.get_app(this.props.params.id),
      working: []
    };
  },

  _on_graph_event: function(e) {
    $hope.log("event", "AppHome", e);
    $hope.log("forceUpdate", "AppHome");

    var app = this.state.app;
    switch(e.event) {
      case "removed":
        if (app) {
          _.remove(app.graphs, g => g.id === e.id);
        }
        $hope.notify("success", "Workflow successfully removed!");
        break;
    }
    this.forceUpdate();
  },

  _on_selected: function(app) {
    this.setState({
      app: app
    });
  },

  _on_create: function(data) {
    var name = data && data.name && data.name.trim();
    if (!name) {
      return $hope.notify("error", "Invalid workflow name");
    }
    var app = $hope.app.stores.app.get_app(this.state.app.id);
    if (_.find(app.graphs, "name", name)) {
      return $hope.notify("error", "This name already exists in the App");
    }
    // We directly create an graph object and then transit
    // We don't use trigger_acton, because we will make a transition anyway
    // and we need to ensure the object is created transit
    var view = $hope.app.stores.graph.create_view(this.state.app.id, 
      name, data.description);

    this.transitionTo("ide", {id: view.id});
  },

  _on_resize: function() {
    this.forceUpdate();
  },

  componentDidMount: function() {
    $hope.app.stores.graph.on("graph", this._on_graph_event);
    window.addEventListener("resize", this._on_resize);

    var app;
    $hope.app.stores.app.ensure_apps_loaded$().then(() => {
      app = $hope.app.stores.app.get_app(this.props.params.id);
      if (_.isEmpty(app.graphs)) {
        return [];
      }
      return $hope.app.server.graph.status$(_.pluck(app.graphs, "id"));
    }).then((sts) => {
      var working = _.pluck(_.filter(sts, "status", "Working"), "graph");
      this.setState({
        app: app,
        working: working
      });
    }).done();

    this.listener = $hope.listen_system("wfe/changed", ev => {
      var working = this.state.working;
      if (ev.stoped) {
        working = _.difference(this.state.working, ev.stoped);
      }
      if (ev.started) {
        working = _.union(this.state.working, ev.started);
      }
      this.setState({
        working: working
      })
    });
  },

  componentWillUnmount: function() {
    $hope.app.stores.graph.removeListener("graph", this._on_graph_event);  
    window.removeEventListener("resize", this._on_resize);
    this.listener.dispose();
  },

  render: function() {
    var app = this.state.app;
    if (!app) {
      return null;
    }

    var working = this.state.working;
    return (
      <div className="hope-app-home">
        <Row className="hope-app-home-toolbar">
          <div className="hope-app-home-app-dropdown">
            <SplitButton title={app.name}>
            {
              _.map($hope.app.stores.app.get_all_apps(), a =>
                <MenuItem key={a.id} onSelect={this._on_selected.bind(this, a)}>
                  {a.name}
                </MenuItem>)
            }
            </SplitButton>
          </div>
        </Row>
        <Row>
          <Col xs={3} style={{width: 300}}>
            <AppPanel app={app} working={working} />
          </Col>
          <Col xs={1} style={{width: window.innerWidth - 300}}>
            <Row className="hope-app-home-body">
              <div className="hope-app-home-title-bar">
                <span className="hope-app-home-title">Workflow List</span>
              </div>
            </Row>
            <Row>
              <ul className="hope-app-home-list">
              {
                _.map(app.graphs, g =>
                  <li key={g.id}>
                    <Workflow app={app} graph={g} working={working} />
                  </li>)
              }
              { !app.is_builtin &&
                <ModalTrigger modal={<DlgCreate title="Create Workflow" onClickCreate={this._on_create}/>}>
                  <li>
                    <div className="hv-center hope-workflow add-new">
                      <i className="fa fa-4x fa-plus" />
                    </div>
                  </li>
                </ModalTrigger>
              }
              </ul>
            </Row>
          </Col>
        </Row>
      </div>
    );
  }
});

export default AppHome;