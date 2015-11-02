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
 * Helpers and Brokers for using http type port
 * Details see impl_ports/http.js
 */

var B = require("hope-base");
var _ = require("lodash");
var request = require("request");
var bodyParser = require("body-parser");
var express = require("express");
var io = require("socket.io");
var enableDestroy = require('server-destroy');

var log = B.log.for_category("http_broker");

// setup the express to ensure it works correctly
exports.setup_app = function(app) {
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
};


// create the app with server
// {
//   port: ...
// }
exports.create_web_app = function(config) {
  config = config || {};
  B.check(_.isNumber(config.port), "Should have port for the web app");
  var web_app = require("express")();
  exports.setup_app(web_app);

  if (config.static) {
    web_app.use(express.static(config.static));
  }

  web_app.all("*", function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // http://127.0.0.1:7000
    res.header("Access-Control-Allow-Headers", "origin, content-type, accept");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    next();
  });



  // Start the server
  var server = require("http").createServer(web_app); // http server
  server.listen(config.port);
  //enable server destroy
  enableDestroy(server);

  if (config.web_socket) {
    web_app.$web_socket = io(server);
  }

  web_app.$destroy = function() {
    server.destroy();
  };

  return web_app;
};


exports.create_broker_from_app = function(app, config) {
  return new HTTPBroker(app, config);
};

// {
//   port: ...
//   url_path: ...
// }
exports.create_broker = function(config) {
  config = config || {};
  B.check(_.isString(config.url_path) && _.isNumber(config.port),
    "Should have port and url_path for the broker");
  var web_app = express();
  exports.setup_app(web_app);
  var broker = exports.create_broker_from_app(web_app, config);

  // Start the server
  var server = require("http").createServer(web_app); // http server
  server.listen(config.port);
  return broker;
};

// app is an express app
function HTTPBroker(app, config) {
  this.app = app;
  this.config = config;

  this.accepts = {};

  this.subscribes = {};

  this.subscribe_alls = {};

  var url_path = this.url_path = config.url_path;

  B.check(_.isString(url_path) && url_path[0] === "/", "message/http_broker",
    "URL path for http broker should be a string started with /");

  app.post(url_path + "/accept", this.accept.bind(this));
  app.post(url_path + "/send", this.send.bind(this));
  app.post(url_path + "/subscribe", this.subscribe.bind(this));
  app.post(url_path + "/subscribe_all", this.subscribe_all.bind(this));
  app.post(url_path + "/unsubscribe", this.unsubscribe.bind(this));
  app.post(url_path + "/unsubscribe_all", this.unsubscribe_all.bind(this));
  app.post(url_path + "/publish", this.publish.bind(this));
}


function _send(res, data) {
  if (_.isUndefined(data)) {    // shouldn't be 0 / false
    data = {};
  }
  res.send(JSON.stringify(data));
}

function _send_error(res, err) {
  if (_.isUndefined(err)) {    // shouldn't be 0 / false
    err = "Unknown Error";
  }
  res.status(500).send(JSON.stringify({
    error: err.toString()
  }));
}

HTTPBroker.prototype.accept = function(req, res) {
  var data = req.body;
  log("accept", data);
  this.accepts[data.mnode_id] = data;
  _send(res, {});
};


HTTPBroker.prototype.send = function(req, res) {
  var data = req.body;
  log("send", data);
  var to = this.accepts[data.to_mnode_id]; 
  if (!to) {
    _send_error(res, "MNode to send isn't registered to broker: " 
      + data.to_mnode_id);
    return;
  }
  request.post({
    url: to.url, 
    json: data.message
  }, function(err) {
    if (err) {
      _send_error(res, "message/http_port_impl/send" + err);
    } else {
      _send(res, {});
    }
  });
};


HTTPBroker.prototype.subscribe = function(req, res) {
  var data = req.body;
  log("subscribe", data);
  if (!this.subscribes[data.pub_mnode_id]) {
    this.subscribes[data.pub_mnode_id] = {};
  }
  var pub =  this.subscribes[data.pub_mnode_id];
  if (!pub[data.mnode_id]) {
    pub[data.mnode_id] = {};
  }
  pub[data.mnode_id][data.topic] = data.url;
  _send(res, {});
};

HTTPBroker.prototype.unsubscribe = function(req, res) {
  var data = req.body;
  log("unsubscribe", data);
  if (!this.subscribes[data.pub_mnode_id]) {
    this.subscribes[data.pub_mnode_id] = {};
  }
  var pub =  this.subscribes[data.pub_mnode_id];
  if (pub && pub[data.mnode_id]) {
    delete pub[data.mnode_id][data.topic];
    if (!_.size(pub[data.mnode_id])) {
      delete pub[data.mnode_id];
    }
    if (!_.size(pub)) {
      delete this.subscribes[data.pub_mnode_id];
    }
  }
  _send(res, {});
};


HTTPBroker.prototype.subscribe_all = function(req, res) {
  var data = req.body;
  log("subscribe_all", data);
  if (!this.subscribe_alls[data.topic]) {
    this.subscribe_alls[data.topic] = {};
  }
  this.subscribe_alls[data.topic][data.mnode_id] = data.url;
  _send(res, {});
};

HTTPBroker.prototype.unsubscribe_all = function(req, res) {
  var data = req.body;
  log("unsubscribe_all", data);
  var t = this.subscribe_alls[data.topic];
  if (t) {
    delete t[data.mnode_id];
    if (!_.size(t)) {
      delete this.subscribe_alls[data.topic];
    }
  }
  _send(res, {});
};


function post$(to_id, url, data) {
  return new Promise(function(resolve, reject) {
    request.post({
      url: url, 
      json: data
    }, function(err) {
      if (err) {
        reject("ERROR for MNode " + to_id + ": " + err);
      } else {
        resolve();
      }
    });
  });
}

HTTPBroker.prototype.publish = function(req, res) {
  var data = req.body;
  log("publish", data);
  var all = [];
  var pub =  this.subscribes[data.mnode_id];
  if (pub) {
    _.forOwn(pub, function(to, to_id) {
      if (to[data.topic]) {
        all.push(post$(to_id, to[data.topic], data.message));
      }
    });
  }
  var pub_all = this.subscribe_alls[data.topic];
  _.forOwn(pub_all, function(to, to_id) {
    all.push(post$(to_id, to, data.message));
  });
  Promise.all(all).then(function() {
    _send(res, {});
  }).catch(function(err) {
    _send_error(res, err);
  });
};



exports.$factories = {
  WebApp: exports.create_web_app,
  Broker: exports.create_broker
};