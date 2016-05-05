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
import {EventEmitter} from "events";
import cookie from "./cookie";

window.CryptoJS = require("browserify-cryptojs");
require("browserify-cryptojs/components/hmac");
require("browserify-cryptojs/components/md5");
require("browserify-cryptojs/components/enc-base64");

function md5(passwd, name) {
  return CryptoJS.enc.Base64.stringify(CryptoJS.HmacMD5(passwd, name));
}

class AuthManager extends EventEmitter {

  register(data, callback) {
    data.passwd = md5(data.passwd, data.name);

    $hope.app.server.user.register$(data).then(() => {
      callback(true);
    }).catch(() => {
      callback(false);
    }).done();
  }

  change_passwd(name, passwd, old_passwd, callback) {
    passwd = md5(passwd, name);
    old_passwd = md5(old_passwd, name);

    $hope.app.server.user.change_passwd$(old_passwd, passwd).then(res => {
      callback(res);
    }).catch(() => {
      callback(false);
    }).done();
  }

  login(name, pass, cb) {
    var hash = md5(pass, name);
    var callback = cb || _.noop;

    $hope.app.server.user.login$(name, hash).then(res => {
      if (_.isObject(res) && res.authenticated) {
        cookie.set("lastusr", name);
        cookie.set("role", res.role);
        this.emit("auth", {event: "login"});
        callback(true);
      }
      else {
        callback(false);
      }
    }).catch(() => {
      callback(false);
    }).done();
  }

  logout(cb) {
    var callback = cb || _.noop;

    $hope.app.server.user.logout$().then(() => {
      this.emit("auth", {event: "logout"});
      callback(true);
    });
  }

  is_logged_in() {
    return cookie.get("token") !== "";
  }

  get_last_user() {
    return cookie.get("lastusr") || "guest";
  }

  get_user_role() {
    return this.is_logged_in() && cookie.get("role");
  }
}

export default new AuthManager();

