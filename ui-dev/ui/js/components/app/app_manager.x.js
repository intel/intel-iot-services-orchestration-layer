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
import {Row, Col, SplitButton, MenuItem} from "react-bootstrap";
import App from "./app.x";
import Dialog from "../ide/dialog.x";
import SearchBox from "./search_box.x";
import Graph from "../../lib/graph";

const LAST_MODIFIED = __("Last Modified");
const LAST_CREATED = __("Last Created");

function sort_by_time(field) {
  return (a, b) => {
    var x = a[field] || 0, y = b[field] || 0;
    if (y > x) {
      return +1;
    }
    if (y < x) {
      return -1;
    }
    return 0;
  };
}

export default class AppManager extends ReactComponent {

  constructor() {
    super();

    this.state = {
      search: "",
      sort_by: LAST_MODIFIED
    };
  }
 
  _on_app_event(e) {
    $hope.log("event", "AppManager", e);
    $hope.log("forceUpdate", "AppManager");

    switch(e.event) {
      case "created":
        var gdata = Graph.create({
          name: "Default Workflow",
          description: ""
        }).$serialize();
        var udata = {
          id: $hope.uniqueId("UI_"),
          name: "Default UI",
          description: ""
        };
        $Q.all([
          $hope.app.server.app.create_graph$(e.appid, gdata),
          $hope.app.server.app.create_ui$(e.appid, udata)
        ]).then(()=> {
          var app = $hope.app.stores.app.get_app(e.appid);
          app.graphs.push(gdata);
          app.uis.push(udata);
          this.forceUpdate();

          $hope.trigger_action("app/update/app", {
            id: app.id,
            props: {
              main_ui: udata.id
            }
          });
        });
        return;

      case "removed":
        _.map($hope.app.stores.graph.views, v => {
          if (!v.get_app()) {
            $hope.trigger_action("graph/close", {
              graph_id: v.id
            });
          }
        });
        _.map($hope.app.stores.ui.views, v => {
          if (!v.get_app()) {
            $hope.trigger_action("ui/close", {
              ui_id: v.id
            });
          }
        });
        $hope.notify("success", __("App successfully removed!"));
        break;
    }

    this.forceUpdate();
  }

  _on_search(search) {
    this.setState({
      search: search
    });
  }

  _on_sort(by) {
    this.setState({
      sort_by: by
    });
  }

  _on_show_dlg() {
    Dialog.show_create_dialog(__("Create App"), this._on_create);
  }

  _on_create(data) {
    var name = data && data.name && data.name.trim();
    if (!name) {
      return $hope.notify("error", __("Invalid App name"));
    }
    var apps = $hope.app.stores.app.get_all_apps();
    if (_.find(apps, ["name", name])) {
      return $hope.notify("error", __("This name already exists"));
    }

    $hope.trigger_action("app/create/app", {
      name: name,
      description: data.description
    });
  }

  componentDidMount() {
    $hope.app.stores.app.on("app", this._on_app_event);
    $hope.app.stores.app.ensure_apps_loaded$().then(() => {
      this.forceUpdate();
    }).done();
  }

  componentWillUnmount() {
    $hope.app.stores.app.removeListener("app", this._on_app_event);  
  }

  render() {
    var app_store = $hope.app.stores.app;
    var apps = [];
    var arr = _.filter(app_store.get_all_apps(), a => {
      if (!this.state.search) {
        return true;
      }
      return a.name.toLowerCase().indexOf(this.state.search.toLowerCase()) >= 0;
    });
    if(this.state.sort_by === LAST_MODIFIED) {
      arr.sort(sort_by_time("modify_time"));
    }
    else if(this.state.sort_by === LAST_CREATED) {
      arr.sort(sort_by_time("create_time"));
    }
    apps = _.map(arr, a => <li key={a.id}><App app={a}/></li>);
    return (
      <div className="hope-app-manager">
        <Row className="hope-app-mgr-toolbar">
          <Col xs={4} />
          <Col xs={3}>
            <SearchBox 
              onSubmit={this._on_search}
              onChange={this._on_search}
              initialSearchString={this.state.search}/>
          </Col>
          <Col xs={2} className="hope-app-mgr-sort-dropdown">
            <SplitButton id="sortby" title={this.state.sort_by}>
              <MenuItem onSelect={this._on_sort.bind(this, LAST_MODIFIED)}>{LAST_MODIFIED}</MenuItem>
              <MenuItem onSelect={this._on_sort.bind(this, LAST_CREATED)}>{LAST_CREATED}</MenuItem>
            </SplitButton>
          </Col>
          <Col xs={4} />
        </Row>
        <Row className="hope-app-mgr-body">
          <Row className="hope-app-mgr-title-bar">
            <span className="hope-app-mgr-title">{__("My App")}</span>
          </Row>
          <Row>
            <ul className="hope-app-mgr-list">
              {apps}
              <li onClick={this._on_show_dlg}>
                <div className="hv-center hope-app add-new">
                  <i className="fa fa-2x fa-plus" />
                </div>
              </li>
            </ul>
          </Row>
        </Row>
      </div>
    );
  }
}

