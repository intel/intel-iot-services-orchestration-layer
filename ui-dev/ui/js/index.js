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
// NOTE: other than external libs like router and react
// inside this index.js, we use require instead of import
// This is because we need to strictly control the loading order because 
// a lot of internal modules can ONLY be loaded after major body of this index.js
// has been executed, e.g. global.$hope etc. has been set
// So if use import, these modules would be loaded first and causing error
import React from "react";
import ReactDOM from "react-dom";

global._ = require("lodash");
global.React = React;
global.ReactDOM = ReactDOM;

// promise of JQuery (i.e. $) is very hard to use, we'd like to wrap it to Q
global.$Q = require("q");

global.__ = require("./i18n");

// We use this to add bind helpers
// And most of the components in this app should inheirt from this
// class (if they are using ES6 syntax)
class ReactComponent extends React.Component {

  constructor() {
    super();
    this.hope_auto_bind();
  }


  hope_bind(...methods) {
    methods.forEach( method => this[method] = this[method].bind(this) );
  }

  // auto bind all functions starts with "_on_"
  hope_auto_bind(is_log) {
    // As functions defined in class are non-enumberable
    // so we have to use getOwnPropertyNames (returns those non-enumberable too)
    // and walk through the prototype chain by ourselves
    var props = [];
    var obj = this;
    while (obj) {
      Object.getOwnPropertyNames(obj).forEach(prop => {   // eslint-disable-line
        if (_.startsWith(prop, "_on_")) {
          props.push(prop);
        }
      });
      obj = Object.getPrototypeOf(obj);
    }
    _.each(_.uniq(props), prop => {
      if (_.isFunction(this[prop])) {
        this[prop] = this[prop].bind(this);
        if (is_log) {
          $hope.log("autobind", prop, "of", this.constructor.name);
        }
      }
    });
  }
}

global.ReactComponent = ReactComponent;


