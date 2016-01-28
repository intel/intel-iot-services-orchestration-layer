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
/**
 * Entity Module
 * @module entity-store
 */
var S = require("hope-store");



/** 
 * show the suported store type (memory, ..)
 * @function
 */
exports.list_supported_type = S.list_supported_type;

exports.create_hubstore$ = function(type, config) {
  var HubStore = require("./lib/hub.js");
  var s;
  return Promise.resolve().then(function() {
    s = new HubStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_thingstore$ = function(type, config) {
  var ThingStore = require("./lib/thing.js");
  var s;
  return Promise.resolve().then(function() {
    s = new ThingStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_servicestore$ = function(type, config) {
  var ServiceStore = require("./lib/service.js");
  var s;
  return Promise.resolve().then(function() {
    s = new ServiceStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_specstore$ = function(type, config) {
  var SpecStore = require("./lib/spec.js");
  var s;
  return Promise.resolve().then(function() {
    s = new SpecStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_specbundlestore$ = function(type, config) {
  var SpecBundleStore = require("./lib/spec_bundle.js");
  var s;
  return Promise.resolve().then(function() {
    s = new SpecBundleStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_sessionstore$ = function(type, config) {
  var SessionStore = require("./lib/session.js");
  var s;
  return Promise.resolve().then(function() {
    s = new SessionStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_graphstore$ = function(type, config) {
  var GraphStore = require("./lib/graph.js");
  var s;
  return Promise.resolve().then(function() {
    s = new GraphStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_appstore$ = function(type, config) {
  var AppStore = require("./lib/app.js");
  var s;
  return Promise.resolve().then(function() {
    s = new AppStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_uistore$ = function(type, config) {
  var UiStore = require("./lib/ui.js");
  var s;
  return Promise.resolve().then(function() {
    s = new UiStore(type, config);
    return s.init$();  
  }).then(function() {
    return s;
  });
};

exports.create_userstore$ = function(type, config) {
  var UserStore = require("./lib/user.js");
  var s;
  return Promise.resolve().then(function() {
    s = new UserStore(type, config);
    return s.init$();
  }).then(function() {
    return s;
  });
};

/**
 * Factories for assemble
 * @type {Object}
 */
exports.$factories = {
  HubStore: exports.create_hubstore$,
  ThingStore : exports.create_thingstore$,
  ServiceStore: exports.create_servicestore$,
  SpecStore: exports.create_specstore$,
  SpecBundleStore: exports.create_specbundlestore$,
  AppStore: exports.create_appstore$,
  GraphStore: exports.create_graphstore$,
  UiStore: exports.create_uistore$,
  SessionStore: exports.create_sessionstore$
};
