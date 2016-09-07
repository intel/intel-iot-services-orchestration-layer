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
var ipaddr = require("ipaddr.js");

var log = B.log.for_category("http_broker");


function HTTPBroker(config) {
  this.config = config = config || {};
  this.app = B.web.create_web_app(config);

  // {client_id: {
  //  session_id: ...    // inside a broker, for one client, we only allow one session alive
  //  ip: client_ip,
  //  port: ...
  // }
  this.clients = {};

  this.sessions = {}; // quick lookup to get client_id for a session

  // {client_id: {topic_x: true, topic_y: true...}}
  this.accepts = {};
  // {
  //    client_id_1: {
  //      topic_x: {
  //        client_id_m_that_subscribe_this: true
  //        client_id_y_that_subscribe_this: true
  //      }
  //    }
  //    __HOPE_SUBSCRIBE_ALL__: {   // this is for subscribe_all
  //    }
  // }
  this.subscribes = {__HOPE_SUBSCRIBE_ALL__: {}};


  this.app.post("/", this.dispatch.bind(this));
}

HTTPBroker.create = function(config) {
  return new HTTPBroker(config);
};

HTTPBroker.prototype.dispose = function() {
  this.app.$destroy();
};

function _send(res, data) {
  res.send(JSON.stringify({
    result: data
  }));
}

function _send_ack(res) {
  res.send(JSON.stringify({
    result: "ACK"
  }));
}

function _send_error(res, err) {
  if (_.isUndefined(err)) {    
    err = "Unknown Error";
  }
  res.status(500).send(JSON.stringify({
    error: err.toString()
  }));
}

// res is the client broker who send commands to this and result in the _post
HTTPBroker.prototype._post = function(client_id, command, data, res, cb, cb_err) {
  var client = this.clients[client_id];
  return request.post({
    url: "http://" + client.ip + ":" + client.port,
    json: {
      client_id: client_id,
      session_id: client.session_id,
      command: command,
      data: data
    }
  }, function(err, _res, body) {
    if (body && body.error) {
      err = body.error;
    }
    if (err) {
      log.warn("Failed to do command", command, "with", data, "due to [ERROR]", err);
      if (_.isFunction(cb_err)) {
        cb_err(err);
      } else if (res) {
        _send_error(res, err);
      }
    } else {
      if (_.isFunction(cb)) {
        cb(body.result);
      } else if (res) {
        _send_ack(res);
      }
    }
  });
};


HTTPBroker.prototype.dispatch = function(req, res) {
  var body = req.body || {};
  if (!_.isString(body.command) || !_.isString(body.client_id)) {
    log.warn("HTTP request body misses command or client_id", body);
    _send_error(res, "Missing command or client_id " + B.to_string(body));
    return;
  }
  var func = this[body.command];
  if (_.isFunction(func)) {
    func.call(this, req, res);
  }
};



HTTPBroker.prototype.remove_client = function(client_id) {
  log("remove client", client_id);

  if (!this.clients[client_id]) {
    return;
  }

  delete this.sessions[_.get(this.clients, [client_id, "session_id"])];
  delete this.clients[client_id];
  delete this.accepts[client_id];
  var self = this;
  _.forOwn(this.subscribes, function(topics, be_subscribed_id) {
    _.forOwn(topics, function(clients, topic) {
      delete clients[client_id];
      if (_.isEmpty(self.subscribes[be_subscribed_id][topic])) {
        delete self.subscribes[be_subscribed_id][topic];
      }
    });
    if (be_subscribed_id !== "__HOPE_SUBSCRIBE_ALL__" &&
        _.isEmpty(self.subscribes[be_subscribed_id])) {
      delete self.subscribes[be_subscribed_id];
    }
  });
};



HTTPBroker.prototype.add_client = function(client_id, data) {
  if (this.clients[client_id]) {
    log.warn("Client already Connected, will remove it first", client_id);
    this.remove_client(client_id);
  }
  log("add client");
  this.clients[client_id] = data;
  if (data.session_id) {
    this.sessions[data.session_id] = client_id;
  }
};

function normalize_ip(ip) {
  if (ip === "::1") {    // localhost in ipv6 format
    return "127.0.0.1";    
  }  
  return ipaddr.process(ip).toString();
}


HTTPBroker.prototype.connect = function(req, res) {
  var body = req.body || {};
  log("connect", body);
  B.check(req.ip, "http_broker", "No ip found in request");
  var session_id = B.unique_id("session_");
  this.add_client(body.client_id, {
    session_id: session_id,
    ip: normalize_ip(req.ip),
    port: body.data.port
  });
  _send(res, session_id);
};

// disconnect a client
HTTPBroker.prototype.disconnect = function(req, res) {
  var body = req.body || {};
  log("disconnect", body);
  this.remove_client(body.data || body.client_id);
  _send_ack(res);
};

