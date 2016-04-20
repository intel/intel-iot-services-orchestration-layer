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
 * @module  base/web
 */

var _ = require("lodash");
var bodyParser = require("body-parser");
var express = require("express");
var io = require("socket.io");
var enableDestroy = require('server-destroy');


var check = require("./check").check;

/**
 * Create an express web app
 * @param  {Object} config in format of {
 *   port: ...
 *   static: [...] a list of directories to be served by this webapp as static
 *   web_socket: true/false: whether has a web socket enabled
 * }
 * @return {Object}        The web app created, it has a $destroy method,
 *                         a $$port property (in which port)
 *                         and a $$config property (stores the config)
 *                         and a $$server property for the server
 */
exports.create_web_app = function(config) {
  config = config || {};
  check(_.isNumber(config.port), "Should have port for the web app");
  var web_app = express();
  web_app.use(bodyParser.urlencoded({extended: true}));
  web_app.use(bodyParser.json());

  if (config.static) {
    var paths = _.isString(config.static) ? [config.static] : config.static;
    _.forEach(paths, function(path) {
      web_app.use(express.static(path));
    });
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

  web_app.$$port = config.port;
  web_app.$$config = config;
  web_app.$$server = server;

  return web_app;
};

exports.$factories = {
  WebApp: exports.create_web_app
};