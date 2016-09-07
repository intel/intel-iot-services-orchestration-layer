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
// Use array for parameters, assuming batch (i.e. sending / returning multiple objects)
// 
// Object usually always has id, name, description. Receiver may use the id
// and then call related functions in interface to get the details
// 
// For events, it only returns the type of the event and impacted entity, but 
// doesn't need to provide more details. It's client that need to use APIs 
// to fetch the updated details for the entities
// 
// Object schema
// app:{
//   id: ...
//   name: ...
//   description: ...
//   graphs: [{
//     id: ...
//     name: ...
//     description: ...
//     status: {
//       enabled: ...
//     }
//   }]
// }
// 
// graph: {
//   status: {...}
//   graph: the_graph_json
// }
// 
// spec_bundle.list: [ {
//  id: ...
//  name: ...
//  description: ...
//  
// }
// ]
// 
// bundle: see samples/spec_bundles.js
// 
// hub.list: [ {
//   id: ...
//   name: ...
//   description: ...
// }
// ]
// 
// hub: see samples/hub.js
//   
//   

// For now we only need one implementation of above interface
var WebBackend = {
  user: {},
  app: {},
  ui: {},
  graph: {},
  spec_bundle: {},
  hub: {}
};

function invoke(api) {
  var params = _.toArray(arguments);
  params.shift();
  return $Q($.ajax({
    type: "POST",
    url: "apis/user",
    data: JSON.stringify({
      api: api,
      params:params 
    }),
    contentType: "application/json",
    dataType: "json"
  }).then(function(data) {
    $hope.log("API", "[Invoke]", api, "\n            [Params]", 
      params, "\n            [Result]", data);
    return data;
  }, function(err) {
    $hope.log.warn("API", "[Invoke]", api, "\n            [Params]", 
      params, "\n            [Error]", err.responseText, err);
    if (err.responseText === "__HOPE_LOGIN_REQUIRED__") {
      location.replace("/#/login");
      return undefined;
    }
    if (err.responseText) {
      return new Error(err.responseText);
    }
    return err;
  }));
}

WebBackend.get_config$ = function() {
  return invoke("sys.get_config");
};

WebBackend.user.login$ = function(name, pass) {
  return invoke("user.login", name, pass);
};

WebBackend.user.logout$ = function() {
  return invoke("user.logout");
};

WebBackend.app.list$ = function() {
  return invoke("app.list");
};

WebBackend.app.get_widget_data$ = function(app_id, widget_id) {
  return invoke("app.get_widget_data", {
    app: app_id,
    widget: widget_id
  });
};


WebBackend.app.send_widget_data$ = function(app_id, widget_id, data) {
  return invoke("app.send_widget_data", {
    app: app_id,
    widget: widget_id,
    data: data
  });
};


WebBackend.ui.get$ = function(ids) {
  if (!_.isArray(ids)) {
    ids = [ids];
  }
  return invoke("ui.get", ids);
};

WebBackend.graph.get$ = function(ids) {
  if (!_.isArray(ids)) {
    ids = [ids];
  } 
  return invoke("graph.get", ids);
};

WebBackend.spec_bundle.list$ = function() {
  return invoke("spec_bundle.list");
};

WebBackend.spec_bundle.get$ = function(ids) {
  if (!_.isArray(ids)) {
    ids = [ids];
  }
  return invoke("spec_bundle.get", ids);
};

WebBackend.spec_bundle.get_for_specs$ = function(ids) {
  if (!_.isArray(ids)) {
    ids = [ids];
  } 
  return invoke("spec_bundle.get_for_specs", ids);
};

WebBackend.hub.list$ = function() {
  return invoke("hub.list");
};

WebBackend.hub.get$ = function(ids) {
  if (!_.isArray(ids)) {
    ids = [ids];
  } 
  return invoke("hub.get", ids);
};

export default WebBackend;