// give a session_id, drop a session
HTTPBroker.prototype.drop_session = function(req, res) {
  var body = req.body || {};
  log("drop session", body);
  var client_id = this.sessions[body.data];
  if (client_id) {
    this.remove_client(client_id);
  }
  _send_ack(res);
};


HTTPBroker.prototype.validate_request = function(command, req, res) {
  var body = req.body || {};
  var client = this.clients[body.client_id];
  if (!client) {
    log.warn("Client Not Connected for " + command, body.client_id, body);
    _send_error(res, "Client Not Connected for " + command);
    return false;
  }
  if (client.session_id !== body.session_id) {
    log.warn("Session Dropped (need reconnect): session_id not matched for " + command, client, body);
    // this.remove_client(body.client_id);
    _send_error(res, "Session Dropped (need reconnect): session_id not matched for " + command);
    return false;    
  }
  return true;
};



HTTPBroker.prototype.accept = function(req, res) {
  var body = req.body || {};
  log("accept", body);
  if (this.validate_request("accept", req, res)) {
    _.set(this.accepts, [body.client_id, body.data], true);
    _send_ack(res);
  }
};

HTTPBroker.prototype.unaccept = function(req, res) {
  var body = req.body || {};
  log("accept", body);
  if (this.validate_request("unaccept", req, res)) {
    _.unset(this.accepts, [body.client_id, body.data]);
    _send_ack(res);
  }
};


HTTPBroker.prototype.send = function(req, res) {
  var body = req.body || {};
  log("accept", body);
  if (!this.validate_request("send", req, res)) {
    return;
  }
  var target_id = body.data.client_id;
  if (_.get(this.accepts, [target_id, body.data.topic])) {
    this._post(target_id, "message_for_accept", body.data.message, res);
  } else {
    _send_error(res, "Client hasn't registered to accept topic " + 
      body.data.topic + " client_id: " + target_id);
  }

};


HTTPBroker.prototype.subscribe = function(req, res) {
  var body = req.body || {};
  log("subscribe", body);
  if (this.validate_request("subscribe", req, res)) {
    _.set(this.subscribes, [body.data.client_id, body.data.topic, body.client_id], true);
    _send_ack(res);
  }
};

HTTPBroker.prototype.unsubscribe = function(req, res) {
  var body = req.body || {};
  log("unsubscribe", body);
  if (this.validate_request("unsubscribe", req, res)) {
    _.unset(this.subscribes, [body.data.client_id, body.data.topic, body.client_id]);
    if (!_.size(_.get(this.subscribes, [body.data.client_id, body.data.topic]))) {
      _.unset(this.subscribes, [body.data.client_id, body.data.topic]);
      if (body.data.client_id !== "__HOPE_SUBSCRIBE_ALL__" &&
        !_.size(this.subscribes[body.data.client_id])) {
        delete this.subscribes[body.data.client_id];
      }
    }
    _send_ack(res);
  }
};


HTTPBroker.prototype.subscribe_all = function(req, res) {
  var body = req.body || {};
  log("subscribe_all", body);
  if (this.validate_request("subscribe_all", req, res)) {
    _.set(this.subscribes, ["__HOPE_SUBSCRIBE_ALL__", body.data.topic, body.client_id], true);
    _send_ack(res);
  }
};

HTTPBroker.prototype.unsubscribe_all = function(req, res) {
  var body = req.body || {};
  log("unsubscribe_all", body);
  if (this.validate_request("unsubscribe_all", req, res)) {
    _.unset(this.subscribes, ["__HOPE_SUBSCRIBE_ALL__", body.data.topic, body.client_id]);
    if (!_.size(_.get(this.subscribes, ["__HOPE_SUBSCRIBE_ALL__", body.data.topic]))) {
      _.unset(this.subscribes, ["__HOPE_SUBSCRIBE_ALL__", body.data.topic]);
    }
    _send_ack(res);
  }
};

function _nop() {}

HTTPBroker.prototype.publish = function(req, res) {
  var body = req.body || {}, 
      topic = body.data.topic, 
      data = body.data.data,
      self = this;
  log("publish", body);
  
  if (this.validate_request("publish", req, res)) {
    _.forOwn(_.get(this.subscribes, [body.client_id, topic]) || {}, function(v, dst) {
      self._post(dst, 
        "message_for_subscribe", 
        data, res, _nop, _nop);
    });
    _.forOwn(this.subscribes["__HOPE_SUBSCRIBE_ALL__"][topic] || {}, function(v, dst) {
      self._post(dst, 
        "message_for_subscribe_all",
        data, res, _nop, _nop);
    });
    _send_ack(res);
  }


};



module.exports = HTTPBroker;