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
// SpecManager is a singleton, i.e. module.exports is an object
//
// Specs are provided in bundles, each bundle has an id
// and in format of {
//    id: ...
//    name: ...
//    specs: [{id: ...}, {id: ...}]
//    styles: ...
// }
// after being loaded, we would add a $specs_index into it
// 
// detailed examples are in samples/spec_bundles.js
// 
// TODO: manage remote downloading of bundles, e.g. spec providers
//////////////////////////////////////////////////////////////////

// for each new bound we add, we would assign it a color_id
var _cur_color_id = 3;
var g_spec_manager;


class Spec {
  constructor(bundle, json) {
    this.$bundle = bundle;
    this.$type = "spec";
    _.merge(this, json);
  }

  $get_impl() {
    if (this.is_ui) {
      let _widget_impls = require("hope-ui-widgets");
      let impl = _widget_impls[this.id];
      $hope.check(impl, 
        "Widget", "No widget implements UI spec:", this);
      return impl;
    }
  }
}


class Bundle {
  constructor(json) {
    $hope.check(_.isObject(json) && _.isArray(json.specs), "SpecManager", 
      "the bundle.specs should be an array", json);
    _.merge(this, json);
    this.$color_id = _cur_color_id ++;

    this.specs = [];
    _.forOwn(json.specs, spec_json => {
      this.specs.push(new Spec(this, spec_json));
    });
    this.$specs_index = $hope.array_to_hash(this.specs, "id", null, true);
    this.styles = this.styles || {};
    this.styles.specs = this.styles.specs || {};

    this.index_catalog();
  }

  index_catalog() {
    var catalogs = {unsorted: {}};
    _.forOwn(this.specs, s => {
      if (s.catalog) {
        if (!catalogs[s.catalog]) {
          catalogs[s.catalog] = {};
        }
        catalogs[s.catalog][s.id] = s;
      } else {
        catalogs.unsorted[s.id] = s;
      }
    });
    if (_.isEmpty(catalogs.unsorted)) {
      delete catalogs.unsorted;
    }
    this.$catalogs = catalogs;
  };

}



// The bundles are ordered and the query starts from 
class SpecManager {
  constructor() {
    this.bundles = [];
    this.$bundles_index = {};
  }

  _add_bundle(bundle_json, is_beginning) {
    var b = new Bundle(bundle_json);
    var existing = this.$bundles_index[b.id];
    $hope.check_warn(!existing, "SpecManager",
      "bundle already added", bundle_json);
    // All external reference to bundle and spec is through id
    // (i.e. only spec_view.x and this manager itself references objects directly)
    // so it is safe to directly replace it, but we need to keep color unchanged
    if (existing) {
      b.$color_id = existing.$color_id;
      this.remove_bundle(b.id);
    }
    if (is_beginning) {
      this.bundles.unshift(b);
    } else {
      this.bundles.push(b);
    }
    this.$bundles_index[b.id] = b;
    return b;
  }

  unshift_bundle(bundle_json) {
    return this._add_bundle(bundle_json, true);
  }

  add_bundle(bundle_json) {
    return this._add_bundle(bundle_json, false);
  }

  remove_bundle(id) {
    _.remove(this.bundles, b => b.id === id);
    delete this.$bundles_index[id];
  }

  get_bundle(id) {
    return this.$bundles_index[id];
  }


  get_ui_bundles() {
    var r = [];
    _.each(this.bundles, b => {
      if (b.is_ui) {
        r.push(b);
      }
    });
    return r;
  }

  // check spec_hashset first before goes to internal bundles
  get(spec_id, spec_hashset) {
    var spec;
    if (_.isObject(spec_hashset)) {
      spec = spec_hashset[spec_id];
      if (spec) {
        return spec;
      }
    }
    for (var i = 0; i < this.bundles.length; i++) {
      spec = (this.bundles[i].$specs_index)[spec_id];
      if (spec) {
        return spec;
      }
    }
    return undefined;
  }



  // Return the spec ids that aren't in manager yet
  find_unloaded_ids(spec_id_array) {
    var unloaded = [];
    _.forOwn(spec_id_array, id => {
      if (!this.get(id)) {
        unloaded.push(id);
      }
    });
    return _.uniq(unloaded);
  };

}


g_spec_manager = new SpecManager();

export default g_spec_manager;