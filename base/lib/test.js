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
 * Helpers for writting test cases
 * 
 * @module base/test
 */

var EventEmitter = require("eventemitter3");
var _ = require("lodash");


/**
 * Throws error if actual isn't equal to expected
 * if expected is omitted, it would treat actual as a condition and verify
 * whether it is true
 * @param  {Any} actual 
 * @param  {Any} expect 
 */
exports.expect = function(actual, expect) {
  if (arguments.length < 2) {
    if (!actual) {
      throw new Error("[Actual] |" + actual + "|");
    }
  } else {
    if (actual !== expect) {
      throw new Error("[Actual] |" + actual + "| while [Expect] |" + expect + "|");
    }
  }
};

/**
 * Wait for the promise. If reject, throws error. If resolve, check its value
 * against expect if expect is provided.
 * 
 * @param  {Function} d       The done provided by mocha function
 * @param  {Promise} promise The promise to check
 * @param  {Any} expect  
 */
exports.expect_promise = function(d, promise, expect) {
  var check_result = (arguments.length >= 3);
  promise.then(function(v) {
    if (check_result && expect !== v) {
      throw new Error("[Actual] |" + v + "| while [Expect] |" + expect + "|");
    } else {
      d();
    }
  }).catch(function(err) {
    throw new Error("<Reject> " + err);
  }).done();
};

/**
 * Similar as promise_expect, but expect it to be failed
 * 
 * @param  {Function} d       The done provided by mocha function
 * @param  {Promise} promise The promise to check
 * @param  {Any} expect  
 */
exports.expect_promise_reject = function(d, promise, expect) {
  var check_result = (arguments.length >= 3);
  promise.then(function(v) {
    throw new Error("[Actual] |" + v + "| while [Expect] <Reject>");
  }).catch(function(err) {
    if (check_result && expect !== err) {
      throw new Error("[Actual] |" + err + "| while [Expect] |" + expect + "|");
    } else {
      d();
    }
  }).done();
};


// capatures the data
function DataMonitor(name) {
  this.name = name;
  this.is_rejecting_data = false;
  this.event = new EventEmitter();
}

// throws error if any data is received since after
// This would be set to false if manully stop_reject, or 
// by using any data monitoring functions, such as wait$ etc.
DataMonitor.prototype.start_reject_data = function() {
  this.is_rejecting_data = true;
};

DataMonitor.prototype.stop_reject_data = function() {
  this.is_rejecting_data = false;
};


DataMonitor.prototype.on_data = function(data) {
  if (this.is_rejecting_data) {
    throw new Error("<" + this.name + "> Rejecting Data but Received: " + data);
  } else {
    this.event.emit("data", data);
  }
};

// resolves if all data_arr (usually strings) have received
// rejects if a) an unexpected data received b) timeout
// 
// timeout by default is 0, which means no timeout
// is_in_order checks whether the messages should receive in order
// data_arr is an array and could have duplicated items
DataMonitor.prototype.wait$ = function(data_arr, is_in_order, timeout) {
  this.stop_reject_data();

  timeout = timeout || 0;
  
  if (!_.isArray(data_arr)) {
    data_arr = [data_arr];
  }

  var all = _.clone(data_arr);   // no need deep


  var _resolve, _reject;  
  var p = new Promise(function(resolve, reject) {
    _resolve = resolve;
    _reject = reject;
  });

  var self = this;
  var timer;
  var wait_str = "<" + this.name + "> WAIT: ";

  function _finish() {
    clearTimeout(timer);
    self.event.removeListener("data", _on_data);
  }

  function _check_done() {
    if (!all.length) {
      _finish();
      _resolve();
    }
  }

  function _on_data(data) {
    var expected, all_copy, found;
    if (is_in_order) {
      expected = all.shift();
      if (!_.isEqual(data, expected)) {
        _finish();
        _reject(wait_str + "Expect |" + expected + "| BUT GOT |" + data + "|");
      } else {
        _check_done();
      }
    } else {
      all_copy = [];
      all.forEach(function(d) {
        if (!found && _.isEqual(d, data)) {
          found = true;
        } else {
          all_copy.push(d);
        }
      });
      all = all_copy;
      if (!found) {
        _finish();
        _reject(wait_str + "Received Unexpected |" + data + "|");
      } else {
        _check_done();
      }
    }
  }

  if (timeout > 0) {
    timer = setTimeout(function() {
      _finish();
      _reject(wait_str + "TIMEOUT with Data Not Received: " + all);
    }, timeout);
  }

  this.event.on("data", _on_data);

  _check_done(); // maybe data_arr is empty

  return p;
};

exports.create_data_monitor = function(name) {
  return new DataMonitor(name);
};

