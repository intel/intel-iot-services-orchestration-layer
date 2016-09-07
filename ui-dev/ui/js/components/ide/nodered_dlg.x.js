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
/**
 * Copyright 2013, 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var {Modal} = require("react-bootstrap");

var dlg_mount_node = document.getElementById("hope-modal-dialog");

var stack = null;
var dlgcontainer = null;

function validateNodeProperties(node, definition, properties) {
  var isValid = true;
  for (var prop in definition) {
    if (definition.hasOwnProperty(prop)) {
      if (!validateNodeProperty(node, definition, prop, properties[prop])) {
        isValid = false;
      }
    }
  }
  return isValid;
}

function validateNodeProperty(node, definition, property, value) {
  var valid = true;
  if (/^\$\([a-zA-Z_][a-zA-Z0-9_]*\)$/.test(value)) {
    return true;
  }
  if ("required" in definition[property] && definition[property].required) {
    valid = value !== "";
  }
  if (valid && "validate" in definition[property]) {
    valid = definition[property].validate.call(node, value);
  }
  if (valid && definition[property].type && RED.nodes.getType(definition[property].type) && !("validate" in definition[property])) {
    if (!value || value == "_ADD_") {
      valid = definition[property].hasOwnProperty("required") && !definition[property].required;
    } else {
      var configNode = RED.nodes.node(value);
      valid = configNode !== null;
    }
  }
  return valid;
}


function validateNodeEditor(node, prefix, _def) {
  for (var prop in _def.defaults) {
    if (_def.defaults.hasOwnProperty(prop)) {
      validateNodeEditorProperty(node, _def.defaults, prop, prefix);
    }
  }
  if (_def.credentials) {
    for (prop in _def.credentials) {
      if (_def.credentials.hasOwnProperty(prop)) {
        validateNodeEditorProperty(node, _def.credentials, prop, prefix);
      }
    }
  }
}

function validateNodeEditorProperty(node, defaults, property, prefix) {
  var input = $("#" + prefix + "-" + property);
  if (input.length > 0) {
    if (!validateNodeProperty(node, defaults, property, input.val())) {
      input.addClass("input-error");
    } else {
      input.removeClass("input-error");
    }
  }
}

function prepareConfigNodeSelect(node, property, type, prefix) {
  var input = $("#" + prefix + "-" + property);
  if (input.length === 0) {
    return;
  }
  var newWidth = input.width();
  var attrStyle = input.attr('style');
  var m;
  if ((m = /width\s*:\s*(\d+(%|[a-z]+))/i.exec(attrStyle)) !== null) {
    newWidth = m[1];
  } else {
    newWidth = "70%";
  }
  var outerWrap = $("<div></div>").css({
    display: 'inline-block',
    position: 'relative'
  });
  var select = $('<select id="' + prefix + '-' + property + '"></select>').appendTo(outerWrap);

  outerWrap.width(newWidth).height(input.height());
  if (outerWrap.width() === 0) {
    outerWrap.width("70%");
  }
  input.replaceWith(outerWrap);
  updateConfigNodeSelect(property, type, node[property], prefix);
  $('<a id="' + prefix + '-lookup-' + property + '" class="editor-button"><i class="fa fa-pencil"></i></a>')
    .appendTo(outerWrap);
  $('#' + prefix + '-lookup-' + property).click(function(e) {
    showEditConfigNodeDialog(property, type, select.find(":selected").val(), prefix);
    e.preventDefault();
  });
  var label = "";
  var configNode = RED.nodes.node(node[property]);
  var node_def = RED.nodes.getType(type);

  if (configNode && node_def.label) {
    if (typeof node_def.label == "function") {
      label = node_def.label.call(configNode);
    } else {
      label = node_def.label;
    }
  }
  input.val(label);
}

function prepareConfigNodeButton(node, property, type, prefix) {
  var input = $("#" + prefix + "-" + property);
  input.val(node[property]);
  input.attr("type", "hidden");

  var button = $("<a>", {
    id: prefix + "-edit-" + property,
    class: "editor-button"
  });
  input.after(button);

  if (node[property]) {
    button.text(RED._("editor.configEdit"));
  } else {
    button.text(RED._("editor.configAdd"));
  }

  button.click(function(e) {
    showEditConfigNodeDialog(property, type, input.val() || "_ADD_", prefix);
    e.preventDefault();
  });
}


function preparePropertyEditor(node, property, prefix) {
  var input = $("#" + prefix + "-" + property);
  if (input.attr('type') === "checkbox") {
    input.prop('checked', node[property]);
  } else {
    var val = node[property];
    if (val == null) {
      if (property === "outputs")
        val = node.$hope_node.out.ports.length;
      else
        val = "";
    }
    input.val(val);
  }
}

function attachPropertyChangeHandler(node, definition, property, prefix) {
  $("#" + prefix + "-" + property).change(function(event, skipValidation) {
    if (!skipValidation) {
      validateNodeEditor(node, prefix, definition);
    }
  });
}

function populateCredentialsInputs(node, credDef, credData, prefix) {
  var cred;
  for (cred in credDef) {
    if (credDef.hasOwnProperty(cred)) {
      if (credDef[cred].type == 'password') {
        if (credData[cred]) {
          $('#' + prefix + '-' + cred).val(credData[cred]);
        } else if (credData['has_' + cred]) {
          $('#' + prefix + '-' + cred).val('__PWRD__');
        } else {
          $('#' + prefix + '-' + cred).val('');
        }
      } else {
        preparePropertyEditor(credData, cred, prefix);
      }
      attachPropertyChangeHandler(node, credDef, cred, prefix);
    }
  }
}

function updateNodeCredentials(node, credDefinition, prefix) {
  var changed = false;
  if (!node.credentials) {
    node.credentials = {
      _: {}
    };
  }

  for (var cred in credDefinition) {
    if (credDefinition.hasOwnProperty(cred)) {
      var input = $("#" + prefix + '-' + cred);
      var value = input.val();
      if (credDefinition[cred].type == 'password') {
        node.credentials['has_' + cred] = (value !== "");
        if (value == '__PWRD__') {
          continue;
        }
        changed = true;

      }
      node.credentials[cred] = value;
      if (value != node.credentials._[cred]) {
        changed = true;
      }
    }
  }
  return changed;
}

function updateConfigNodeSelect(name, type, value, prefix) {
  // if prefix is null, there is no config select to update
  if (prefix) {
    var button = $("#" + prefix + "-edit-" + name);
    if (button.length) {
      if (value) {
        button.text(RED._("editor.configEdit"));
      } else {
        button.text(RED._("editor.configAdd"));
      }
      $("#" + prefix + "-" + name).val(value);
    } else {

      var select = $("#" + prefix + "-" + name);
      var node_def = RED.nodes.getType(type);
      select.children().remove();

      var configNodes = [];

      RED.nodes.eachConfig(function(config) {
        if (config.type == type) {
          var label = "";
          if (typeof node_def.label == "function") {
            label = node_def.label.call(config);
          } else {
            label = node_def.label;
          }
          configNodes.push({
            id: config.id,
            label: label
          });
        }
      });

      configNodes.sort(function(A, B) {
        if (A.label < B.label) {
          return -1;
        } else if (A.label > B.label) {
          return 1;
        }
        return 0;
      });

      configNodes.forEach(function(cn) {
        select.append('<option value="' + cn.id + '"' + (value == cn.id ? " selected" : "") + '>' + cn.label + '</option>');
      });

      select.append('<option value="_ADD_"' + (value === "" ? " selected" : "") + '>' + RED._("editor.addNewType", {
        type: type
      }) + '</option>');
      window.setTimeout(function() {
        select.change();
      }, 50);
    }
  }
}

function showEditConfigNodeDialog(name, type, id, prefix) {
  var adding = (id == "_ADD_");
  var node_def = RED.nodes.getType(type);
  var editing_config_node = RED.nodes.node(id);

  if (adding) {
    $("#node-dialog-delete").hide();
    $("#node-dialog-ok").text("Add");
  } else {
    $("#node-dialog-delete").show();
    $("#node-dialog-ok").text("Update");
  }

  if (editing_config_node == null) {
    editing_config_node = {
      id: RED.nodes.id(),
      _def: node_def,
      type: type
    }
    for (var d in node_def.defaults) {
      if (node_def.defaults[d].value) {
        editing_config_node[d] = JSON.parse(JSON.stringify(node_def.defaults[d].value));
      }
    }
    editing_config_node["_"] = node_def._;
  }

  stack[stack.length - 1].div.detach();

  var div = $("<div/>").appendTo(dlgcontainer);

  stack.push({
    div: div,
    node: editing_config_node,
    property: name
  });
  update_titlebar();

  div.html($("script[data-template-name='" + type + "']").html());
  prepareEditDialog(editing_config_node, node_def, "node-config-input");
  div.find("a").removeAttr("href");
  RED.i18n_form(div, type);
  div.i18n();
}

function prepareEditDialog(node, definition, prefix) {
  for (var d in definition.defaults) {
    if (definition.defaults.hasOwnProperty(d)) {
      if (definition.defaults[d].type) {
        var configTypeDef = RED.nodes.getType(definition.defaults[d].type);
        if (configTypeDef) {
          if (configTypeDef.exclusive) {
            prepareConfigNodeButton(node, d, definition.defaults[d].type, prefix);
          } else {
            prepareConfigNodeSelect(node, d, definition.defaults[d].type, prefix);
          }
        } else {
          console.log("Unknown type:", definition.defaults[d].type);
          preparePropertyEditor(node, d, prefix);
        }
      } else {
        preparePropertyEditor(node, d, prefix);
      }
      attachPropertyChangeHandler(node, definition.defaults, d, prefix);
    }
  }

  function completePrepare() {
    if (definition.oneditprepare) {
      try {
        definition.oneditprepare.call(node);
      } catch (err) {
        console.log("oneditprepare", node.id, node.type, err.toString());
      }
    }
    // Now invoke any change handlers added to the fields - passing true
    // to prevent full node validation from being triggered each time
    for (var d in definition.defaults) {
      if (definition.defaults.hasOwnProperty(d)) {
        $("#" + prefix + "-" + d).trigger("change", [true]);
      }
    }
    if (definition.credentials) {
      for (d in definition.credentials) {
        if (definition.credentials.hasOwnProperty(d)) {
          $("#" + prefix + "-" + d).trigger("change", [true]);
        }
      }
    }
    validateNodeEditor(node, prefix, definition);
  }

  if (definition.credentials) {
    if (node.credentials) {
      populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
      completePrepare();
    } else {
      var data = {};
      node.credentials = data;
      node.credentials._ = $.extend(true, {}, data);
      populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
      completePrepare();
    }
  } else {
    completePrepare();
  }
}

function update_buttons() {
  if (stack.length > 1 && stack[stack.length - 1].node.$hope_node) {
    $("#node-dialog-delete").show();
    $("#node-dialog-ok").text("Update");
  } else {
    $("#node-dialog-delete").hide();
    $("#node-dialog-ok").text(stack.length === 1 ? "Done" : "Add");
  }
}

function update_titlebar() {
  var title = "";
  for (var i = 0; i < stack.length; i++) {
    var node = stack[i].node;
    var label = node.type;
    if (i === stack.length - 1) {
      if (RED.nodes.node(node.id)) {
        label = RED._("editor.editNode", {
          type: label
        });
      } else {
        label = RED._("editor.addNewConfig", {
          type: label
        });
      }
    }
    title += '<li>' + label + '</li>';
  }
  $(".editor-tray-breadcrumbs").empty().append($(title));
}

var NodeRedConfigDlg = React.createClass({

  _on_click_ok() {
    if (stack.length > 1) {
      this._ok_config();
      return;
    }

    var editing_node = this.$node;
    var definition = editing_node._def;
    var prefix = definition.category === "config" ? "node-config-input" : "node-input";
    var d;

    if (definition.oneditsave) {
      try {
        definition.oneditsave.call(editing_node);
      } catch (err) {
        console.log("oneditsave", editing_node.id, editing_node.type, err.toString());
      }
    }

    if (definition.defaults) {
      for (d in definition.defaults) {
        if (definition.defaults.hasOwnProperty(d)) {
          var input = $("#" + prefix + "-" + d);
          var newValue;
          if (input.attr('type') === "checkbox") {
            newValue = input.prop('checked');
          } else {
            newValue = input.val();
          }
          if (newValue != null) {
            if (d === "outputs" && (newValue.trim() === "" || isNaN(newValue))) {
              continue;
            }
            if (editing_node[d] != newValue) {
              if (definition.defaults[d].type) {
                if (newValue == "_ADD_") {
                  newValue = "";
                }
              }
              editing_node[d] = newValue;
            }
          }
        }
      }
    }
    if (definition.credentials) {
      var credDefinition = definition.credentials;
      updateNodeCredentials(editing_node, credDefinition, prefix);
    }

    var view = $hope.app.stores.graph.active_view;
    var node = editing_node.$hope_node;

    for (d in definition.defaults) {
      node.config[d] = editing_node[d];
    }
    node.credentials = editing_node.credentials;

    var outputs = editing_node.outputs;
    if (outputs > node.out.ports.length) {
      for (var i = node.out.ports.length; i < outputs; i++) {
        node.$add_port("out", {});
      }
    }
    else if (outputs < node.out.ports.length) {
      var names = _.keys(node.out.$ports_index);
      for (var i = outputs; i < names.length; i++) {
        var name = names[i];

        if (node.in.groups) {
          _.forOwn(node.in.groups, g => {
            _.pull(g.ports, name);
          });
        }

        if (node.in.tags) {
          _.forOwn(node.in.tags, tag => {
            if (tag.ports) {
              _.pull(tag.ports, name);
            }
          });
        }

        var edges_to_remove = [];
        _.forOwn(view.graph.edges, e => {
          if ((e.source.$node === node && e.source.name === name) || (e.target.$node === node && e.target.name === name)) {
            edges_to_remove.push(e);
          }
        });

        _.forEach(edges_to_remove, e => {
          view.remove("edge", e.id);
        });
        node.$remove_port("out", name);
      }
    }

    $hope.trigger_action("graph/change/node", {
      graph_id: view.id,
      id: node.id,
      data: {} // will be merged in
    });

    this._on_close();
  },

  _on_click_cancel() {
    if (stack.length > 1) {
      this._cancel_config();
      return;
    }

    var node = this.props.node;
    var spec = node.$get_spec();
    var definition = RED.nodes.getType(spec.name);

    if (definition.oneditcancel) {
      try {
        definition.oneditcancel.call(this.$node);
      } catch (err) {
        console.log("oneditcancel", node.id, spec.name, err.toString());
      }
    }

    this._on_close();
  },

  _ok_config() {
    var cur = stack.pop();
    var editing_config_node = cur.node;
    var configTypeDef = editing_config_node._def;

    if (configTypeDef.oneditsave) {
      try {
        configTypeDef.oneditsave.call(editing_config_node);
      } catch (err) {
        console.log("oneditsave", editing_config_node.id, editing_config_node.type, err.toString());
      }
    }

    for (var d in configTypeDef.defaults) {
      if (configTypeDef.defaults.hasOwnProperty(d)) {
        var newValue;
        var input = $("#node-config-input-" + d);
        if (input.attr('type') === "checkbox") {
          newValue = input.prop('checked');
        } else {
          newValue = input.val();
        }
        if (newValue != null && newValue !== editing_config_node[d]) {
          if (configTypeDef.defaults[d].type) {
            if (newValue == "_ADD_") {
              newValue = "";
            }
          }
          editing_config_node[d] = newValue;
        }
      }
    }

    editing_config_node.label = configTypeDef.label;

    if (configTypeDef.credentials) {
      updateNodeCredentials(editing_config_node, configTypeDef.credentials, "node-config-input");
    }

    // add hope-node
    var view = $hope.app.stores.graph.active_view;
    var node = editing_config_node.$hope_node;
    var svc = $hope.app.stores.hub.manager.get_service(editing_config_node.type + "_noderedservice");
    if (!node) {
      var nn = {
        graph_id: view.id,
        node: {
          id: editing_config_node.id,
          spec: svc.spec,
          config: {},
          credentials: editing_config_node.credentials
        },
        binding: {
          type: "fixed",
          thing: svc.thing,
          hub: svc.$thing.hub,
          service: svc.id
        }
      };
      for (d in configTypeDef.defaults) {
        nn.node.config[d] = editing_config_node[d];
      }
      $hope.trigger_action("graph/create/node", nn);
    } else {
      for (d in configTypeDef.defaults) {
        node.config[d] = editing_config_node[d];
      }
      node.credentials = editing_config_node.credentials;

      $hope.trigger_action("graph/change/node", {
        graph_id: view.id,
        id: node.id,
        data: {} // will be merged in
      });
    }

    cur.div.detach();
    stack[stack.length - 1].div.appendTo(dlgcontainer);
    update_titlebar();
    update_buttons();

    updateConfigNodeSelect(cur.property, cur.node.type, editing_config_node.id, stack.length > 1 ? "node-config-input" : "node-input");
  },

  _on_click_delete() {
    var cur = stack[stack.length - 1];
    var editing_config_node = cur.node;
    var view = $hope.app.stores.graph.active_view;

    $hope.trigger_action("graph/remove/node", {
      graph_id: view.id,
      id: editing_config_node.id
    });

    this._cancel_config();

    updateConfigNodeSelect(cur.property, cur.node.type, editing_config_node.id, stack.length > 1 ? "node-config-input" : "node-input");
  },


  _cancel_config() {
    var cur = stack.pop();

    if (cur.node._def.oneditcancel) {
      try {
        cur.node._def.oneditcancel.call(cur.node, !!cur.node.$hope_node);
      } catch (err) {
        console.log("oneditcancel", cur.node.type, err.toString());
      }
    }

    cur.div.detach();
    stack[stack.length - 1].div.appendTo(dlgcontainer);
    update_titlebar();
    update_buttons();
  },

  _on_close() {
    dlgcontainer = null;
    stack = null;
    this.refs.dlg._onHide();
    process.nextTick(() => {
      ReactDOM.unmountComponentAtNode(dlg_mount_node);
    });
  },

  componentDidMount() {
    var node = this.props.node;
    var spec = node.$get_spec();
    var definition = RED.nodes.getType(spec.name);

    dlgcontainer = $("#node-red-style");

    this.$node = RED.$make_node(node);

    var div = $("<div/>").appendTo(dlgcontainer);

    stack = [{
      div: div,
      node: this.$node,
    }];

    update_titlebar();

    div.html($("script[data-template-name='" + spec.name + "']").html());
    prepareEditDialog(this.$node, definition, "node-input");
    div.find("a").removeAttr("href");
    RED.i18n_form(div, spec.name);
    div.i18n();
  },

  render() {
    return (
      <Modal ref="dlg" show={true} dialogClassName="nodered-cfg-dlg" backdrop="static" onHide={this._on_close}>
        <div className="modal-header editor-tray-header" style={{padding: 0}}>
          <div className="editor-tray-titlebar">
            <ul className="editor-tray-breadcrumbs" />
          </div>
          <div className="editor-tray-toolbar">
            <button className="ui-button ui-widget ui-state-default leftButton" style={{display: "none"}} id="node-dialog-delete" onClick={this._on_click_delete}>Delete</button>
            <button className="ui-button ui-widget ui-state-default" onClick={this._on_click_cancel}>Cancel</button>
            <button className="ui-button ui-widget ui-state-default primary" onClick={this._on_click_ok} id="node-dialog-ok">Done</button>
          </div>
        </div>
        <div id="node-red-style" className="modal-body" />
      </Modal>
    );
  }
});


module.exports = {
  show_config_dlg: function(node) {
    ReactDOM.render(<NodeRedConfigDlg node={node} />, dlg_mount_node);
  }
};
