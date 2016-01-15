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

//////////////////////////////////////////////////////////////////
// As spec selection (e.g. in sidebar etc.) is a complicated process, e.g.
// expand some hubs in hub_view, or in selection etc.
// 
// We hope to:
// * Every time to render a view for all specs (for selection), it maintains
//   the previous state. e.g. If a hub is expanded last time, keep it 
//   expanded.
// * If multiple view is presented, they MIGHT need to have the same state,
//   e.g. the same hub is expaneded automatically in two hub_views.
//   (depends on impl., they may expanded together, or not)
//   
// So we need a store to persist (instead of holding state inside the element)
// the states.
//////////////////////////////////////////////////////////////////


import {EventEmitter} from "events";

//////////////////////////////////////////////////////////////////
// View - Abstract class to persist styles of a Tree
// 
// It assumes that there is a data provider (i.e. subclass to impl. _get_data())
// which could generate the real model data that needs to show 
// in the following structure
// 
// NOTE that the top level is root and real data comes from its children
// 
// { 
//    name: ...,
//    description: ...
//    children: {
//      first_level_id: {
//      name: ...          // this would be shown
//      description: ...   // hint
//      obj: ...           // the associated obj
//      children: {
//        second_level_id: {
//        ...             // same structure as above
//      }
//    }
//   }
// }
//   
// Inside the View, there is a persist hashtable to store stylish data,
// e.g. expanded etc. The key of the hastable is a string by concatting
// the ids, e.g. first_level_id, sencond_level_id
// 
// The view has a get_render_data() to generate data for rendering. It 
// basically return the data showed above, but in each item inside it, it will
//  * add a styles object
//   
//////////////////////////////////////////////////////////////////


var __magic__ = "__^_^__";

function _dfs(key, id, data, parent, f) {
  var new_key = "";
  if (parent) {     // not the root
   new_key = key + __magic__;
  } 
  _.forOwn(data.children, (v, k) => {
    _dfs(new_key + k, k, v, data, f);
  });
  f(key, id, data, parent);
}

class View {
  constructor(type) {
    this.type = type;
    this._data = {};
    this.default_expanded = true;
    this.search_string = "";
    this.render_data_for_search = {};
  }

  _get_data() {
    $hope.check(false, "Library/View", 
      "This function should be implemented by subclass!");
  }

  _get_with_key(k) {
    if (_.isUndefined(this._data[k])) {
      this._data[k] = {
        expanded: this.default_expanded
      };
    }
    return this._data[k];
  }

  // This generates the id from input arguments
  _get() {
    var args = _.toArray(arguments);
    // we should remove all of the tailing undefined
    while (args.length > 0 && _.isUndefined(args[args.length - 1])) {
      args.pop();
    }
    return this._get_with_key(args.join(__magic__));
  }

  // Deep First iterate the data in format of _get_data() 
  // the callback f(key, id, obj, parent_obj)
  //   key could be used to get the stylish data from View by _get_with_key
  //   id is first_level_id, or second_level_id, ...
  //   obj is the object for that id in the data returned from _get_data()
  //   parent_obj.children[id] equals to obj
  _dfs(data, f) {
    _dfs("", null, data, null, f);
  }

  set_default_expand(b) {
    this.default_expanded = b;
  }

  expand() {
    this._get.apply(this, arguments).expanded = true;
  }

  collapse() {
    this._get.apply(this, arguments).expanded = false;
  }

  expand_all() {
    this._dfs(this._get_data(), key => {
      this._get_with_key(key).expanded = true;
    });  
  }

  collapse_all() {
    this._dfs(this._get_data(), key => {
      this._get_with_key(key).expanded = false;
    });  
  }

  search(search) {
    search = search.toLowerCase();
    if (!_.isString(search) || search.length === 0) { // clear search
      this.search_string = "";
      this.render_data_for_search = {};
    } else {  // do search
      if (this.search_string.length === 0 || 
          search.indexOf(this.search_string) < 0) { 
        this.render_data_for_search = this._get_data();
      }
      this.search_string = search;
      this._dfs(this.render_data_for_search, (key, id, obj, parent) => {
        if (!obj.children) {  // leaf
          if (obj.name.toLowerCase().indexOf(search) < 0 &&
            parent && parent.name.toLowerCase().indexOf(search) < 0) {
            delete parent.children[id];
          }       
        } else {
          obj.styles = _.cloneDeep(this._get_with_key(key));
          obj.styles.expanded = true;
          if (parent && _.isEmpty(obj.children)) {
            delete parent.children[id];
          }
        }
      });
    }
  }


  get_render_data() {
    if (this.search_string.length > 0) {
      return this.render_data_for_search;
    } 
    var data = this._get_data();
    this._dfs(data, (key, id, obj) => {
      obj.styles = this._get_with_key(key);
    });
    return data;
  }

}


//////////////////////////////////////////////////////////////////
// HubView
//////////////////////////////////////////////////////////////////

class HubView extends View {
  constructor() {
    super("HubView");
  }

