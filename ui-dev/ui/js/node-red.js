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
var i18n = require("i18next-client");

var nodeDefinitions = {};
var nodeNamespace;

var RED = {
  $$nodes: {}
};

var i18n_options = {
  ns: "editor"
};

RED.$make_node = function(hope_node) {
  var spec = hope_node.$get_spec();
  var definition = RED.nodes.getType(spec.name);
  return _.merge({
    id: hope_node.id,
    type: spec.name,
    _def: definition,
    _: definition._,
    credentials: hope_node.credentials,
    $hope_node: hope_node
  }, hope_node.config);
};

RED.notify = function(msg, level) {
  return $hope.notify(level, msg);
}


RED.nodes = {
  registerType: function(nt, def) {
    nodeDefinitions[nt] = def;
    if (def.category != "subflows") {
      def._ = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        if (args[0].indexOf(":") === -1) {
          args[0] = (nodeNamespace[nt] || "node-red") + ":" + args[0];
        }
        return RED._.apply(null, args);
      }
    }
  },
  getType: function(nt) {
    return nodeDefinitions[nt];
  },
  id: function() {
    return $hope.uniqueId("NODE_RED_");
  },
  node: function(id) {
    var n = RED.$$nodes[id];
    if (n) {
      return RED.$make_node(n);
    }
    return null;
  },
  eachNode: function(cb) {
    _.forEach(RED.$$nodes, node => {
      var fake = RED.$make_node(node);
      cb(fake);
    });
  },
  eachLink: function(cb) {},
  eachConfig: function(cb) {
    _.forEach(RED.$$nodes, node => {
      var spec = node.$get_spec();
      var definition = RED.nodes.getType(spec.name);
      if (spec.nr && spec.nr.category === "config") {
        var fake = RED.$make_node(node);
        fake.type = spec.nr.type;
        cb(fake);
      }
    });
  },
  eachSubflow: function(cb) {},
  eachWorkspace: function(cb) {},
  filterNodes: function(filter) {
    var result = [];

    _.forEach(RED.$$nodes, node => {
      var fake = RED.$make_node(node);
      if (filter.hasOwnProperty("type") && fake.type !== filter.type) {
        return;
      }
      result.push(fake);
    });
    return result;
  },
  filterLinks: function(filter) {
    return [];
  }
};

RED.settings = {
  httpNodeRoot : "/"
};

RED.library = {
  create: function(){},
  register: function(){}
};

RED.validators = {
  number: function() {
    return function(v) {
      return v !== '' && !isNaN(v);
    }
  },
  regex: function(re) {
    return function(v) {
      return re.test(v);
    }
  }
};

RED.editor = {
  createEditor: function(options) {
    var editor = ace.edit(options.id);
    //editor.setTheme("ace/theme/tomorrow");
    var session = editor.getSession();
    if (options.mode) {
      session.setMode(options.mode);
    }
    if (options.foldStyle) {
      session.setFoldStyle(options.foldStyle);
    } else {
      session.setFoldStyle('markbeginend');
    }
    if (options.options) {
      editor.setOptions(options.options);
    } else {
      editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true
      });
    }
    editor.$blockScrolling = Infinity;
    if (options.value) {
      session.setValue(options.value, -1);
    }
    return editor;
  }
};


