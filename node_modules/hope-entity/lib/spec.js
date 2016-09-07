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
 * Spec Module
 * handle spec and spec_bundle
 * @module entity/spec
 */

var path = require("path");
var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/spec");
var check = B.check;

exports.create_local_spec = _create_local_spec;
exports.create_local_bundle = _create_local_bundle;

/**
 * Add a fully described specbundle into stores
 * Fully described means that the specs of the bundle are real objects
 * instead of ids
 * @param {Object} specbundle_
 * @param {Object} em
 * @param {Array} changed_list
 */
exports.add_specbundle_with_specs$ = function(specbundle_, em, changed_list) {
  var specbundle = _.cloneDeep(specbundle_);
  log("add_specbundle_with_specs", specbundle);
  B.check(specbundle.id, "entity/specbundle", "Bundle should have id", specbundle);
  return em.specbundle_store.has$(specbundle.id)
  .then(function(ret) {
    check(!ret, "entity/specbundle", "specbundle already exsit", specbundle.id);
    var specs = specbundle.specs, to_set = [];
    specbundle.specs = [];
    specs.forEach(function(spec) {
      B.check(_.isObject(spec) && _.isString(spec.id), "entity/specbundle",
        "spec should be an Object with a id of String", spec, "in specbundle", specbundle);
      specbundle.specs.push(spec.id);
      spec.specbundle = specbundle.id;
      to_set.push([spec.id, spec]);
    });
    return em.spec_store.batch_set$(to_set, changed_list).then(function() {
      return em.specbundle_store.set$(specbundle.id, specbundle, changed_list);
    });
  });
};

/**
 * load specs from spec_bundle in harddisk
 * @param  {string} bundle_path the path of spec_bundle
 * @param  {object} em
 * @param {Array} changed_list record of changed items
 * @return {Promise}
 */
exports.load_from_localbundle$ = function(bundle_path, em, changed_list) {
  log("load_from_localbundle", bundle_path);
  return Promise.resolve()
  .then(function() {
    var bundle_json_path = B.path.join(bundle_path, "spec_bundle.json");
    check(B.fs.file_exists(bundle_json_path), "entity/spec", "the bundle json file not exsit", bundle_json_path);
    var bundle_json = B.fs.read_json(bundle_json_path);
    var bundle = _create_local_bundle(bundle_json, bundle_path);
    var spec_path_array = B.fs.find_files(bundle_path, "*.json");
    var tasks = [];
    spec_path_array.forEach(function(p) {
      if (p === bundle_json_path) {
        return;
      }
      log("load_spec", p);
      var spec_json = B.fs.read_json(p);
      var spec = _create_local_spec(spec_json, p, bundle_path, bundle.id);
      bundle.specs.push(spec.id);
      tasks.push(em.spec_store.set$(spec.id, spec, changed_list));
    });
    tasks.push(em.specbundle_store.set$(bundle.id, bundle, changed_list));
    return Promise.all(tasks);
  });
};

/**
 * remove the spec in store. (excluding the harddisk)
 * 1, get the corresponding bundle
 * 2, remove the spec id from bundle.specs
 * 3, re-store the bundle
 * 4, delete the spec in store.
 * @param  {String} specid
 * @param  {Object} em
 * @param {Array} changed_list record of changed items
 * @return {Promise}
 */
exports.remove_spec_in_store$ = function(specid, em, changed_list) {
  //
  // TODO: temporarily disable to delete spec
  //
  return Promise.resolve();

  log("remove spec", specid);
  var bundle_id;
  return em.spec_store.get$(specid)
  .then(function(spec) {
    bundle_id = spec.specbundle;
    return em.specbundle_store.get_with_lock$(bundle_id,
      function(bundle) {
        _.remove(bundle.specs, function(id) {
          return id === specid;
        });
        return em.specbundle_store.set$(bundle_id, bundle, changed_list);
      });
  })
  .then(function() {
    return em.spec_store.delete$(specid, changed_list);
  });
};


function _create_local_bundle(json, bundle_path) {
  check(_.isString(json.id) && _.isString(json.name), "entity/spec",
  "spec bundle json must have id and name", json);
  json.specs = [];
  json.path = bundle_path;
  return json;
}

function _create_local_spec(json, spec_path, bundle_path, bundle_id, name) {
  json.name = json.name || name || _spec_default_name(spec_path, bundle_path);
  json.id = json.id || B.unique_id("__HOPE_SPEC__");
  // json.id = json.id || _spec_default_id(bundle_id, _spec_default_name(spec_path, bundle_path));
  json.path = spec_path;
  json.specbundle = bundle_id;

  if (json.config_ui) {
    var html_path = path.join(path.dirname(spec_path), json.config_ui);
    if (B.fs.file_exists(html_path)) {
      json.$config_ui = B.fs.read_file(html_path, "utf8").replace(/\{\{__THIS__SPEC__ID__\}\}/g, json.id);
    }
  }
  return json;
}

/**
 * default spec name. if the bundle path is a/b/c/d
 * and the spec path is a/b/c/d/e/f/xxx.json
 * the the name is "e/f/xxx"
 */
function _spec_default_name(spec_path, bundle_path) {
  var a = spec_path.slice(0, spec_path.length - 5)
  .split("/");
  var b = bundle_path.split("/");
  return a.slice(b.length).join("/");
}

/**
 * the default spec id.
 * name + '@' + base_id.
 * 1, the default name is created by the path, which is unique in the bundle.
 * 2, and the bundle id is unique in whole system.
 * so the id is unique
 */
function _spec_default_id(base_id, name) {
  return name + '@' + base_id;
}