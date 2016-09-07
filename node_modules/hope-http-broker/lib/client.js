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
var B = require("hope-base");
var _ = require("lodash");
var request = require("request");
var EventEmitter = require("events").EventEmitter;

var log = B.log.for_category("http_broker_client");

// Each HTTPBrokerClient need to specify how it would listen to remote
// HTTP requests (i.e. client itself needs to start a web server at certain port)
// For each port, we start one web server 
var _all_web_apps = {};




// config should be in format of {
//   id: ... // optional
//   broker_url: ....     // how to connect to broker
//   my_port: ...         // at which port I'm listening to remote broker
// }
function HTTPBrokerClient(config) {
  B.check(_.isString(config.broker_url), "http_broker_client", "Need broker_url be defined");
  B.check(_.isNumber(config.my_port), "http_broker_client", "Need my_port be defined as a number");

  this.port = config.my_port;
  this.broker_url = _.trim(config.broker_url || "");
  if (!_.startsWith(this.broker_url, "http://") && !_.startsWith(this.broker_url, "https://")) {
    this.broker_url = "http://" + this.broker_url;
  }

  this.app = _all_web_apps[this.port];
  if (!this.app) {
    this.app = _all_web_apps[this.port] = B.web.create_web_app({
      port: this.port
    });
    this.app.post("/", this.handle_request.bind(this));
  }
  this.id = config.id || B.unique_id("HTTP_BROKER_CLIENT_");

  this.session_id = null;
}

B.type.inherit(HTTPBrokerClient, EventEmitter);

HTTPBrokerClient.prototype.handle_request = function(req, res) {
  // {
  //    client_id: xxxxx
  //    session_id: xxxxx
  //    command: xxxx
  //    data: {
  //    }
  // }
  var body = req.body || {};
  var err;
  // already dropped and shouldn't receive command for this
  // force broker to discconect the old session 
  if (this.session_id !== body.session_id) {
    this.post("drop_session", body.session_id);
    log.warn("Received command for not connected client", req.path, body, err);
    res.status(500).send(JSON.stringify({
      error: err
    }));
  } else {
    this.emit(body.command, body.data, body.client_id);
    res.send(JSON.stringify({
       result: "ACK"
    }));
  }
};


// it post command and data to broker
// and invoke resolve when finished and reject it when ecounter error for the promise
// and before fulfill the promise, it invokes cb if succeed (with result) 
// or invokes cb_err if failed
HTTPBrokerClient.prototype.post = function(command, data, cb, cb_err) {
  return request.post({
    url: this.broker_url,
    json: {
      client_id: this.id,
      session_id: this.session_id,
      command: command,
      data: data
    }
  }, function(err, res, body) {
    if (body && body.error) {
      err = body.error;
    }
    if (err) {
      log.warn("Failed to do command", command, "with", data, "due to [ERROR]", err);
      if (_.isFunction(cb_err)) {
        cb_err(err);
      }
    } else {
      if (_.isFunction(cb)) {
        cb(body.result);
      }
    }
  });
};


HTTPBrokerClient.prototype.connect$ = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("connect", {port: self.port}, function(session_id) {
      self.session_id = session_id;
      resolve(self);
    }, reject);   
  });
};


HTTPBrokerClient.prototype.disconnect$ = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("disconnect", {session_id: self.session_id}, resolve, reject);
  });
};


HTTPBrokerClient.prototype.dispose$ = function() {
  var self = this;
  this.disconnect$().finally(function() {
    return self.app.$destroy();
  });
};



// invoke this.mnode.on_message_for_accept when msg is received
HTTPBrokerClient.prototype.accept$ = function(topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("accept", topic, resolve, reject);
  });
};

HTTPBrokerClient.prototype.unaccept$ = function(topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("unaccept", topic, resolve, reject);
  });
};



HTTPBrokerClient.prototype.send$ = function(client_id, topic, msg) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("send", {
      client_id: client_id,
      topic: topic,
      message: msg
    }, resolve, reject);
  });
};


HTTPBrokerClient.prototype.subscribe$ = function(client_id, topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("subscribe", {
      client_id: client_id,
      topic: topic
    }, resolve, reject);
  });
};

HTTPBrokerClient.prototype.unsubscribe$ = function(client_id, topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("unsubscribe", {
      client_id: client_id,
      topic: topic
    }, resolve, reject);
  });
};


HTTPBrokerClient.prototype.subscribe_all$ = function(topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("subscribe_all", {
      topic: topic
    }, resolve, reject);
  });
};

HTTPBrokerClient.prototype.unsubscribe_all$ = function(topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("unsubscribe_all", {
      topic: topic
    }, resolve, reject);
  });
};



HTTPBrokerClient.prototype.publish$ = function(topic, data) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.post("publish", {
      topic: topic,
      data: data
    }, resolve, reject);
  });
};


module.exports = HTTPBrokerClient;