(function($) {

  $.widget("nodered.editableList", {
    _create: function() {
      var that = this;

      this.element.addClass('red-ui-editableList-list');
      this.uiWidth = this.element.width();
      this.uiContainer = this.element
        .wrap("<div>")
        .parent();
      this.topContainer = this.uiContainer.wrap("<div>").parent();

      this.topContainer.addClass('red-ui-editableList');

      if (this.options.addButton !== false) {
        var addLabel;
        if (typeof this.options.addButton === 'string') {
          addLabel = this.options.addButton
        } else {
          if (RED && RED._) {
            addLabel = RED._("editableList.add");
          } else {
            addLabel = 'add';
          }
        }
        $('<a class="editor-button editor-button-small" style="margin-top: 4px;"><i class="fa fa-plus"></i> ' + addLabel + '</a>')
          .appendTo(this.topContainer)
          .click(function(evt) {
            evt.preventDefault();
            that.addItem({});
          });
      }

      this.uiContainer.addClass("red-ui-editableList-container");

      this.uiHeight = this.element.height();

      var minHeight = this.element.css("minHeight");
      if (minHeight !== '0px') {
        this.uiContainer.css("minHeight", minHeight);
        this.element.css("minHeight", 0);
      }
      if (this.options.height !== 'auto') {
        this.uiContainer.css("overflow-y", "scroll");
        if (!isNaN(this.options.height)) {
          this.uiHeight = this.options.height;
        }
      }
      this.element.height('auto');

      var attrStyle = this.element.attr('style');
      var m;
      if ((m = /width\s*:\s*(\d+%)/i.exec(attrStyle)) !== null) {
        this.element.width('100%');
        this.uiContainer.width(m[1]);
      }
      if (this.options.sortable) {
        var handle = (typeof this.options.sortable === 'string') ?
          this.options.sortable :
          ".red-ui-editableList-item-handle";
        var sortOptions = {
          axis: "y",
          update: function(event, ui) {
            if (that.options.sortItems) {
              that.options.sortItems(that.items());
            }
          },
          handle: handle,
          cursor: "move",
          tolerance: "pointer",
          forcePlaceholderSize: true,
          placeholder: "red-ui-editabelList-item-placeholder",
          start: function(e, ui) {
            ui.placeholder.height(ui.item.height() - 4);
          }
        };
        if (this.options.connectWith) {
          sortOptions.connectWith = this.options.connectWith;
        }

        this.element.sortable(sortOptions);
      }

      this._resize();
    },
    _resize: function() {
      var currentFullHeight = this.topContainer.height();
      var innerHeight = this.uiContainer.height();
      var delta = currentFullHeight - innerHeight;
      if (this.uiHeight !== 0) {
        this.uiContainer.height(this.uiHeight - delta);
      }
      if (this.options.resize) {
        this.options.resize();
      }
      if (this.options.resizeItem) {
        var that = this;
        this.element.children().each(function(i) {
          that.options.resizeItem($(this).find(".red-ui-editableList-item-content"), i);
        });
      }
    },
    _destroy: function() {},
    width: function(desiredWidth) {
      this.uiWidth = desiredWidth;
      this._resize();
    },
    height: function(desiredHeight) {
      this.uiHeight = desiredHeight;
      this._resize();
    },
    addItem: function(data) {
      var that = this;
      data = data || {};
      var li = $('<li>').appendTo(this.element);
      var row = $('<div/>').addClass("red-ui-editableList-item-content").appendTo(li);
      row.data('data', data);
      if (this.options.sortable === true) {
        $('<i class="red-ui-editableList-item-handle fa fa-bars"></i>').appendTo(li);
        li.addClass("red-ui-editableList-item-sortable");
      }
      if (this.options.removable) {
        var deleteButton = $('<a/>', {
          class: "red-ui-editableList-item-remove editor-button editor-button-small"
        }).appendTo(li);
        $('<i/>', {
          class: "fa fa-remove"
        }).appendTo(deleteButton);
        li.addClass("red-ui-editableList-item-removable");
        deleteButton.click(function() {
          li.addClass("red-ui-editableList-item-deleting")
          li.fadeOut(300, function() {
            $(this).remove();
            if (that.options.removeItem) {
              that.options.removeItem(row.data('data'));
            }
          });
        });
      }
      if (this.options.addItem) {
        var index = that.element.children().length - 1;
        setTimeout(function() {
          that.options.addItem(row, index, data);
          setTimeout(function() {
            that.uiContainer.scrollTop(that.element.height());
          }, 0);
        }, 0);
      }
    },
    removeItem: function(data) {
      var items = this.element.children().filter(function(f) {
        return data === $(this).find(".red-ui-editableList-item-content").data('data');
      });
      items.remove();
      if (this.options.removeItem) {
        this.options.removeItem(data);
      }
    },
    items: function() {
      return this.element.children().map(function(i) {
        return $(this).find(".red-ui-editableList-item-content");
      });
    },
    empty: function() {
      this.element.empty();
    }
  });

  function validateExpression(str) {
    var length = str.length;
    var start = 0;
    var inString = false;
    var inBox = false;
    var quoteChar;
    var v;
    for (var i = 0; i < length; i++) {
      var c = str[i];
      if (!inString) {
        if (c === "'" || c === '"') {
          if (!inBox) {
            return false;
          }
          inString = true;
          quoteChar = c;
          start = i + 1;
        } else if (c === '.') {
          if (i === 0 || i === length - 1) {
            return false;
          }
          // Next char is a-z
          if (!/[a-z0-9]/i.test(str[i + 1])) {
            return false;
          }
          start = i + 1;
        } else if (c === '[') {
          if (i === 0) {
            return false;
          }
          if (i === length - 1) {
            return false;
          }
          // Next char is either a quote or a number
          if (!/["'\d]/.test(str[i + 1])) {
            return false;
          }
          start = i + 1;
          inBox = true;
        } else if (c === ']') {
          if (!inBox) {
            return false;
          }
          if (start != i) {
            v = str.substring(start, i);
            if (!/^\d+$/.test(v)) {
              return false;
            }
          }
          start = i + 1;
          inBox = false;
        } else if (c === ' ') {
          return false;
        }
      } else {
        if (c === quoteChar) {
          // Next char must be a ]
          if (!/\]/.test(str[i + 1])) {
            return false;
          }
          start = i + 1;
          inString = false;
        }
      }

    }
    if (inBox || inString) {
      return false;
    }
    return true;
  }
  var allOptions = {
    msg: {
      value: "msg",
      label: "msg.",
      validate: validateExpression
    },
    flow: {
      value: "flow",
      label: "flow.",
      validate: validateExpression
    },
    global: {
      value: "global",
      label: "global.",
      validate: validateExpression
    },
    str: {
      value: "str",
      label: "string",
      icon: "images/typedInput/az.png"
    },
    num: {
      value: "num",
      label: "number",
      icon: "images/typedInput/09.png",
      validate: /^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/
    },
    bool: {
      value: "bool",
      label: "boolean",
      icon: "images/typedInput/bool.png",
      options: ["true", "false"]
    },
    json: {
      value: "json",
      label: "JSON",
      icon: "images/typedInput/json.png",
      validate: function(v) {
        try {
          JSON.parse(v);
          return true;
        } catch (e) {
          return false;
        }
      }
    },
    re: {
      value: "re",
      label: "regular expression",
      icon: "images/typedInput/re.png"
    },
    date: {
      value: "date",
      label: "timestamp",
      hasValue: false
    }
  };
  var nlsd = false;

  $.widget("nodered.typedInput", {
    _create: function() {
      if (!nlsd && RED && RED._) {
        for (var i in allOptions) {
          if (allOptions.hasOwnProperty(i)) {
            allOptions[i].label = RED._("typedInput.type." + i, {
              defaultValue: allOptions[i].label
            });
          }
        }
      }
      nlsd = true;
      var that = this;

      this.disarmClick = false;
      this.element.addClass('red-ui-typedInput');
      this.uiWidth = this.element.outerWidth();
      this.elementDiv = this.element.wrap("<div>").parent().addClass('red-ui-typedInput-input');
      this.uiSelect = this.elementDiv.wrap("<div>").parent();
      var attrStyle = this.element.attr('style');
      var m;
      if ((m = /width\s*:\s*(\d+%)/i.exec(attrStyle)) !== null) {
        this.element.css('width', '100%');
        this.uiSelect.width(m[1]);
        this.uiWidth = null;
      } else {
        this.uiSelect.width(this.uiWidth);
      }
      ["Right", "Left"].forEach(function(d) {
        var m = that.element.css("margin" + d);
        that.uiSelect.css("margin" + d, m);
        that.element.css("margin" + d, 0);
      });
      this.uiSelect.addClass("red-ui-typedInput-container");

      this.options.types = this.options.types || Object.keys(allOptions);

      this.selectTrigger = $('<a></a>').prependTo(this.uiSelect);
      $('<i class="fa fa-sort-desc"></i>').appendTo(this.selectTrigger);
      this.selectLabel = $('<span></span>').appendTo(this.selectTrigger);

      this.types(this.options.types);

      if (this.options.typeField) {
        this.typeField = $(this.options.typeField).hide();
        var t = this.typeField.val();
        if (t && this.typeMap[t]) {
          this.options.default = t;
        }
      } else {
        this.typeField = $("<input>", {
          type: 'hidden'
        }).appendTo(this.uiSelect);
      }

      this.element.on('focus', function() {
        that.uiSelect.addClass('red-ui-typedInput-focus');
      });
      this.element.on('blur', function() {
        that.uiSelect.removeClass('red-ui-typedInput-focus');
      });
      this.element.on('change', function() {
        that.validate();
      })
      this.selectTrigger.click(function(event) {
        event.preventDefault();
        if (that.typeList.length > 1) {
          that._showMenu(that.menu, that.selectTrigger);
        } else {
          that.element.focus();
        }
      });

      // explicitly set optionSelectTrigger display to inline-block otherwise jQ sets it to 'inline'
      this.optionSelectTrigger = $('<a class="red-ui-typedInput-option-trigger" style="display:inline-block"><i class="fa fa-sort-desc"></i></a>').appendTo(this.uiSelect);
      this.optionSelectLabel = $('<span></span>').prependTo(this.optionSelectTrigger);
      this.optionSelectTrigger.click(function(event) {
        event.preventDefault();
        if (that.optionMenu) {
          that.optionMenu.css({
            minWidth: that.optionSelectLabel.width()
          });

          that._showMenu(that.optionMenu, that.optionSelectLabel)
        }
      });
      this.type(this.options.default || this.typeList[0].value);
    },
    _hideMenu: function(menu) {
      $(document).off("mousedown.close-property-select");
      menu.hide();
      this.element.focus();
    },
    _createMenu: function(opts, callback) {
      var that = this;
      var menu = $("<div>").addClass("red-ui-typedInput-options");
      opts.forEach(function(opt) {
        if (typeof opt === 'string') {
          opt = {
            value: opt,
            label: opt
          };
        }
        var op = $('<a>').attr("value", opt.value).appendTo(menu);
        if (opt.label) {
          op.text(opt.label);
        }
        if (opt.icon) {
          $('<img>', {
            src: opt.icon,
            style: "margin-right: 4px; height: 18px;"
          }).prependTo(op);
        } else {
          op.css({
            paddingLeft: "18px"
          });
        }

        op.click(function(event) {
          event.preventDefault();
          callback(opt.value);
          that._hideMenu(menu);
        });
      });
      menu.css({
        display: "none",
      });
      menu.appendTo(document.body);
      return menu;

    },
    _showMenu: function(menu, relativeTo) {
      if (this.disarmClick) {
        this.disarmClick = false;
        return
      }
      var that = this;
      var pos = relativeTo.offset();
      var height = relativeTo.height();
      var menuHeight = menu.height();
      var top = (height + pos.top - 3);
      if (top + menuHeight > $(window).height()) {
        top -= (top + menuHeight) - $(window).height() + 5;
      }
      menu.css({
        top: top + "px",
        left: (2 + pos.left) + "px",
      });
      menu.slideDown(100);
      this._delay(function() {
        that.uiSelect.addClass('red-ui-typedInput-focus');
        $(document).on("mousedown.close-property-select", function(event) {
          if (!$(event.target).closest(menu).length) {
            that._hideMenu(menu);
          }
          if ($(event.target).closest(relativeTo).length) {
            that.disarmClick = true;
            event.preventDefault();
          }
        })
      });
    },
    _getLabelWidth: function(label) {
      var labelWidth = label.outerWidth();
      if (labelWidth === 0) {
        var container = $('<div class="red-ui-typedInput-container"></div>').css({
          position: "absolute",
          top: 0,
          left: -1000
        }).appendTo(document.body);
        var newTrigger = label.clone().appendTo(container);
        labelWidth = newTrigger.outerWidth();
        container.remove();
      }
      return labelWidth;
    },
    _resize: function() {
      if (this.uiWidth !== null) {
        this.uiSelect.width(this.uiWidth);
      }
      if (this.typeMap[this.propertyType] && this.typeMap[this.propertyType].hasValue === false) {
        this.selectTrigger.css('width', "100%");
      } else {
        this.selectTrigger.width('auto');
        var labelWidth = this._getLabelWidth(this.selectTrigger);
        this.elementDiv.css('left', labelWidth + "px");
        if (this.optionSelectTrigger) {
          this.optionSelectTrigger.css('left', (labelWidth + 5) + "px");
        }
      }
    },
    _destroy: function() {
      this.menu.remove();
    },
    types: function(types) {
      var that = this;
      var currentType = this.type();
      this.typeMap = {};
      this.typeList = types.map(function(opt) {
        var result;
        if (typeof opt === 'string') {
          result = allOptions[opt];
        } else {
          result = opt;
        }
        that.typeMap[result.value] = result;
        return result;
      });
      this.selectTrigger.toggleClass("disabled", this.typeList.length === 1);
      if (this.menu) {
        this.menu.remove();
      }
      this.menu = this._createMenu(this.typeList, function(v) {
        that.type(v)
      });
      if (currentType && !this.typeMap.hasOwnProperty(currentType)) {
        this.type(this.typeList[0].value);
      }
    },
    width: function(desiredWidth) {
      this.uiWidth = desiredWidth;
      this._resize();
    },
    value: function(value) {
      if (!arguments.length) {
        return this.element.val();
      } else {
        if (this.typeMap[this.propertyType].options) {
          if (this.typeMap[this.propertyType].options.indexOf(value) === -1) {
            value = "";
          }
          this.optionSelectLabel.text(value);
        }
        this.element.val(value);
        this.element.trigger('change', this.type(), value);
      }
    },
    type: function(type) {
      if (!arguments.length) {
        return this.propertyType;
      } else {
        var that = this;
        var opt = this.typeMap[type];
        if (opt && this.propertyType !== type) {
          this.propertyType = type;
          this.typeField.val(type);
          this.selectLabel.empty();
          var image;
          if (opt.icon) {
            image = new Image();
            image.name = opt.icon;
            image.src = opt.icon;
            $('<img>', {
              src: opt.icon,
              style: "margin-right: 4px;height: 18px;"
            }).prependTo(this.selectLabel);
          } else {
            this.selectLabel.text(opt.label);
          }
          if (opt.options) {
            if (this.optionSelectTrigger) {
              this.optionSelectTrigger.show();
              this.elementDiv.hide();
              this.optionMenu = this._createMenu(opt.options, function(v) {
                that.optionSelectLabel.text(v);
                that.value(v);
              });
              var currentVal = this.element.val();
              if (opt.options.indexOf(currentVal) !== -1) {
                this.optionSelectLabel.text(currentVal);
              } else {
                this.value(opt.options[0]);
              }
            }
          } else {
            if (this.optionMenu) {
              this.optionMenu.remove();
              this.optionMenu = null;
            }
            if (this.optionSelectTrigger) {
              this.optionSelectTrigger.hide();
            }
            if (opt.hasValue === false) {
              this.oldValue = this.element.val();
              this.element.val("");
              this.elementDiv.hide();
            } else {
              if (this.oldValue !== undefined) {
                this.element.val(this.oldValue);
                delete this.oldValue;
              }
              this.elementDiv.show();
            }
            this.element.trigger('change', this.propertyType, this.value());
          }
          if (image) {
            image.onload = function() {
              that._resize();
            }
            image.onerror = function() {
              that._resize();
            }
          } else {
            this._resize();
          }
        }
      }
    },
    validate: function() {
      var result;
      var value = this.value();
      var type = this.type();
      if (this.typeMap[type] && this.typeMap[type].validate) {
        var val = this.typeMap[type].validate;
        if (typeof val === 'function') {
          result = val(value);
        } else {
          result = val.test(value);
        }
      } else {
        result = true;
      }
      if (result) {
        this.uiSelect.removeClass('input-error');
      } else {
        this.uiSelect.addClass('input-error');
      }
      return result;
    },
    show: function() {
      this.uiSelect.show();
      this._resize();
    },
    hide: function() {
      this.uiSelect.hide();
    }
  });
})(jQuery);


