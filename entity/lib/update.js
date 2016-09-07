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
 * update Module
 * em update infos
 * @module entity/update
 */

var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/update");
var check = B.check;
var fs = require("fs");
var path = require("path");




/**
 * create a updater.
 * @param  {Object} em         
 * @param  {Array} priorities the priorities (operation orders) of entities
 *                             the default priorities is  ["spec", "specbundle",
 *                             "service", "thing", "hub", "graph", "ui", "app", ]
 * @return {Object}            the updater
 */
exports.create_updater = function(em, priorities) {
  return new Updater(em, priorities);
};


/**
 * @constructor
 * the default priorities is  ["spec", "specbundle",
   "service", "thing", "hub", "graph", "ui", "app"]
 * @param  {Object} em         
 * @param  {Array} priorities the priorities (operation orders) of entities
 */
function Updater(em, priorities) {
  this.priorities = priorities || ["spec", "specbundle",
   "service", "thing", "hub", "graph", "ui", "app"];
  this.em = em;
  check_priorities(this.priorities, this.em);
}

/**
 * set the priorities
 * @param  {Array} priorities the priorities (operation orders) of entities
 */
Updater.prototype.set_priorities = function(priorities) {
  check_priorities(priorities, this.em);
  this.priorities = priorities;
};

/**
 * get the priorities
 * @return {Array} 
 */
Updater.prototype.get_priorities = function() {
  return this.priorities;
};


/**
 * update the stores according to the list. 
 * @param  {Array} list each item is an obj
 *                      {
 *                        type: must be in the priorities
 *                        cmd: set or delete
 *                        id: id or id array
 *                        obj: obj or obj array. it is only needed in set cmd.
 *                      }
 * @return {Promise}     
 */
Updater.prototype.update$ = function(list, changed_list) {
  log("update");
  var self = this;
  return  Promise.resolve()
  .then(function() {
    check_list(list, self.priorities);
    var p = Promise.resolve();
    list.forEach(function(item) {
      check_list_item(item, self.priorities);
      p = p.then(function() {
        var store = self.em[item.type + "_store"];
        if (item.cmd === "set") {
          if (_.isArray(item.id)) {
            log("update: batch_set", item.type, item.id, item.obj);
            return store.batch_set$(_.zip(item.id, item.obj), changed_list);
          }
          else {
            log("update: set", item.type, item.id, item.obj);
            return store.set$(item.id, item.obj, changed_list);
          }
        }
        else {
          if (_.isArray(item.id)) {
            log("update: batch_delete", item.type, item.id);
            return store.batch_delete$(item.id, changed_list);
          }
          else {
            log("update: delete", item.type, item.id);
            return store.delete$(item.id, changed_list);
          }
        }
      });
    });
    return p;
  });
};

function check_list_item(item, priorities) {
    check(_.isString(item.type) && priorities.indexOf(item.type) !== -1,
      "entity/update", "the type is invalid", item.type, priorities);
    check(_.isString(item.cmd) && (item.cmd === "delete" || item.cmd === "set"),
      "entity/update", "the item is invalid", item.cmd);
}

function check_list(list, priorities) {
  check(_.isArray(list), "entity/update", "list should be array", list);
}


function check_priorities(priorities, em) {
  check(_.isArray(priorities), "entity/update", "priorities is not an array", priorities);
  priorities.forEach(function(type) {
    check(_.isString(type), "entity/update", "the type is not string", type, priorities);
    var store = type + "_store";
    check(!_.isUndefined(em[store]), "entity/update", "the store not exsits in em", store);
  });
}

/**
 * organize the list for future update
 *   a)set first, delete second
 *   b)set order: the priorities
 *   c)delete order: the reverse priorities
 *   d)if multiple same-type operations, save them in one item
 *   item: {
 *     cmd: "set" or "delete"
 *     type: "app", "hub", ...
 *     id: one or array
 *     obj: one or array
 *   } 
 * @param  {Array} list the original list
 * @return {Array}      the organized list
 */
Updater.prototype.organize_list = function(list) {
  var container = {
    "set":{},
    "delete":{}
  };
  var self = this;
  function process_item(item) {
    check(item.cmd === "delete" || item.cmd === "set", 
      "entity/update", "unknown cmd", item);
    if (_.isArray(item.id)) {
      if (item.cmd === "delete") {
        _.forEach(item.id, function(id) {
          var one_obj = {
            type: item.type,
            cmd: "delete",
            id: id
          };
          process_one_object(one_obj);
        });
      }
      else {
        _.forEach(item.id, function(id, index) {
          var one_obj = {
            type: item.type,
            cmd: "set",
            id: id,
            obj: item.obj[index]
          };
          process_one_object(one_obj);
        });
      }
    } // if(_.isArray(item.id))
    else {
      process_one_object(item);
    }
  }

  function process_one_object(item) {
    var id = item.id;
    var type = item.type;
    var cmd = item.cmd;
    container[cmd][type] = container[cmd][type] || {};
    container[cmd][type][id] = item;
  }

  function rebuild_set_list() {
    var set_list = [];
    _.forEach(self.priorities, function(type) {
      var ids = _.keys(container["set"][type]);
      if (ids.length === 0) {
        return;
      }
      else if (ids.length === 1) {
        set_list.push(container["set"][type][ids[0]]);
      }
      else {
        var item_for_batch = {
          type: type,
          cmd: "set",
          id: [],
          obj: []
        };
        ids.forEach(function(id) {
          item_for_batch.id.push(id);
          item_for_batch.obj.push(container["set"][type][id].obj);
        });
        set_list.push(item_for_batch);
      }
    });
    return set_list;
  }

  function rebuild_delete_list() {
    var delete_list = [];
    _.forEachRight(self.priorities, function(type) {
      var ids = _.keys(container["delete"][type]);
      if (ids.length === 0) {
        return;
      }
      else if (ids.length === 1) {
        delete_list.push(container["delete"][type][ids[0]]);
      }
      else {
        var item_for_batch = {
          type: type,
          cmd: "delete",
          id: []
        };
        ids.forEach(function(id) {
          item_for_batch.id.push(id);
        });
        delete_list.push(item_for_batch);
      }
    });
    return delete_list;
  }

  list.forEach(function(item) {
    process_item(item);
  });
  return rebuild_set_list().concat(rebuild_delete_list());
};



exports.get_full_info$ = function(em) {
  var list = [];
  return Promise.resolve()
  .then(function() {
    return em.spec_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.spec_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"spec",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.specbundle_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.specbundle_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"specbundle",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.service_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.service_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"service",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.thing_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.thing_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"thing",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.hub_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.hub_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"hub",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.graph_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.graph_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"graph",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.app_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.app_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"app",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return em.ui_store.list$();
  })
  .then(function(id_array) {
    if (id_array === []) {
      return;
    }
    return em.ui_store.batch_get$(id_array)
    .then(function(item_array) {
      list.push({
        type:"ui",
        cmd:"set",
        id: id_array,
        obj: item_array
      });
    });
  })
  .then(function() {
    return list;
  });
};