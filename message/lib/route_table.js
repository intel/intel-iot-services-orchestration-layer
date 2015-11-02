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
 * This stores the information of all known MNodes
 * @module message/route_table
 */



var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("message/mnode_store");

var MNode = require("./mnode");


var RouteTable =
/**
 * RouteTable stores all of the information about KNOWN message nodes 
 * Its key is the mnode_id, and it stores the information from 
 * MNode.get_route_info(), which includes all PortAddress of this MNode
 * These information would be eventually used by Router to decicde how to 
 * send/receive, pub/sub the messages between MNodes.
 * 
 * @param  {Object} store 
 * @param  {Object} config 
 */
module.exports = function(store, config) {
  config = config || {};
  B.check(_.isObject(store), "create", "Need a store");
  this.store = store;
  var self = this;
  // add all existing mnodes in the samve process
  _.forOwn(MNode.get_all_mnodes_in_this_process(), function(m) {
    self.set$(m.id, m.get_route_info()).done();
  });
  // respond to future changes
  MNode.event.on("added", function(mnode) {
    self.set$(mnode.id, mnode.get_route_info()).done();
  });
  MNode.event.on("updated", function(mnode) {
    self.set$(mnode.id, mnode.get_route_info()).done();
  });
  MNode.event.on("removed", function(mnode) {
    self.delete$(mnode.id).done();
  });
};

RouteTable.create = function(store, config) {
  return new RouteTable(store, config);
};


B.type.delegate(RouteTable, "store", ["get$", "batch_get$", "set$", "batch_set$",
  "has$", "batch_has$", "delete$", "batch_delete$", "size$", "list$"]);