RED.tabs = (function() {

  function createTabs(options) {
    var tabs = {};
    var currentTabWidth;
    var currentActiveTabWidth = 0;

    var ul = $("#" + options.id);
    ul.addClass("red-ui-tabs");
    ul.children().first().addClass("active");
    ul.children().addClass("red-ui-tab");

    function onTabClick() {
      activateTab($(this));
      return false;
    }

    function onTabDblClick() {
      if (options.ondblclick) {
        options.ondblclick(tabs[$(this).attr('xid').slice(1)]);
      }
      return false;
    }

    function activateTab(link) {
      if (typeof link === "string") {
        link = ul.find("a[xid='#" + link + "']");
      }
      if (!link.parent().hasClass("active")) {
        ul.children().removeClass("active");
        ul.children().css({
          "transition": "width 100ms"
        });
        link.parent().addClass("active");
        if (options.onchange) {
          options.onchange(tabs[link.attr('xid').slice(1)]);
        }
        updateTabWidths();
        setTimeout(function() {
          ul.children().css({
            "transition": ""
          });
        }, 100);
      }
    }

    function updateTabWidths() {
      var tabs = ul.find("li.red-ui-tab");
      var width = ul.width();
      var tabCount = tabs.size();
      var tabWidth = (width - 12 - (tabCount * 6)) / tabCount;
      currentTabWidth = 100 * tabWidth / width;
      currentActiveTabWidth = currentTabWidth + "%";

      if (options.hasOwnProperty("minimumActiveTabWidth")) {
        if (tabWidth < options.minimumActiveTabWidth) {
          tabCount -= 1;
          tabWidth = (width - 12 - options.minimumActiveTabWidth - (tabCount * 6)) / tabCount;
          currentTabWidth = 100 * tabWidth / width;
          currentActiveTabWidth = options.minimumActiveTabWidth + "px";
        } else {
          currentActiveTabWidth = 0;
        }
      }
      tabs.css({
        width: (currentTabWidth * 0.8) + "%"
      });
      if (tabWidth < 50) {
        ul.find(".red-ui-tab-close").hide();
        ul.find(".red-ui-tab-icon").hide();
        ul.find(".red-ui-tab-label").css({
          paddingLeft: Math.min(12, Math.max(0, tabWidth - 38)) + "px"
        })
      } else {
        ul.find(".red-ui-tab-close").show();
        ul.find(".red-ui-tab-icon").show();
        ul.find(".red-ui-tab-label").css({
          paddingLeft: ""
        })
      }
      if (currentActiveTabWidth !== 0) {
        ul.find("li.red-ui-tab.active").css({
          "width": options.minimumActiveTabWidth
        });
        ul.find("li.red-ui-tab.active .red-ui-tab-close").show();
        ul.find("li.red-ui-tab.active .red-ui-tab-icon").show();
        ul.find("li.red-ui-tab.active .red-ui-tab-label").css({
          paddingLeft: ""
        })
      }

    }

    ul.find("li.red-ui-tab a").on("click", onTabClick).on("dblclick", onTabDblClick);
    updateTabWidths();


    function removeTab(id) {
      var li = ul.find("a[xid='#" + id + "']").parent();
      if (li.hasClass("active")) {
        var tab = li.prev();
        if (tab.size() === 0) {
          tab = li.next();
        }
        activateTab(tab.find("a"));
      }
      li.remove();
      if (options.onremove) {
        options.onremove(tabs[id]);
      }
      delete tabs[id];
      updateTabWidths();
    }

    return {
      addTab: function(tab) {
        tabs[tab.id] = tab;
        var li = $("<li/>", {
          class: "red-ui-tab"
        }).appendTo(ul);
        li.data("tabId", tab.id);
        var link = $("<a/>", {
          xid: "#" + tab.id,
          class: "red-ui-tab-label"
        }).appendTo(li);
        if (tab.icon) {
          $('<img src="' + tab.icon + '" class="red-ui-tab-icon"/>').appendTo(link);
        }
        $('<span/>').text(tab.label).appendTo(link);

        link.on("click", onTabClick);
        link.on("dblclick", onTabDblClick);
        if (tab.closeable) {
          var closeLink = $("<a/>", {
            xid: "#",
            class: "red-ui-tab-close"
          }).appendTo(li);
          closeLink.append('<i class="fa fa-times" />');

          closeLink.on("click", function(event) {
            removeTab(tab.id);
          });
        }
        updateTabWidths();
        if (options.onadd) {
          options.onadd(tab);
        }
        link.attr("title", tab.label);
        if (ul.find("li.red-ui-tab").size() == 1) {
          activateTab(link);
        }
        if (options.onreorder) {
          var originalTabOrder;
          var tabDragIndex;
          var tabElements = [];
          var startDragIndex;

          li.draggable({
            axis: "x",
            distance: 20,
            start: function(event, ui) {
              originalTabOrder = [];
              tabElements = [];
              ul.children().each(function(i) {
                tabElements[i] = {
                  el: $(this),
                  text: $(this).text(),
                  left: $(this).position().left,
                  width: $(this).width()
                };
                if ($(this).is(li)) {
                  tabDragIndex = i;
                  startDragIndex = i;
                }
                originalTabOrder.push($(this).data("tabId"));
              });
              ul.children().each(function(i) {
                if (i !== tabDragIndex) {
                  $(this).css({
                    position: 'absolute',
                    left: tabElements[i].left + "px",
                    width: tabElements[i].width + 2,
                    transition: "left 0.3s"
                  });
                }

              })
              if (!li.hasClass('active')) {
                li.css({
                  'zIndex': 1
                });
              }
            },
            drag: function(event, ui) {
              ui.position.left += tabElements[tabDragIndex].left;
              var tabCenter = ui.position.left + tabElements[tabDragIndex].width / 2;
              for (var i = 0; i < tabElements.length; i++) {
                if (i === tabDragIndex) {
                  continue;
                }
                if (tabCenter > tabElements[i].left && tabCenter < tabElements[i].left + tabElements[i].width) {
                  if (i < tabDragIndex) {
                    tabElements[i].left += tabElements[tabDragIndex].width + 8;
                    tabElements[tabDragIndex].el.detach().insertBefore(tabElements[i].el);
                  } else {
                    tabElements[i].left -= tabElements[tabDragIndex].width + 8;
                    tabElements[tabDragIndex].el.detach().insertAfter(tabElements[i].el);
                  }
                  tabElements[i].el.css({
                    left: tabElements[i].left + "px"
                  });

                  tabElements.splice(i, 0, tabElements.splice(tabDragIndex, 1)[0]);

                  tabDragIndex = i;
                  break;
                }
              }

              // console.log(ui.position.left,ui.offset.left);
            },
            stop: function(event, ui) {
              ul.children().css({
                position: "relative",
                left: "",
                transition: ""
              });
              if (!li.hasClass('active')) {
                li.css({
                  zIndex: ""
                });
              }
              updateTabWidths();
              if (startDragIndex !== tabDragIndex) {
                options.onreorder(originalTabOrder, $.makeArray(ul.children().map(function() {
                  return $(this).data('tabId');
                })));
              }
              activateTab(tabElements[tabDragIndex].el.data('tabId'));
            }
          })
        }
      },
      removeTab: removeTab,
      activateTab: activateTab,
      resize: updateTabWidths,
      count: function() {
        return ul.find("li.red-ui-tab").size();
      },
      contains: function(id) {
        return ul.find("a[xid='#" + id + "']").length > 0;
      },
      renameTab: function(id, label) {
        tabs[id].label = label;
        var tab = ul.find("a[xid='#" + id + "']");
        tab.attr("title", label);
        tab.find("span").text(label);
        updateTabWidths();
      },
      order: function(order) {
        var existingTabOrder = $.makeArray(ul.children().map(function() {
          return $(this).data('tabId');
        }));
        if (existingTabOrder.length !== order.length) {
          return
        }
        var i;
        var match = true;
        for (i = 0; i < order.length; i++) {
          if (order[i] !== existingTabOrder[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          return;
        }
        var existingTabMap = {};
        var existingTabs = ul.children().detach().each(function() {
          existingTabMap[$(this).data("tabId")] = $(this);
        });
        for (i = 0; i < order.length; i++) {
          existingTabMap[order[i]].appendTo(ul);
        }
      }

    }
  }

  return {
    create: createTabs
  }
})();


RED._ = function(msg, option) {
  if (_.isObject(option)) {
    option = _.defaults(option, i18n_options);
  } else {
    option = i18n_options;
  }
  return i18n.t(msg, option);
};


addJqueryFunct();

function addJqueryFunct() {
  var t = RED._;
  var o = i18n.options;

  function parse(ele, key, options) {
    if (key.length === 0) return;

    var attr = 'text';

    if (key.indexOf('[') === 0) {
      var parts = key.split(']');
      key = parts[1];
      attr = parts[0].substr(1, parts[0].length - 1);
    }

    if (key.indexOf(';') === key.length - 1) {
      key = key.substr(0, key.length - 2);
    }

    var optionsToUse;
    if (attr === 'html') {
      optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.html() }, options) : options;
      ele.html(t(key, optionsToUse));
    } else if (attr === 'text') {
      optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.text() }, options) : options;
      ele.text(t(key, optionsToUse));
    } else if (attr === 'prepend') {
      optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.html() }, options) : options;
      ele.prepend(t(key, optionsToUse));
    } else if (attr === 'append') {
      optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.html() }, options) : options;
      ele.append(t(key, optionsToUse));
    } else if (attr.indexOf("data-") === 0) {
      var dataAttr = attr.substr(("data-").length);
      optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.data(dataAttr) }, options) : options;
      var translated = t(key, optionsToUse);
      //we change into the data cache
      ele.data(dataAttr, translated);
      //we change into the dom
      ele.attr(attr, translated);
    } else {
      optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.attr(attr) }, options) : options;
      ele.attr(attr, t(key, optionsToUse));
    }
  }

  function localize(ele, options) {
    var key = ele.attr(o.selectorAttr);
    if (!key && typeof key !== 'undefined' && key !== false) key = ele.text() || ele.val();
    if (!key) return;

    var target = ele,
      targetSelector = ele.data("i18n-target");
    if (targetSelector) {
      target = ele.find(targetSelector) || ele;
    }

    if (!options && o.useDataAttrOptions === true) {
      options = ele.data("i18n-options");
    }
    options = options || {};

    if (key.indexOf(';') >= 0) {
      var keys = key.split(';');

      $.each(keys, function(m, k) {
        if (k !== '') parse(target, k, options);
      });

    } else {
      parse(target, key, options);
    }

    if (o.useDataAttrOptions === true) ele.data("i18n-options", options);
  }

  // fn
  $.fn.i18n = function(options) {
    return this.each(function() {
      // localize element itself
      localize($(this), options);

      // localize childs
      var elements = $(this).find('[' + o.selectorAttr + ']');
      elements.each(function() {
        localize($(this), options);
      });
    });
  };
}

RED.i18n_form = function(ele, type) {
  var ns = nodeNamespace[type] || "node-red";
  ele.find('[data-i18n]').each(function() {
    var current = $(this).attr("data-i18n");
    var keys = current.split(";");
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.indexOf(":") === -1) {
        var prefix = "";
        if (key.indexOf("[") === 0) {
          var parts = key.split("]");
          prefix = parts[0] + "]";
          key = parts[1];
        }
        keys[i] = prefix + ns + ":" + key;
      }
    }
    $(this).attr("data-i18n", keys.join(";"));
  });
}


$(function() {
  $hope.app.server.get_nodered_assets$().then(assets => {
    nodeNamespace = assets.ns;
    $("body").append(assets.nodes);

    _.forEach(assets.locales, (v, k) => {
      i18n.addResourceBundle("en-US", k, v);
    });
    //$("body").i18n();
  });
});

module.exports = RED;
