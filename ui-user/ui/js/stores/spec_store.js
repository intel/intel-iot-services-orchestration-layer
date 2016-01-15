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
// This wraps SpecManager for FLUX
//
// It is a singleton
// Stay at top level, i.e. whether holds a navigation bar etc.
//////////////////////////////////////////////////////////////////


import EventEmitter from "events";

class SpecStore extends EventEmitter {
  constructor() {
    super();

    this.manager = require("../lib/spec");

    $hope.register_action_handler({
      "spec/add/bundles":       this.add_bundles.bind(this),
      "spec/change/bundle_color": this.change_bundle_color.bind(this)
    });
  }

  init$() {
    // ensure UI widgets are loaded
    return this.load_bundles$(["hope/ui"]);
  }

  get_spec(id) {
    return this.manager.get(id);
  }

  get_ui_bundles() {
    return this.manager.get_ui_bundles();
  }

  ensure_specs_loaded$(spec_array) {
    var d = $Q.defer();
    var unloaded = this.manager.find_unloaded_ids(spec_array);
    if (unloaded.length === 0) {
      d.resolve();
    } else {
      this.load_specs$(unloaded).then(() => { 
        // we need to double check that the specs are actually loaded
        let still_unloaded = this.manager.find_unloaded_ids(spec_array);
        if (!_.isEmpty(still_unloaded)) {
          $hope.log.error("spec", "Still have specs", still_unloaded, 
            "unloaded even after get_for_specs$", spec_array);
          //d.reject(new Error("Still have specs unloaded after get_for_spec$: " +
          //  still_unloaded.join(",")));
        }
        d.resolve();
      }).catch(err => {
        $hope.log.error("spec", "Failed to get_for_specs$ for", unloaded, 
        "with error:", err);
        d.reject(err);
      }).done();
    }
    return d.promise;
  }

  load_specs$(ids) {
    return $hope.app.server.spec_bundle.get_for_specs$(ids)
      .then(json => this.add_bundles(json))
      .catch(err => {
        $hope.log.error("spec", "Failed to load_specs$ for", ids, 
          "with error:", err);
        return err;
      });
  }

  load_bundles$(ids) {
    return $hope.app.server.spec_bundle.get$(ids)
      .then(json => this.add_bundles(json))
      .catch(err => {
        $hope.log.error("spec", "Failed to load_bundles$ for", ids, 
          "with error:", err);
        return err;
      });
  }

  add_bundles(bundle_json_array) {
    var ids = [];
    _.forOwn(bundle_json_array, json => {
      ids.push(this.manager.add_bundle(json).id);
    });
    this.emit("spec", {event: "added/bundles", ids: ids});
  }

  change_bundle_color(data) {
    var b = this.manager.get_bundle(data.bundle_id);
    if (b && b.$color_id !== data.color_id) {
      b.$color_id = data.color_id;
      this.emit("spec", {event: "changed/bundle_color", id: data.bundle_id});
    }
  }
}


export default new SpecStore();