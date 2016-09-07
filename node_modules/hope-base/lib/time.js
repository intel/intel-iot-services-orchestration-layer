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
 * Time module
 * @module  base/time
 */

var _ = require("lodash");
var check = require("./check").check;

var now = Date.now();//ms from 1970-1-1-0:0:0
var now_hrtime = [Math.floor(now / 1000), now % 1000 * 1000000];
var base_hrtime = process.hrtime();

/**
 * get the hrtime.
 * @return {Array}  [seconds, nanoseconds]. it is the absolute time
 */
exports.hrtime = function() {
  var t = process.hrtime();
  return [
            t[0] - base_hrtime[0] + now_hrtime[0],
            t[1] - base_hrtime[1] + now_hrtime[1]
         ]; 
};

/**
 * Substract two hrtime arrays
 * @param  {Array} a 
 * @param  {Array} b 
 * @return {Array}   the delta of a - b
 */
exports.substract = function(a, b) {
  check(_.isArray(a) && _.isArray(b) && a.length === 2 && b.length === 2,
    "base/time", "invalid hrtime object, should be  [seconds, nanoseconds]", a, b);
  return [a[0] - b[0], a[1] - b[1]];
};

/**
 * compare 2 hrtime result
 * @param  {Array} a 
 * @param  {Array} b 
 * @return {Number}   0: a is same with b
 *                    1: a > b (a is newer)
 *                    -1: a < b  (a is older)
 */
exports.compare_hrtime = function(a, b) {
  check(_.isArray(a) && _.isArray(b) && a.length === 2 && b.length === 2,
    "base/time", "invalid hrtime object, should be  [seconds, nanoseconds]", a, b);
  if (a[0] === b[0] && a[1] === b[1]) {
    return 0;
  }
  else if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) {
    return 1;
  }
  else {
    return -1;
  }
};