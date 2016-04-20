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
 * Basic assertions
 * @module base
 */

var log = require("./log");
var to_string = require("./to_string");
var _ = require("lodash");


/**
 * validate the condition and throw exception if failed
 * @param  {any} condition an expression
 * @param  {string} category  the category for this check
 * @return {any}           the evaluation result of the condition expression if succeed
 */
exports.check = function(condition, category) {
  var ex;
  try {
    if (condition) {
      return condition;
    }
  } catch(e) {
    ex = e;
  }
  var args = _.toArray(arguments);
  args.shift();
  args.shift();

  log.raw("error", 1, category, "<< CHECK >>", args, ex ? "<EXCEPTION>" : "",
    ex ? ex : "");

  
  var e_msg = "";
  if (_.isError(ex)) {
    e_msg = ex.stack;
  } else if (ex) {
    e_msg = ex.toString();
  }

  var e = new Error("[CHECK FAIL] " + args.map(function(a) {
    return to_string.to_string(a);
  }).join(" ") + e_msg);
  e.$check = true;
  throw e;
};

/**
 * validate the condition and report an warning only (not throw exception)
 * @param  {any} condition an expression
 * @param  {string} category  the category for this check
 * @return {any}           the evaluation result of the condition expression if succeed
 */
exports.check_warn = function(condition, category) {
  if (condition) {
    return condition;
  }
  var args = _.toArray(arguments);
  args.shift();
  args.shift();

  log.raw("warn", 1, category, "<< CHECK WARN >>", args);

  return condition;
};



/**
 * validate the condition and EXIT if failed
 * @param  {any} condition an expression
 * @param  {string} category  the category for this check
 * @return {any}           the evaluation result of the condition expression if succeed
 */
exports.assert = function(condition, category) {
  if (condition) {
    return condition;
  }
  var args = _.toArray(arguments);
  args.shift();
  args.shift();

  log.raw("error", 1, category, "<< CHECK >>", args);

  process.exit(1);
};

