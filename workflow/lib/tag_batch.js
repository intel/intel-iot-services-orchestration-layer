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

module.exports = {
  is: function(tag_desc) {
    return tag_desc.type === "batch" && tag_desc.id;
  },

  new_batch_id: function() {
    return B.unique_id("HOPE/TAG_BATCH_");
  },

  /**
   * Add a tag into the tag_array which is usually part of the message
   * @param  {Object} tag_desc   describes the tag (e.g. id)
   * @param  {Array} tag_array The array contains a lits of tags
   * @param  {String} batch_id   represents a specific batch. Auto generate one 
   *                             if nothing passed in
   */
  attach_to_tag_array: function(tag_desc, tag_array, batch_id) {
    B.check(this.is(tag_desc), "workflow/tag", "Not a batch tag description", tag_desc);
    B.check(_.isArray(tag_array), "workflow/tag", 
      "Not a tag_array to attach batch tag", tag_array);
    batch_id = batch_id || this.new_batch_id();
    tag_array.push({
      id: tag_desc.id,
      type: "batch",
      data: {
        batch_id: batch_id
      }
    });
  },

  /**
   * Verify whether a tag_array matches the specific tag description
   * e.g. contains a tag in array that has the id required by the tag_desc
   * @param  {Object} tag_desc   
   * @param  {Array} tag_array 
   * @return {Boolean}            
   */
  validate_tag_array: function(tag_desc, tag_array) {
    var batch_found = false;
    _.forEach(tag_array, function(t) {
      if (_.isObject(t) && t.id === tag_desc.id) {
        batch_found = true; // OR, found if any tag in msg matches
      }
      return false; // exit forEach early
    });
    return batch_found;
  },

  /**
   * This is used for prepare of node during DFS search
   * The context is basically an array which contains batch_id that are still
   * available (i.e. indluced by all messages in search path). This function
   * would try to filter the context with tag_array and return a new context by
   * removing all batch ids not in this tag_array
   * And if it is empty after filtering, then return null to indicate that the 
   * valdate failed
   * @param  {Array} tag_array normally tags of a message
   * @param  {Array} context   
   * @return {Array}           null if failed, otherwise the new context
   */
  validate_tag_array_with_context: function(tag_array, tag_id, context) {
    var result = [];
    // no restrictions at all, so simply collect all batch_ids
    if (!context) { 
      _.forEach(tag_array, function(t) {
        if (_.isObject(t) && t.id === tag_id && _.isObject(t.data) && 
          t.data.batch_id) {
          result.push(t.data.batch_id);
        }
      });
    } else { // already has restrictions
      _.forEach(context, function(b) {
        _.forEach(tag_array, function(t) {
          if (_.isObject(t) && t.id === tag_id &&
            _.isObject(t.data) && t.data.batch_id === b) {
            result.push(b);
          }
        });
      }); 
    }
    return result.length ? result : null;
  }
};

