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
 * user Module
 * handle user
 * @module entity/user
 */

var fs = require("fs");
var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/user");
var check = B.check;

exports.add_user$ = function(user, em) {
  log("add user", user);
  return em.user_store.has$(user.id)
  .then(function(ret) {
    check(!ret, "entity/user", "user already exist", user);
    check(!B.fs.dir_exists(user.appbundle_path), "entity/user",
     "the user path already exsit!", user.appbundle_path);
    fs.mkdirSync(user.appbundle_path);
    return em.user_store.set$(user.id, user);
  });
};

exports.remove_user$ = function(id, em) {
  log("remove user", id);
  return em.user_store.get$(id)
  .then(function(user) {
    if (!user) {
      return false;
    }
    B.fs.rm(user.appbundle_path);
    return em.user_store.delete$(id);
  });
};

exports.get_user$ = function(id, em) {
  log("get user", id);
  if (!_.isArray(id)) {
    return em.user_store.get$(id);
  } else {
    return em.user_store.batch_get$(id);
  }
};

exports.find_user$ = function(name, passwd, em) {
  log("find user", name);
  check(_.isString(name), "Failed to find user with", name);
  return em.user_store.list$().then(function(ids) {
    return em.user_store.batch_get$(ids);
  }).then(function(users) {
    if (!users) {
      return null;
    }
    if (passwd == null) {
      return _.find(users, ["name", name]);
    }
    return _.find(users, function(o) {
      return o.name === name && o.passwd === passwd;
    });
  });
};

exports.update_user$ = function(user, em) {
  log("update user", user);
  return em.user_store.get_with_lock$(user.id, 
    function(old_user) {
      check(!_.isUndefined(old_user), "entity_user", "the user not exist before", user.id);
      var new_user = _.assign(old_user, user);
      em.user_store.set$(new_user.id, new_user);
    });
};
