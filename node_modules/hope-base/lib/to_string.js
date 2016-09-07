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
 * Dump to string
 * @module  base
 */

var _ = require("lodash");


function to_short_string(x) {
  if (_.isUndefined(x)) {
    return "<__undefined__>";
  }
  if (_.isNull(x)) {
    return "<__null__>";
  }
  if (_.isString(x.$short_string)) {
    return x.$short_string;
  }
  if (_.isFunction(x.$to_short_string)) {
    return x.$to_short_string();
  }
  if (_.isString(x)) {
    return x;
  }
  if (_.isDate(x)) {
    return "<DATE: " + x.toString() + ">";
  }
  if (_.isError(x)) {
    return "<ERROR: " + x.message + ">";
  }
  if (_.isFunction(x)) {
    return "<FUNCTION: " + (x.name || "anonymous") + ">";
  }
  if (_.isArray(x)) {
    return "<ARRAY of length: " + x.length + ">";
  }
  if (_.isObject(x)) {
    if (x.constructor) {
      return "<OBJECT of TYPE: " + x.constructor.name + ">";
    } else {
      return "<OBJECT of unknown TYPE>";
    }
  }
  return x.toString();
}

function to_string(x, depth, cur_depth, indent) {

  if (_.isUndefined(x) || _.isNull(x)) {
    return to_short_string(x);
  }

  if (_.isFunction(x.$to_string)) {
    return x.$to_string();
  }

  if (_.isString(x)) {
    if (depth > 0) {
      return "\"" + x + "\"";
    } else {
      return x;
    }
  }

  // cannot use instanceof because this would be false if it is TypeError etc.
  if (_.isDate(x) || _.isFunction(x)) {
    return to_short_string(x);
  }

  if (_.isError(x)) {
    return x.stack;
  }


  depth = depth || 3;
  if (depth < 0) {
    depth = 3;
  }
  cur_depth = cur_depth || 0;
  // indent is only used when there is a need to add a new line
  if (_.isUndefined(indent)) {
    indent = "";
  }

  var lines = [], i;
  if (_.isArray(x)) {
    if (cur_depth >= depth) {
      return to_short_string(x);
    }
    for (i = 0; i < x.length; i++) {
      lines.push(to_string(x[i], depth, cur_depth + 1, indent));
    }
    return "[" + lines.join(", ") + "]";
  }


  if (_.isObject(x)) {

    if (cur_depth >= depth) {
      return to_short_string(x);
    }
    var new_indent = indent + "  ";   // indent 2 spaces
    var keys = _.keys(x);
    if (keys.length === 0) {
      return "{}";
    } 
    if (keys.length === 1) {
      return "{ " + keys[0] + ": " + 
        to_string(x[keys[0]], depth, cur_depth + 1, new_indent) + " }";
    }
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      lines.push(indent + "  " + k + ": " + to_string(x[k], depth, 
        cur_depth + 1, new_indent));
    }
    return "{\n" + lines.join(",\n") + "\n" + indent + "}";
  }
  return x.toString();
}

/**
 * Dump a value to a formated string
 *
 * The value (or its descendants) may have $to_string() defined to replace
 * the default behavior of this to_string()
 * It may further defines a $short_string member, or a $to_short_string() 
 * function, if it needs to be shown in one line (e.g. when it exceeds depth)
 * 
 * @param  {any} x      Any value, e.g. primitive, array, object, etc.
 * @param  {uint} depth  Max depth that would recrusively dump
 * @return {string}      
 */
exports.to_string = function(x, depth) {
  return to_string(x, depth, 0, "");  
};


/**
 * Dump a value to a formated one line string
 *
 * Users may attach a $short_string member or a $to_short_string() function
 * to the object to overwrite the default short string dumped 
 * 
 * @param {any} x
 * @return {string}      
 */
exports.to_short_string = to_short_string;