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
var log = B.log.for_category("heartbeat");
var P = require("hope-hub-center-shared").protocol;

var HeartBeatServer =
/**
 * HeartBeat Server
 * @param  {Object} config {
 *  store: ...,           // a store for info of heartbeat only
 *                        // put it in a seperated store other than em 
 *                        // as these are very volatile info.
 *  
 *  check_interval: ...   // how frequently to check whether hub is dropped
 *
 *  drop_threshold: ...   // consider a hub as dropped if hasn't received update
 *                        // for such long
 *  
 * }
 * @return {HeartBeatServer}       
 */
module.exports = function(center, config) {
  this.center = center;
  config = config || {};
  B.check(_.isObject(config.store), "heartbeat", "Need a store for heartbeat server"); 
  this.store = config.store;
  this.check_interval = config.check_interval || 1000 * 60 * 2;
  this.drop_threshold = config.drop_threshold || 3 * this.check_interval + 1;
  this.check_timer = null;
  this.check_func = this.check.bind(this);
};

HeartBeatServer.prototype.enable = function() {
  var self = this;
  if (!this.check_timer) {
    log("enabled");
    this.check_timer = setInterval(this.check_func, this.check_interval);
    this.center.mnode.subscribe_all$(P.HEARTBEAT, function(hb) {
      self.heard_from_hub$(hb).done();
    });
  }
};

HeartBeatServer.prototype.disable = function() {
  if (this.check_timer) {
    log("disabled");
    clearInterval(this.check_timer);
    this.center.mnode.unsubscribe_all$(P.HEARTBEAT);
    this.check_timer = null;
  }
};

// item in store contains {
//   id: the hub id
//   timestamp: last time it gets heatbeat akin
// }

HeartBeatServer.prototype.check = function() {
  var self = this;
  var time = Date.now();
  this.store.list$().then(function(ids) {
    return self.store.batch_get$(ids).then(function(items) {
      items.forEach(function(item) {
        if (time - item.timestamp > self.drop_threshold) {
          log.warn("LEAVE", item.id);
          self.center.force_hub_leave(item.id);
          self.leave$(item.id);
        }
      });
    });
  }).catch(function(err) {
    log.error("check", err);
  }).done();
};

// hb in format of {
//   id: the hub id
//   em_timestamp: the timestamp of hub and it's an array (i.e. hrtime)
//   mnode_id
// }
HeartBeatServer.prototype.heard_from_hub$ = function(hb) {
  log("heard from hub", hb);
  var self = this;
  return self.center.em.hub_store.get$(hb.id)
  .then(function(hub) {
    if (_.isUndefined(hub)) {
      log("hub not exist before", hb);
      return self.center.mnode.send$(hb.mnode_id, P.NEED_EM_FULLINFO, self.center.get_info());
    }
    else if (timestamp_match(hb.em_timestamp, hub.timestamp)) {
      log("hearbeat match", hb);
      return self.beat$(hb.id);
    }
    else if (timestamp_ahead(hb.em_timestamp, hub.timestamp)) {
      log("hearbeat ahead", hb);
      return self.center.mnode.send$(hb.mnode_id, P.NEED_EM_FULLINFO, self.center.get_info())
      .then(function() {
        return self.beat$(hb.id);
      });
    }
    else if (timestamp_old(hb.em_timestamp, hub.timestamp)) {
      log("hearbeat old, ignore", hb);
      return;
    }
    else {
      B.check(false, "heartbeat", "should not run here"); 
    }
  });
};

HeartBeatServer.prototype.beat$ = function(hub_id) {
  log("beat", hub_id);
  var time = Date.now();
  var self = this;
  return this.store.make_lock(hub_id).lock_as_promise$(function() {
    return self.store.set$(hub_id, {
      id: hub_id,
      timestamp: time
    });
  });
};

HeartBeatServer.prototype.leave$ = function(hub_id) {
  var self = this;
  return this.store.make_lock(hub_id).lock_as_promise$(function() {
    return self.store.delete$(hub_id);
  });

};

function timestamp_match(comming, existing) {
  return B.time.compare_hrtime(comming.now, existing.now) === 0 &&
         B.time.compare_hrtime(comming.last, existing.last) === 0;
}

function timestamp_ahead(comming, existing) {
  return B.time.compare_hrtime(comming.now, existing.now) === 1;
}

function timestamp_old(comming, existing) {
  return B.time.compare_hrtime(comming.now, existing.now) === -1;
}