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
 * Port Implementation based on http
 *
 * For HTTP, we have a http broker, so every mnode register its
 * AcceptPort and SubscribePort to the broker, and the Send and Publish
 * send the message to broker who would help relay it
 *
 * AcceptPort requires config {
 *   app: ...,        // the express app to setup the route
 *   base_url: ...    // e.g. http://a.b.com/apis. 
 *   path: ...        // relative to base_url, e.g. /message/my_accept
 *   broker_url: ...
 *   // might have crenditials etc.
 * }
 *
 * SendPort {
 *   broker_url: ...
 *   // might have crenditials etc.
 * }
 *
 * SubscribePort {
 *   app: ...,
 *   base_url: ...,
 *   path: ...        // to accept messages by subscribe$
 *   path_for_all: ...    // to accept messages by subscribe_all$
 *   broker_url: ...
 *   // might have crenditials etc.
 * }
 *
 * PublishPort {
 *   broker_url: ...
 *   // might have crenditials etc.
 * }
 *
 * 
 * @module  message/port/event
 */

var Port = require("../port");
var B = require("hope-base");
var M = require("../message");

var request = require("request");


module.exports = {
  accept: AcceptPort,
  send: SendPort,
  subscribe: SubscribePort,
  publish: PublishPort
};

function _send_ack(res) {
  res.send(JSON.stringify({}));
}
//----------------------------------------------------------------
// Accept
//----------------------------------------------------------------

function AcceptPort(mnode, name, config) {
  B.check(config && config.app && config.base_url && config.path &&
    config.broker_url, "message/http_port_impl/accept", "imcomplete config", config);
  Port.AcceptPort.apply(this, arguments);
  var self = this;
  config.app.post(config.path, function(req, res) {
    self.on_message(req.body);
    _send_ack(res);
  });
  request.post({
    url: config.broker_url + "/accept", 
    json: {
      mnode_id: self.mnode.id,
      mnode_name: self.mnode.name,
      url: config.base_url + config.path 
    }}).on("error", function(err) {
    B.check(false, "message/http_port_impl/accept", err);
  });
}
B.type.inherit(AcceptPort, Port.AcceptPort);

AcceptPort.create = function(mnode, name, config) {
  return new AcceptPort(mnode, name, config);
};

AcceptPort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "accept",
    impl: "http",
    data: this.config
  };
};


//----------------------------------------------------------------
// Send
//----------------------------------------------------------------

function SendPort(mnode, name, config) {
  B.check(config && config.broker_url, "message/http_port_impl/send",
    "incomplete config");
  Port.SendPort.apply(this, arguments);
}
B.type.inherit(SendPort, Port.SendPort);

SendPort.create = function(mnode, name, config) {
  return new SendPort(mnode, name, config);
};


SendPort.prototype.get_info_to_talk = function(to_mnode_id, to_info) {
  return {
    to_mnode_id: to_mnode_id,
    not_sure_can_talk: true     // don't use in AutoRule
  };
};

SendPort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "send",
    impl: "http",
    data: this.config
  };
};


SendPort.prototype.send$ = function(info, topic, message) {
  var self = this;
  return new Promise(function(resolve, reject) {
    request.post({
      url: self.config.broker_url + "/send", 
      json: {
        to_mnode_id: info.to_mnode_id,
        message: M.encode_send(self.get_addr(), info.to_mnode_id, topic, message)
      }
    }, function(err, res, body) {
      if (err) {
        reject("message/http_port_impl/send" + err);
      } else {
        resolve();
      }
    });
  });

};


//----------------------------------------------------------------
// Subscribe
//----------------------------------------------------------------

function SubscribePort(mnode, name, config) {
  B.check(config && config.app && config.base_url && config.path &&
    config.path_for_all && config.broker_url, 
    "message/http_port_impl/subscribe", "imcomplete config");
  Port.SubscribePort.apply(this, arguments);
  var self = this;
  config.app.post(config.path, function(req, res) {
    self.on_message(req.body);
    _send_ack(res);
  });
  config.app.post(config.path_for_all, function(req, res) {
    self.on_message_all(req.body);
    _send_ack(res);
  });

}

B.type.inherit(SubscribePort, Port.SubscribePort);

SubscribePort.create = function(mnode, name, config) {
  return new SubscribePort(mnode, name, config);
};

SubscribePort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "subscribe",
    impl: "http",
    data: this.config 
  };
};

SubscribePort.prototype.get_info_to_talk = function(pub_mnode_id, to_info) {
  return {
    pub_mnode_id: pub_mnode_id,
    not_sure_can_talk: true     // don't use in AutoRule
  };
};

SubscribePort.prototype.subscribe$ = function(info, topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    request.post({
      url: self.config.broker_url + "/subscribe", 
      json: {
        mnode_id: self.mnode.id,
        mnode_name: self.mnode.name,
        pub_mnode_id: info.pub_mnode_id,
        topic: topic,
        url: self.config.base_url + self.config.path
      }
    }, function(err, res, body) {
      if (err) {
        reject("message/http_port_impl/subscribe" + err);
      } else {
        resolve();
      }
    });
  });

};

SubscribePort.prototype.unsubscribe$ = function(info, topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    request.post({
      url: self.config.broker_url + "/unsubscribe", 
      json: {
        mnode_id: self.mnode.id,
        mnode_name: self.mnode.name,
        pub_mnode_id: info.pub_mnode_id,
        topic: topic
      }
    }, function(err, res, body) {
      if (err) {
        reject("message/http_port_impl/unsubscribe" + err);
      } else {
        resolve();
      }
    });
  });
};


SubscribePort.prototype.subscribe_all$ = function(topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    request.post({
      url: self.config.broker_url + "/subscribe_all", 
      json: {
        mnode_id: self.mnode.id,
        mnode_name: self.mnode.name,
        topic: topic,
        url: self.config.base_url + self.config.path_for_all
      }
    }, function(err, res, body) {
      if (err) {
        reject("message/http_port_impl/subscribe_all" + err);
      } else {
        resolve();
      }
    });
  });
};

SubscribePort.prototype.unsubscribe_all$ = function(topic) {
  var self = this;
  return new Promise(function(resolve, reject) {
    request.post({
      url: self.config.broker_url + "/unsubscribe_all", 
      json: {
        mnode_id: self.mnode.id,
        mnode_name: self.mnode.name,
        topic: topic
      }
    }, function(err, res, body) {
      if (err) {
        reject("message/http_port_impl/unsubscribe_all" + err);
      } else {
        resolve();
      }
    });
  });
};

//----------------------------------------------------------------
// Publish
//----------------------------------------------------------------

function PublishPort(mnode, name, config) {
  Port.PublishPort.apply(this, arguments);
}
B.type.inherit(PublishPort, Port.PublishPort);

PublishPort.create = function(mnode, name, config) {
  return new PublishPort(mnode, name, config);
};



PublishPort.prototype.get_addr = function() {
  return {
    mnode_id: this.mnode.id,
    name: this.name,
    type: "publish",
    impl: "http",
    data: this.config
  };
};


PublishPort.prototype.publish$ = function(topic, message) {
  var self = this;
  return new Promise(function(resolve, reject) {
    request.post({
      url: self.config.broker_url + "/publish", 
      json: {
        mnode_id: self.mnode.id,
        mnode_name: self.mnode.name,
        topic: topic,
        message: M.encode_publish(self.get_addr(), topic, message)
      }
    }, function(err, res, body) {
      if (err) {
        reject("message/http_port_impl/publish" + err);
      } else {
        resolve();
      }
    });
  });
};
