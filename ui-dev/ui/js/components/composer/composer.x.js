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
import {History, Lifecycle} from "react-router";
import {Row, Col} from "react-bootstrap";
import Node from "./node.x";
import Editor from "./editor.x";
import Dialog from "../common/dialog.x";

export default React.createClass({

  mixins: [ History, Lifecycle ],

  routerWillLeave() {
    var modified = false;
    _.forEach(this.files, f => {
      if (this.is_modified(f)) {
        modified |= true;
      }
    });
    if (modified) {
      return __("Your edit is NOT saved! Are you READLLY want to leave?");
    }
  },

  getInitialState() {
    $hope.check(this.props.params && this.props.params.id, "Composer", "No service id passed in");
    this.service_id = decodeURIComponent(this.props.params.id);

    this.files = [];
    this.expected = [];
    this.accepts = [];
    this.exists = [];
    this.spec_id = null;

    return {
      spec: {},
      active: 0
    };
  },

  set_modified(f, sts) {
    this.setState({
      [f.name + "modified"]: sts
    });
  },

  is_modified(f) {
    return this.state[f.name + "modified"];
  },

  get_origin_spec() {
    let svc = $hope.app.stores.hub.manager.get_service(this.service_id);
    if (!svc) {
      return null;
    }
    return $hope.app.stores.spec.get_spec(svc.spec);
  },

  init_spec() {
    if (!_.isEmpty(this.state.spec)) {
      return;
    }
    let origin_spec = this.get_origin_spec();
    if (!origin_spec) {
      return;
    }
    let spec = $hope.serialize(origin_spec, true, ["id", "path", "specbundle"]);
    this.setState({spec: spec});
    this.spec_id = origin_spec.id || $hope.uniqueId("SPEC__");
    this.files.push({
      name: __("Specification"),
      type: "json",
      content: JSON.stringify(spec, null, 2),
      open_always: true
    });
    this.forceUpdate();
  },

  _on_resize() {
    $hope.app.stores.composer.layout();
    $hope.log("forceUpdate", "Composer");
    this.forceUpdate();
  },

  _on_spec_event() {
    this.init_spec();
  },

  _on_hub_event() {
    this.init_spec();
  },

  _on_composer_event(e) {
    switch(e.event) {
      case "listed/files":
        this.expected = e.data.expected;
        this.accepts = _.union(e.data.expected, e.data.exsiting);
        this.exists = e.data.exsiting;
        this.init_spec();
        break;

      case "saved/spec":
        if (this.is_modified(this.files[0])) {
          this.set_modified(this.files[0], false);
        }
        break;

      case "readed/file":
        if (!_.find(this.files, ["name", e.name])) {
          this.files.push({
            name: e.name,
            type: _.endsWith(e.name, ".js") ? "javascript" : "json",
            content: e.content
          });
        }
        this._switch(this.files.length - 1);
        break;

      case "written/file":
        let wf = _.find(this.files, ["name", e.name]);
        if (wf && this.is_modified(wf)) {
          this.set_modified(wf, false);
        }
        if (this.exists.indexOf(e.name) < 0) {
          this.exists.push(e.name);
        }
        break;

      case "removed/file":
        _.pull(this.exists, e.name);
        if (this.expected.indexOf(e.name) < 0) {
          _.pull(this.accepts, e.name);
        }
        break;
    }
    this.forceUpdate();
  },

  _switch(idx) {
    this.setState({
      active: idx
    }, () => {
      var f = this.files[idx];
      if (f && f.editor) {
        f.editor.focus();
        f.editor.resize(false);
      }
      this.forceUpdate();
    });
  },

  _open(name) {
    var idx = _.findIndex(this.files, ["name", name]);

    if (idx >= 0) {
      this._switch(idx);
      return;
    }
    $hope.trigger_action("composer/read/file", {
      service_id: this.service_id,
      file_path: name
    });
  },

  _close_force(f) {
    var idx = this.files.indexOf(f);
    this.files.splice(idx, 1);
    if (this.state.active >= this.files.length) {
      this.state.active = this.files.length - 1;
    }
    this.set_modified(f, false);
    this.forceUpdate();
  },

  _close(f, e) {
    e.stopPropagation();
    if (!this.is_modified(f)) {
      this._close_force(f);
      return;
    }
    $hope.confirm(__("Close"),
      _("This would discard the changes of file. Please make sure this is what you expect!"),
      "warning", () => {

      this._close_force(f);
    });
  },

  _delete(name, e) {
    e.stopPropagation();
    $hope.confirm(__("Delete"),
      __("This would delete the file on the server. Please make sure this is what you expect!"),
      "warning", () => {
      var f = _.find(this.files, ["name", name]);
      if (f) {
        this._close_force(f);
      }
      $hope.trigger_action("composer/remove/file", {
        service_id: this.service_id,
        file_path: name
      });
    });
  },

  _on_editor_changed(f, newValue) {
    var new_spec;

    if (f === this.files[0]) {
      try {
        new_spec = JSON.parse(newValue);
      } catch(e) {
        return;   // TODO: ACE generated many unused/error events
      }
    }

    if (f.content !== newValue) {
      this.set_modified(f, true);
      f.content = newValue;

      if (f === this.files[0]) {
        this.setState({
          spec: new_spec
        });
      }
    }
  },

  _on_editor_loaded(f, editor) {
    f.editor = editor;
  },

  _on_back() {
    this.history.goBack();
  },

  _on_save() {
    var modified;
    _.forEach(this.files, f => {
      if (this.is_modified(f)) {
        modified = true;
        return false;
      }
    });
    if (!modified) {
      return;
    }

    $hope.confirm(__("Save All"),
      __("This would overwrite the service deployed on the server. Please make sure this is what you expect!"),
      "warning", this._on_save_all);
  },

  _on_save_all() {
    _.forEach(this.files, f => {
      this.set_modified(f, false);
      if (f === this.files[0]) {
        var ss = _.cloneDeep(this.state.spec);
        ss.id = this.spec_id;

        $hope.trigger_action("composer/save/spec", {
          service_id: this.service_id,
          spec: ss
        });
      }
      else {
        $hope.trigger_action("composer/write/file", {
          service_id: this.service_id,
          file_path: f.name,
          content: f.content
        });
      }
    });
  },

  _on_spec_changed(spec) {
    var f0 = this.files[0];
    f0.content = JSON.stringify(spec, null, 2);
    this.set_modified(f0, true);
    var editor = f0.editor;
    if (editor) {
      editor.setValue(f0.content, -1);
    }
  },

  _on_create_file() {
    Dialog.show_edit_dialog(__("New File"), name => {
      name = name && name.trim();
      if (!name || name.indexOf("..") >= 0) {
        return $hope.notify("error", __("Invalid file name"));
      }
      if (this.accepts.indexOf(name) < 0) {
        this.accepts.push(name);
        this.forceUpdate();
      }
      this._open(name);

    }, "", __("Enter File Name"), __("Create"));
  },

  componentWillMount() {
    $hope.app.stores.composer.layout();
  },

  componentDidMount() {
    window.addEventListener("resize", this._on_resize);
    $hope.app.stores.composer.on("composer", this._on_composer_event);
    $hope.app.stores.spec.on("spec", this._on_spec_event);
    $hope.app.stores.hub.on("hub", this._on_hub_event);

    $hope.trigger_action("composer/list/files", {
      service_id: this.service_id
    });
  },

  componentWillUnmount() {
    window.removeEventListener("resize", this._on_resize);
    $hope.app.stores.composer.removeListener("composer", this._on_composer_event);
    $hope.app.stores.spec.removeListener("spec", this._on_spec_event);
    $hope.app.stores.hub.removeListener("hub", this._on_hub_event);
  },

  render_file_list() {
    var af = this.files[this.state.active];
    return _.map(this.accepts, f => {
      var exist = this.exists.indexOf(f) >= 0;
      var key = "flst_" + f.replace(/\./g, "_");
      return (
        <Row className={"hope-composer-file" + (exist ? " exists" : "") + (af && f === af.name ? " active" : "")}
            key={key}
            onDoubleClick={this._open.bind(this, f)}>
          <Col xs={11}>
            {f}
          </Col>
          { exist &&
            <Col xs={1}>
              <i onClick={this._delete.bind(this, f)}
                className="fa fa-trash hope-composer-file-trash" />
            </Col>
          }
        </Row>
      );
    }, this);
  },

  render_file_tabs() {
    return (
      <div className="hope-ftabs-wrapper">
        <ul className="hope-ftabs">
          { _.map(this.files, (f, idx) => {
              var key = "ftab_" + f.name.replace(/\./g, "_");
              var active = idx === this.state.active;
              return (
                <li className={active ? "active" : ""}
                    key={key}
                    onClick={this._switch.bind(this, idx)}>
                  <span className={"hope-ftabs-name" + (this.is_modified(f) ? " modified" : "")}>
                    {f.name}
                  </span>
                  { idx !== 0 && active &&
                    <span onClick={this._close.bind(this, f)}
                        className="fa fa-close hope-ftabs-btn" />
                  }
                </li>
              );
            }, this) }
        </ul>
      </div>
    );
  },

  render_editors() {
    return _.map(this.files, (f, idx) => {
      var key = "ace_editor" + f.name.replace(/\./g, "_");
      return (
        <Editor mode={f.type}
          visible={idx === this.state.active}
          name={key}
          key={key}
          value={f.content}
          onLoad={this._on_editor_loaded.bind(this, f)}
          onChange={this._on_editor_changed.bind(this, f)} />
      );
    });
  },

  render() {
    var store = $hope.app.stores.composer;

    return (
      <Row className="hope-composer">
        <Col xs={1} style={{
          width: store.left_toolbar.width,
          height: store.left_toolbar.height
        }}>
          <div className="hope-left-toolbar">
            <i onClick={this._on_back} className="fa fa-mail-reply" />
            <i onClick={this._on_save} className="fa fa-floppy-o" />
          </div>
        </Col>
        <Col xs={1} style={{
          width: store.node.width,
          height: store.editor.height
        }}>
          <Node width={store.node.width}
              spec={this.state.spec}
              active={this.state.active === 0}
              onChanged={this._on_spec_changed} />
          <Row className="hope-composer-separator">
            {__("Package Files")}
          </Row>
          <div className="hope-composer-file-list">
            { this.render_file_list() }
            <Row className="text-center">
              <i onClick={this._on_create_file} className="fa fa-plus hope-composer-file-add" />
            </Row>
          </div>
        </Col>
        <Col xs={10} style={{width: store.editor.width}}>
          <Row style={{height: store.file_tabs.height}}>
            { this.render_file_tabs() }
          </Row>
          <Row key="reditor" style={{height: store.editor.height}}>
            { this.render_editors() }
          </Row>
        </Col>
      </Row>
    );
  }
});