global.$hope = (function() {
  var ret = {};

  //////////////////////////////////////////////////////////////////
  // Log
  //////////////////////////////////////////////////////////////////

  var _log_count = 1;

  function _log(category, style, args) {
    if (!_.isArray(args)) {
      args = _.toArray(args);
    }
    // people might forget to provide category as the 1st parameter
    if (!_.isString(category)) {
      args.unshift(category);
      category = "UNKNOWN";
    }
    args.unshift(style);
    args.unshift("color: #f0f");
    var c = " " + _log_count++;
    while (c.length < 5) {
      c = " " + c;
    }
    args.unshift("%c" + c + " %c [[ " + category + " ]] ");
    console.log.apply(console, args);
  }

  ret.log = function(category, ...args) {
    // only surpress normal logs
    if (!$hope.config.log.categories["*"] && !$hope.config.log.categories[category]) {
      return;
    }
    _log(category, "background: #222; color: #bada55", args);
  };

  ret.log.warn = function(category, ...args) {
    _log(category, "background: #222; color: #f55", args);
  };

  ret.log.error = function(category, ...args) {
    _log(category, "background: #f22; color: #fde", args);
  };

  //////////////////////////////////////////////////////////////////
  // Helpers
  //////////////////////////////////////////////////////////////////
  ret.timestamp = function() {
    return new Date().getTime();
  };

  var _uuid = require("uuid");
  ret.uniqueId = function(prefix) {
    prefix = prefix || "";
    return prefix + _uuid.v1();
  };

  //////////////////////////////////////////////////////////////////
  // Type
  //////////////////////////////////////////////////////////////////

  ret.inherits = require("inherits");

  
  // factory method
  // create_object(F, arg1, arg2)  equals to new F(arg1, arg2)
  ret.create_object = function(ctor, ...args) {
    var o = Object.create(ctor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    ctor.apply(o, args);    
    return o;
  };
  
  // e.g. x = [{id: 1, value: 2}, {id: 2, value: 3}] ==>
  // {1: {id: 1, value: 2}, 2: {id: 2, value 3}}
  // by invoking array_to_hash(x, "id")
  // verify_f is a function to further verify each object
  // 
  // only give warnings for illegal objects unless error_instead_of_warn is true
  ret.array_to_hash = function(array, key_name, verify_f, error_instead_of_warn) {
    array = array || [];
    var _check = error_instead_of_warn ? ret.check : ret.check_warn;
    _check(_.isArray(array), "array_to_hash", "Not an array");
    var r = {};
    _.forOwn(array, o => {
      var k = o[key_name];
      if (!_check(_.isObject(o) && !_.isUndefined(k), "array_to_hash",
        "item isn't an object or no key with name: ", key_name, o)) {
        return;
      }
      _check(!r[k], "array_to_hash", "Duplicated id", o, array);
      if (_.isFunction(verify_f)) {
        _check(verify_f(o), "array_to_hash", "Failed to verify for", o);
      }
      r[k] = o;
    });

    return r;
  };


  // the first level objects to array
  ret.hash_to_array = function(hash) {
    var a = [];
    _.forOwn(hash, o => {
      a.push(o);
    });
    return a;
  };

  function to_short_string(x) {
    return x.toString();
  }

  function to_string(x, depth, cur_depth, indent) {
    if (_.isUndefined(x) || _.isNull(x)) {
      return to_short_string(x);
    }

    if (_.isString(x)) {
      return "\"" + x + "\"";
    }

    // cannot use instanceof because this would be false if it is TypeError etc.
    if (_.isDate(x) || _.isFunction(x)) {
      return to_short_string(x);
    }


    depth = depth || 3;
    if (depth < 0) {
      depth = 3;
    }
    cur_depth = cur_depth || 0;
    // indent is only used when there is a need to add a new line
    if (_.isUndefined(indent)) {
      indent = "";
    }

    var lines = [], i;
    if (_.isArray(x)) {
      if (cur_depth >= depth) {
        return to_short_string(x);
      }
      for (i = 0; i < x.length; i++) {
        lines.push(to_string(x[i], depth, cur_depth + 1, indent));
      }
      return "[" + lines.join(",") + "]";
    }


    if (_.isObject(x)) {
      if (cur_depth >= depth) {
        return to_short_string(x);
      }
      var new_indent = indent + "  ";   // indent 2 spaces
      var keys = _.keys(x);
      if (keys.length === 0) {
        return "{}";
      }
      for (i = 0; i < keys.length; i++) {
        var k = keys[i];
        lines.push(indent + '  ' + k + ': ' + to_string(x[k], depth, 
          cur_depth + 1, new_indent));
      }
      return "{\n" + lines.join(",\n") + "\n" + indent + "}";
    }
    return x.toString();
  }

  ret.to_string = to_string;

  ret.error_to_string = function(err) {
    if (_.isString(err)) {
      return err;
    }
    if (_.isObject(err) && err.message) {
      return err.message.toString();
    }
    if (_.isObject(err) && err.error) {
      return err.error.toString();
    }
    return err.toString();
  };

  function _serialize_an_item(item, not_invoke_serialize_func, excluded_fields) {
    excluded_fields = excluded_fields || [];
    if (_.isFunction(item)) {
      return;
    }

    if (!_.isObject(item)) {
      return item;
    }

    var _ret, x;
    if (_.isArray(item)) {
      _ret = [];
      _.forOwn(item, v => {
        x = _serialize_an_item(v);
        if (x) {
          _ret.push(x);
        }
      });
      return _ret;
    }

    if (_.isObject(item)) {
      if (_.isFunction(item.$serialize) && !not_invoke_serialize_func) {
        return item.$serialize();
      } else {
        _ret = {};
        _.forOwn(item, (v, k) => {
          if (k[0] === "$") {   // don't store these fields start with $
            return;
          }
          if (_.includes(excluded_fields, k)) {
            return;
          }
          x = _serialize_an_item(v);
          if (!_.isUndefined(x)) {
            _ret[k] = x;
          }
        });
        return _ret;
      }
    }
  }

  ret.serialize = _serialize_an_item;


  //////////////////////////////////////////////////////////////////
  // Execution
  //////////////////////////////////////////////////////////////////

  // log error and throw exception
  ret.check = function(condition, ...args) {
    if (!condition) {
      ret.log.error(...args);
      throw new Error(args.join(" "));
    }
    return condition;
  };

  // log warn only
  ret.check_warn = function(condition, ...args) {
    if (!condition) {
      ret.log.warn(...args);
    }
    return condition;
  };


  // auto capture the exception
  ret.safe_exec = function(f, ...args) {
    try {
      f.apply({}, args);
    } catch (e) {
      ret.log.warn("EXCEPTION in EXEC/no_ex", e);
    }
  };

  //////////////////////////////////////////////////////////////////
  // FLUX
  // We assume entire system has one centeral places for Dispatch and for 
  // registration of Actions
  //////////////////////////////////////////////////////////////////

  var _Dispatcher = require("./lib/dispatcher");
  var _Actions = require("./actions/action");
  var _dispatcher = new _Dispatcher();
  var _actions = new _Actions(_dispatcher);

  // it returns an object that contains a $promise
  // so one may use $hope.trigger_action(....).$promise.done(...).fail(...)
  ret.trigger_action = function(action_type, action_params) {
    return _actions.act(action_type, action_params);
  };

  // either register_action(action_type, f)
  // or register_action({
  //  action_type1: f1,
  //  action_type2: f2 ...
  // })
  // The f could be null, then system would offer a default one by simply
  // dispatching event
  // or user provide his/her own customization with a f(dispatcher, params)
  ret.register_action = function() {
    if (arguments.length === 2) {
      _actions.register(arguments[0], arguments[1]);
    } else {
      ret.check(arguments.length === 1 && _.isObject(arguments[0]),
        "Action", "Wrong inputs for $hope.register_action", arguments);
      _actions.register_map(arguments[0]);
    }
  };

  // input is similaras register_action, either for one action (with two params)
  // or register a bunch
  // For one action, it might have multiple handlers
  // The handler is f(params) 
  ret.register_action_handler = function() {
    if (arguments.length === 2) {
      _dispatcher.register_action_handler(arguments[0], arguments[1]);
    } else {
      ret.check(arguments.length === 1 && _.isObject(arguments[0]),
        "Action", "Wrong inputs for $hope.register_action_handler", arguments);
      _dispatcher.register_action_handler_map(arguments[0]);
    }
  };

  //////////////////////////////////////////////////////////////////
  // Theme
  //////////////////////////////////////////////////////////////////
  // type: color (by default), bk, fill, stroke
  // addons: on, off, hover
  // Examples:
  //  color()     -> ""
  //  color(1)    -> color-1
  //  color(1, "color", "on")  -> color-1-on
  //  color(1, "bk", "hover")  -> color-1-with-hover
  var _total_colors = 9;
  ret.color = function(color_id, type, addons) {
    if (!_.isNumber(color_id)) {
      return "";
    }
    color_id = color_id % _total_colors;
    if (color_id === 0) {     // index starts from 1 instead of 0
      color_id = _total_colors;
    }
    addons = addons || "";
    if (addons === "on" || addons === "off") {
      addons = "-" + addons;
    } else if (addons !== "") {
      addons = "-with-" + addons;
    }
    type = type || "color";
    if (type !== "color") {
      type = type + "-color";
    }
    return " " + type + "-" + color_id + addons;
  };

  //////////////////////////////////////////////////////////////////
  // UI Helpers
  //////////////////////////////////////////////////////////////////
  // level could be "success", "info", "warning", "error"
  ret.notify = function(level, ...args) {
    $hope.check(_.includes(["success", "info", "warning", "error"], level),
     "notify", "Unknown level of notification:", level);
    args = args || [""];
    args = args.join(" ");
    $hope.trigger_action("hope/notify", {
      level: level,
      message: args
    });
  };

  // wrappers over sweetalert
  ret.message_box = function(...args) {
    swal(...args);    // eslint-disable-line
  };

  // Use swal to replace alert, confirm and prompt
  // type could be "success", "error", "info", "warning"
  ret.alert = function(title, text, type) {
    $hope.message_box(title, text, type);      // eslint-disable-line
  };

  ret.confirm = function(title, text, type, callback, extra) {
    var opts = {
      title: title,
      text: text,
      type: type,
      showCancelButton: true,
      closeOnConfirm: true
    };
    if (!_.isFunction(callback)) {
      callback = () => {};
    }
    if (_.isObject(extra)) {
      opts = _.merge(opts, extra);
    }
    $hope.message_box(opts, callback);
  };

  ret.prompt = function(title, text, placeholder, callback) {
    if (!_.isFunction(callback)) {
      callback = () => {};
    }
    $hope.message_box({
      title: title,
      text: text,
      type: "input",
      showCancelButton: true,
      closeOnConfirm: true,
      inputPlaceholder: placeholder
    }, callback);
  };

  //////////////////////////////////////////////////////////////////
  // Socket
  //////////////////////////////////////////////////////////////////
  var all_sockets = {};

  function SocketListener(url_path, event, cb) {
    this.url_path = url_path;
    this.event = event;
    this.cb = function() {
      $hope.log("socket", url_path, event, "with data", _.toArray(arguments));      
      cb.apply({}, arguments);
    };
    this.on_error = (e)=> {
      console.log(url_path, event, "[ERROR]", e);
    };
    var socket = all_sockets[url_path];
    if (!socket) {
      socket = all_sockets[url_path] = {
        e: io(window.location.origin + url_path),
        refs: 0
      };
      socket.e.on("error", this.on_error);
    }
    socket.e.on(event, this.cb);
    socket.refs++;
  }

  SocketListener.prototype.dispose = function() {
    var socket = all_sockets[this.url_path];
    if (!socket) {
      return;
    }
    socket.e.removeListener(this.event, this.cb);
    socket.refs--;
    if (socket.refs === 0) {
      socket.e.destroy();
      delete all_sockets[this.url_path];
    }
  };


  ret.listen_system = function(event, cb) {
    return new SocketListener("/__HOPE__SYSTEM__", event, cb);
  }; 

  ret.listen_app = function(app_id, event, cb) {
    return new SocketListener("/__HOPE__APP__" + app_id, event, cb);
  }; 

  ret.listen_graph = function(graph_id, event, cb) {
    return new SocketListener("/__HOPE__GRAPH__" + graph_id, event, cb);
  };

  
  //////////////////////////////////////////////////////////////////
  // Done
  //////////////////////////////////////////////////////////////////
  
  return ret;

})();


//////////////////////////////////////////////////////////////////
// Options for various UI libs
//////////////////////////////////////////////////////////////////

swal.setDefaults({  // eslint-disable-line
  allowEscapeKey:     true,
  allowOutsideClick:  false
});

toastr.options = {  // eslint-disable-line
  closeButton:      false,
  debug:            false,
  newestOnTop:      true,
  progressBar:      false,
  positionClass:    "toast-top-center",
  preventDuplicates: false,
  onclick:          null,
  showDuration:     300,
  hideDuration:     1000,
  timeOut:          3000,
  extendedTimeOut:  1000,
  showEasing:       "swing",
  hideEasing:       "linear",
  showMethod:       "fadeIn",
  hideMethod:       "fadeOut"
};


//////////////////////////////////////////////////////////////////
// Bootstrap
//////////////////////////////////////////////////////////////////


// global config
$hope.config = require("./config");

// TODO may reorg it to another place
$hope.dummy_widget_data_generator = require("./samples/dummy_widget_data_generator");

// setup the graph ide 
$hope.app = {
  server:         require("./lib/backend"),
  stores: {
    notification: require("./stores/notification_store"),
    ide:          require("./stores/ide_store"),
    ui_ide:       require("./stores/ui_ide_store"),
    ui:           require("./stores/ui_store"),
    graph:        require("./stores/graph_store"),
    spec:         require("./stores/spec_store"),
    hub:          require("./stores/hub_store"),
    library:      require("./stores/library_store"),
    app:          require("./stores/app_store"),
    composer:     require("./stores/composer_store")
  }
};

// register all Actions
require("./actions/hope_action");
require("./actions/app_action");
require("./actions/graph_action");
require("./actions/ide_action");
require("./actions/ui_ide_action");
require("./actions/ui_action");
require("./actions/spec_action");
require("./actions/hub_action");
require("./actions/library_action");
require("./actions/composer_action");


$hope.app.server.get_config$().then(cfg => {
  $hope.ui_dev_port = cfg.ui_dev_port;
  $hope.ui_user_port = cfg.ui_user_port;
  $hope.ui_auth_required = cfg.ui_auth_required;

  // Render with initial state
  ReactDOM.render(require("./components/route.x"), document.getElementById("react-world"));
});


// Initial Data loading
$Q.all([
  $hope.app.stores.spec.init$(),
  $hope.app.stores.hub.init$()
]).then(function() {
  $hope.listen_system("entity/changed", changed => {
    $hope.app.stores.spec.handle_change_event$(changed.list).then( () => {
      $hope.app.stores.hub.handle_change_event$(changed.list);
    }).done();
  });

  $hope.listen_system("wfe/changed", ev => {
    $hope.app.stores.graph.handle_changed_event(ev.started, ev.stoped);
    $hope.app.stores.app.handle_changed_event(ev.started, ev.stoped);
  });
});


