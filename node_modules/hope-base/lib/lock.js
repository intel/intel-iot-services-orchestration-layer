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
var log = require("./log").for_category("base/lock");
var check = require("./check").check;
var check_warn = require("./check").check_warn;
var _ = require("lodash");

var all_locks = {};


/**
 * Get a lock if it exists already, otherwise create one
 */
exports.make = function(id, config) {
  if (!all_locks[id]) {
    all_locks[id] = new Lock(id, config);
  } else {
    all_locks[id].configure(config);
  }
  return all_locks[id];
};


/**
 * Create a lock
 * @param {String} id     id of the lock
 * @param {Object} config {
 *   max_pending: -1 // if greater than 0, it would log a warning and 
 *                      give up the new lock requests 
 *   lock_life_time: 1000 * 3600 * 24  // a lock() can only lock it for a while
 *                   after that it logs a warning and then release the lock
 *                   this helps reduces deadlock
 *                   set this to -1 to cancel this behavior
 * }
 */
function Lock(id, config) {
  check(_.isString(id), "base/lock", "id should be a string", id);
  this.id = id;
  check(!all_locks[id], "base/lock", id, "already exists!");

  this.__seq = 0;

  this.is_locked = false;
  this.release_timer = null;
  this.pending_queue = [];

  this.configure(config);
}


Lock.prototype.configure = function(config) {
  config = config || {};
  this.max_pending = config.max_pending || -1;
  this.lock_life_time = config.lock_life_time || 1000 * 3600 * 24;  
};

/**
 * Lock
 * @param  {Function} cb           invoked when accquired the lock
 * @param  {lock_timeout}   lock_timeout if provided and greater than 0, it would
 *                                 give up if failed to accquire after such long
 * @param  {Boolean}   not_wait     if true, then immediately give up if already locked
 * @param  {Function} giveup_cb           invoked when giveup
 * @param {Boolean} manual_release if set, users have to invoke release by themself
 *                                  by default, the lock is automatically released
 *                                  if cb is invoked or giveup. If cb returns a promise
 *                                  the lock is released after the promsie is resolved
 *                                  or rejected
 */
Lock.prototype.lock = function(cb, lock_timeout, not_wait, giveup_cb, manual_release) {
  log("lock", this.id);
  check(_.isFunction(cb), "base/lock", this.id, "no callback function", cb);
  giveup_cb = giveup_cb || function() {};
  var new_cb = cb, self = this;
  if (!manual_release) {
    new_cb = function() {
      return new Promise(function(resolve, reject) {
        Promise.resolve(cb()).then(function(r) {
          self.release();
          resolve(r);
        }).catch(function(err) {
          self.release();
          reject(err);
        });
      });
    };
  }
  var seq, task;
  if (!this.is_locked) {
    this._lock({
      cb: new_cb
    });
  } else {
    log("locked", self.id);
    if (not_wait) {
      giveup_cb();
    } else if (this.max_pending > 0 && this.pending_queue.length >= this.max_pending) {
      check_warn(false, "base/lock", this.id, "exceeds max_pending", this.max_pending);
      giveup_cb();
    } else {
      seq = this.__seq++;
      if (this.__seq >= 100000000) {
        this.__seq = 0;
      }
      task = {
        seq: seq,
        cb: new_cb,
        giveup: giveup_cb
      };
      if (lock_timeout > 0) {
        task.timer = setTimeout(function() {
          _.remove(self.pending_queue, function(x) {
            return x.seq === seq;
          }).forEach(function(x) {
            if (_.isFunction(x.giveup)) {
              x.giveup();
            }
          });
        }, lock_timeout);
      }
      this.pending_queue.push(task);
    }
  }
};

/**
 * Almost the same as the lock, but it returns a promise.
 * The promise resolves with the value of cb 
 * and rejects if cb returns a rejected promise or giveup_cb is invoked
 */
Lock.prototype.lock_as_promise$ = function(cb, lock_timeout, not_wait, giveup_cb, manual_release) {
  check(_.isFunction(cb), "base/lock", this.id, "no callback function", cb);
  giveup_cb = giveup_cb || function() {};
  var self = this;
  return new Promise(function(resolve, reject) {
    var new_giveup_cb = function() {
      return Promise.resolve(giveup_cb()).then(function(r) {
        reject(r);
      }).catch(function(err) {
        reject(err);
      });
    };
    var new_cb = function() {
      return Promise.resolve(cb()).then(function(r) {
        resolve(r);
      }).catch(function(err) {
        reject(err);
      });
    };
    self.lock(new_cb, lock_timeout, not_wait, new_giveup_cb, manual_release);
  });
};


/**
 * Release the lock
 */
Lock.prototype.release = function() {
  log("lock release", this.id);
  if (!this.is_locked) {
    return;
  }
  this.is_locked = false;
  if (this.release_timer) {
    clearTimeout(this.release_timer);
    this.release_timer = null;
  }
  var x = null;
  while (this.pending_queue.length > 0 && !x) {
    x = this.pending_queue.shift();
  }
  if (x) {
    this._lock(x);
  } else {
    delete all_locks[this.id];
  }
};


// do real lock
Lock.prototype._lock = function(params) {
  log("_lock", this.id);
  check(!this.is_locked, "Shouldn't lock an already locked Lock", this.id);
  this.is_locked = true;
  if (params.timer) {
    clearTimeout(params.timer);
  }
  setImmediate(params.cb);
  if (this.lock_life_time > 0) {
    check(!this.release_timer, "Shouldn't have any release timer when lock", this.id);
    this.release_timer = setTimeout(this.release.bind(this), this.lock_life_time);
  }
};
