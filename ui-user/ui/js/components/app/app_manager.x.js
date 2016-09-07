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
import App from "./app.x";
import {Row, Col, SplitButton, MenuItem} from "react-bootstrap";
import SearchBox from "./search_box.x";

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
      if(!_.isArray(a.uis) || a.uis.length === 0) {
        return false;
      }
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
            </ul>
          </Row>
        </Row>
      </div>
    );
  }
}