  _get_data() {
    var data = {children: {}}, hub, thing;
    _.forOwn($hope.app.stores.hub.get_all_hubs(), d => {
      hub = data.children[d.id] = {
        name: d.name,
        description: d.description,
        obj: d,
        children: {}
      };
      _.forOwn(d.things, t => {
        thing = hub.children[t.id] = {
          name: t.name,
          description: t.description,
          obj: t,
          children: {}
        };
        _.forOwn(t.services, s => {
          thing.children[s.id] = {
            name: s.$name(),
            description: s.description,
            obj: s
          };
        });
      });
    });
    return data;
  }
}

//////////////////////////////////////////////////////////////////
// SpecView
//////////////////////////////////////////////////////////////////

class SpecView extends View {
  // view_type is SpecView or WidgetView 
  constructor(is_ui) {
    var type = is_ui ? "WidgetSpecView" : "SpecView";
    super(type);
    this.is_ui = is_ui;
  }

  _get_data() {
    var data = {children: {}}, bundle, catalog;

    _.forOwn($hope.app.stores.spec.manager.bundles, b => {
      // don't show UI specs
      if ((b.is_ui && !this.is_ui) || (!b.is_ui && this.is_ui)) {
        return;
      }
      bundle = data.children[b.id] = {
        name: b.name,
        description: b.description,
        obj: b,
        children: {}
      };
      _.forOwn(b.$catalogs, (c, c_name) => {
        catalog = bundle.children[c_name] = {
          name: c_name,
          obj: c,
          children: {}
        };
        _.forOwn(c, s => {
          catalog.children[s.id] = {
            name: s.name,
            description: s.description,
            obj: s
          };
        });
      });
    }, this);
    return data;
  };
}


//////////////////////////////////////////////////////////////////
// WidgetView 
//////////////////////////////////////////////////////////////////

class WidgetView extends View {
  // view_type is SpecView or WidgetView 
  constructor() {
    super("WidgetView");
  }

  _get_widgets_of_current_app() {
    var graph = $hope.app.stores.graph.active_view;
    var widgets;
    if (graph) {
      var app  = graph.get_app();
      if (app) {
        widgets = $hope.app.stores.ui.get_widgets_of_app(app.id);
      }
    }
    return widgets;
  }

  _get_data() {
    var widgets = this._get_widgets_of_current_app();
    var data = {children: {}}, bundle, catalog;

    if (widgets) {
      _.forOwn($hope.app.stores.spec.manager.bundles, b => {
        // only show UI specs
        if (!b.is_ui) {
          return;
        }
        bundle = null;
        _.forOwn(b.$catalogs, (c, c_name) => {
          catalog = null;
          _.forOwn(c, s => {
            var instances = _.filter(widgets, "spec", s.id);
            if (!instances || instances.length === 0) {
              return;
            }
            if (!catalog) {
              if (!bundle) {
                bundle = data.children[b.id] = {
                  name: b.name,
                  description: b.description,
                  obj: b,
                  children: {}
                };
              }
              catalog = bundle.children[c_name] = {
                name: c_name,
                obj: c,
                children: {}
              };
            }
            _.forOwn(instances, instance => {
              catalog.children[instance.id] = {
                name: instance.name,
                description: s.description,
                obj: s,
                instance: instance
              };
            });
          });
        });
      });
    }
    return data;
  };
}


//////////////////////////////////////////////////////////////////
// The Store
// The store holds the views
// Each view should have these interface implemented
//  search(a_string)
//  expand_all(...)
//  collapse_all(...)
// And normally, it would has get_render_data to generate data for component
//////////////////////////////////////////////////////////////////


class LibraryStore extends EventEmitter {

  constructor() {
    super();

    this.hub_view = new HubView();
    this.spec_view = new SpecView();
    // This only shown on the ui_ide
    this.widget_spec_view = new SpecView(true);
    this.widget_view = new WidgetView();

    this.current_view = this.hub_view;

    this.search_string = "";

    $hope.register_action_handler({
        "library/switch/view":     this.switch_view.bind(this),
        "library/expand_all":      this.expand_all.bind(this),
        "library/collapse_all":    this.collapse_all.bind(this),
        "library/search":    this.search.bind(this),
        "library/search_widget_spec":    this.search_widget_spec.bind(this)
    });

  }


  is_in_search() {
    return _.isString(this.search_string) && this.search_string.length > 0;
  }


  switch_view(data) {
    var old = this.current_view;
    switch (data.view) {
      case "hub":
        this.current_view = this.hub_view;
        break;
      case "widget":
        this.current_view = this.widget_view;
        break;
      case "spec":
        this.current_view = this.spec_view;
        break;
      default:
        $hope.check(false, "LibraryStore", "Unrecognized view type:", data.view);
    }
    if (old !== this.current_view) {
      this.current_view.search(this.search_string);
      this.emit("library", {event: "switched"});
    }
  }

  expand_all() {
    this.current_view.expand_all();
    this.emit("library", {event: "all_expanded"});
  }

  collapse_all() {
    this.current_view.collapse_all();
    this.emit("library", {event: "all_collapsed"});
  }


  search(data) {
    this.search_string = data.search.toLowerCase();
    this.current_view.search(this.search_string);
    this.emit("library", {event: "searched"});
  }

  search_widget_spec(data) {
    this.search_string = data.search.toLowerCase();
    this.widget_spec_view.search(this.search_string);
    this.emit("library", {event: "searched"});
  }


}

export default new LibraryStore();
