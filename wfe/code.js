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
 * @file Workflow operators and operands definition
 *
 * @module code
 * @name code.js
 * @author Tianyou Li <tianyou.li@gmail.com>
 * @license Intel
 */


var _        = require("underscore");
var BitArray = require("bit-array");

var Queue    = require("./queue");
var checker  = require("./check");

/**
 * Base class for the workflow operator and operand
 *
 * @class class OpBase
 * @abstract
 * @param {string} wid workflow id
 * @param {string} sid self id, the value of self id is context
 *                     dependent, for example inport self id is
 *                     the port name, but operator self id is the
 *                     operator name
 */
function OpBase(wid, sid) {
  /**
   * workflow id, should be a string
   * @member
   * @readonly
   */
  this.wid = wid;

  /**
   * self id: indicate the internal id
   * @member
   * @readonly
   */
  this.sid = sid;

  /**
   * indicate the port is enabled or not
   * @member
   * @readonly
   */
  this.enabled = false;

  /**
   * indicate the port is installed or not
   * @member
   * @readonly
   */
  this.installed = false;

  // parent op
  this.parent = null;

  // child ops
  this.children = {};
}


/**
 * Enable the operator. The operator could be enabled without (un)installation.
 * @member
 * @function
 */
OpBase.prototype.enable = function () {
  this.enabled = true;
  _.each(this.children, function (child) { child.enable(); });
};


/**
 * Disable the operator. The operator could be disabled without (un)installation.
 * @member
 * @function
 */
OpBase.prototype.disable = function () {
  this.enabled = false;
  _.each(this.children, function (child) { child.disable(); });
};


/**
 * Unique identifier for operator or operands
 * @member
 * @function
 */
OpBase.prototype.id = function () {
  checker.check_not_empty("OpBase<workflow id>", this.wid);
  checker.check_not_empty("OpBase<self id>", this.sid);

  return String(this.wid) + "-" + String(this.sid);
};


/**
 * Completely perform the preparation/initialization for the operator/operand
 * @member
 * @function
 */
OpBase.prototype.install = function () {
  if (!this.installed) {
    _.each(this.children, function (child) { child.install(); });
  }

  this.installed = true;
};


/**
 * Revert the preparation/initialization for operator/operand
 * @member
 * @function
 */
OpBase.prototype.uninstall = function () {
  if (this.installed) {
    _.each(this.children, function (child) { child.uninstall(); });
  }
  this.installed = false;
};


/**
 * Set current operator/operand's parent. If current operator
 * has already had a parent, remove it from that parent's child
 * list.
 *
 * @member
 * @function
 * @param {OpBase} parent the parent opcode should be set
 */
OpBase.prototype.setParent = function (parent) {
  checker.check_not_empty("OpBase<parent>", parent);

  if (this.parent === parent) {
    return;
  }
  if (this.parent !== null) {
    this.parent.removeChild(this);
  }

  parent.addChild(this);
};


/**
 * Add child operator/operand to current operator
 * @member
 * @function
 * @param {OpBase} child the child opcode should be added
 */
OpBase.prototype.addChild = function (child) {
  checker.check_not_empty("Opbase<add_child>", child);
  child.parent = this;

  var op = this.children[child.id()];
  checker.check_should_empty("OpBase<find_child>", op);

  this.children[child.id()] = child;
};


/**
 * Remove child a operator/operand from current operator
 * @member
 * @function
 * @param {OpBase} child the child opcode should be removed
 */
OpBase.prototype.removeChild = function (child) {
  checker.check_not_empty("OpBase<remove_child>", child);

  if (child.parent !== this) {
    checker.check_should_empty("OpBase<remove_child.parent>", child.parent);
  }

  var op = this.children[child.id()];
  checker.check_not_empty("OpBase<remove_child.child>", op);

  child.parent = null;
  delete this.children[child.id()];
};

OpBase.prototype.print = function (fstream) {
  this.printIndent(fstream);
  fstream.write("OpBase\n");
};

OpBase.prototype.depth = function () {
  var self = this;
  var result = 0;
  while (self.parent !== null && self.parent !== undefined) {
    result += 1;
    self = self.parent;
  }

  return result;
};

OpBase.prototype.printIndent = function (fstream) {
  var indent = this.depth(),
    i;
  for (i = 0; i < indent; i++) {
    fstream.write("  ");
  }

  var index = "";
  if (this.index !== undefined) {
    index = this.index + " ";
  }
  fstream.write(index);
};



/**
 * Operator class corresponding to the node of graph generated from
 * frontend UI. The operator class instance could have inport and
 * outport which represent the concepts of frontend graph.
 *
 * @class class Operator
 * @extends OpBase
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 * @param {object} processor the real processor that execute
 *                           the designate logic. Usually, it
 *                           will be an instance of Component-
 *                           Processor.
 */
function Operator(wid, sid, processor, isOrigin) {
  OpBase.apply(this, arguments);

  checker.check_not_empty("Operator<constructor>", processor);

  processor.operator = this;
  this.operate = processor;
  this.inport = null;
  this.outports = [];
  this.isInitialRequestSent = false;
  this.isOrigin = isOrigin;
}
Operator.prototype = new OpBase();
Operator.prototype.constructor = Operator;

Operator.prototype.install = function () {
  var self = this;
  if (self.installed) {
    return;
  }

  return self.operate.install().then(function () {
    _.each(self.children, function(child) {
      child.install();
    });

    self.installed = true;
  });
};

Operator.prototype.uninstall = function () {
  var self = this;
  if (!self.installed) {
    return;
  }

  return self.operate.uninstall().then(function () {
    _.each(self.children, function (child) {
      child.uninstall();
    });

    self.installed = false;
  });
};

Operator.prototype.enable = function () {
  var self = this;
  return self.operate.enable().then(function () {
    OpBase.prototype.enable.apply(self, arguments);
  });
};

Operator.prototype.disable = function () {
  var self = this;
  return self.operate.disable().then(function () {
    OpBase.prototype.disable.apply(self, arguments);
  });
};

Operator.prototype.kickoff = function () {
  this.operate.kickoff();
};

Operator.prototype.trigger = function () {
  // find the 'starting point' and invoke the kernel function
  var request = this.composeInitialRequest();
  this.operate.in_handler(request);
};

Operator.prototype.composeInitialRequest = function () {
  var self = this;
  var request = {
        meta: {
          tags:{}
        },
        payload: {
          IN: {}
        }
      };
  if(this.inport){
    _.each( self.inport.children, function(inport){
        request.payload.IN[inport.sid] = inport.default;
    });
  }

  return request;
};

Operator.prototype.print = function (fstream) {
  this.printIndent(fstream);

  fstream.write("Operator " + this.id() + "\n");

  if (this.inport !== null) {
    this.inport.print(fstream);
  }
  _.each(this.outports, function (port) {
    port.print(fstream);
  });
};




/**
 * Port class as base class for inport/outport class which corres-
 * ponding to the in/outport of graph generated from frontend UI.
 *
 * @class class Port
 * @extends OpBase
 * @abstract
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 * @param {object} evtbs the event bus object the port will be
 *                           used.
 */
function Port(wid, sid, evtbs) {
  OpBase.apply(this, arguments);
  /**
   * event bus: the event bus which this port should use
   * @member
   */
  this.evtbs = evtbs;
}
Port.prototype = new OpBase();
Port.prototype.constructor = Port;




/**
 * Inport class served as class for ordinary inport, base class for
 * merged inport and choice inport class which corresponding to the
 * logical structure of node's inport configuration.
 *
 * @class class Inport
 * @extends Port
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 * @param {object} evtbs event bus object the port will be
 *                           used.
 * @param {object} operator the instance of Operator referenced by this inport
 */
function Inport(wid, sid, evtbs, operator, config) {
  Port.apply(this, arguments);
  /**
   * operator instance referenced by this inport object
   * @member
   * @private
   */
  this.operator = operator;

  /**
   * queue for holding the message passed from under layer.
   * @member
   * @private
   */
  this.queue = new Queue();

  config = config || {};
  this.config = config;

  this.default = config.default;
  this.is_buffered = config.buffered;

}
Inport.prototype = new Port();
Inport.prototype.constructor = Inport;

/**
 * Enqueue message into inport, the ownership transfered to Inport, the content
 * of the message could be changes. Caller need to snapshot the message if intend
 * to preserve the original information
 * @member
 * @function
 * @param {object} message message to be enqueued
 */
Inport.prototype.enqueue = function (message) {
  if (!this.is_buffered) {
    this.queue.dequeue();
  }
  this.queue.enqueue(message);
};

/**
 * Dequeue the message from inport, the ownership will be transfered from inport
 * to the caller. Inport will remove the message from queue.
 * @member
 * @function
 * @returns the message dequeued
 */
Inport.prototype.dequeue = function () {
  if (!this.is_buffered) {
    return this.queue.eleAt(0);
  } else {
    return this.queue.dequeue();
  }
};

Inport.prototype.eleAt = function (index) {
  return this.queue.eleAt(index);
};

Inport.prototype.getAt = function (index) {
  return this.queue.getAt(index);
};

Inport.prototype.queueLength = function() {
  return this.queue.length();
};


/**
 * MergeInport class merge multiple inports' output into one output message.
 * MergeInport can composite ordinary Inport, ChoiceInport and MergeInport.
 * Once each of its composited ports get ready with input message, MergeInport
 * will be able to issue a message for upper level.
 *
 * @class class MergeInport
 * @extends InPort
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 * @param {object} evtbs event bus object the port will be
 *                           used.
 * @param {object} operator the instance of Operator referenced by this inport
 */
function MergeInport() {
  Inport.apply(this, arguments);
  // bitset for merge result
  this.bitset = null;
  this.tags = [];
}
MergeInport.prototype = new Inport();
MergeInport.prototype.constructor = MergeInport;

MergeInport.prototype.install = function () {
  if (this.installed) {
    return;
  }

  checker.check_not_empty("Merge<install.operator>", this.operator);

  // create a operator wrapper that collect required
  // information and trigger operator
  var self = this;
  var wrapped = new Operator(self.operator.wid, self.operator.sid,
                             self.operator.operate.clone());
  wrapped.operate.in_handler = function (message) {
    //console.log("At " + message.meta.pid + " of " + this.operator.sid + ",coming a message:");
    //console.log(JSON.stringify(message, 4));
    self.enqueue(message);
    // get result ready message
    var ready = self.dequeue(message);
    if (ready !== null) {
      self.operator.operate.in_handler(ready);
    }
  };

  // install the wrapped operator into each child
  // set index for it's child
  var index = 0;
  _.each(self.children, function (child) {
    child.index = index;
    child.operator = wrapped;
    child.install();
    index++;
  });

  // bitset for merge result;
  self.bitset = new BitArray(_.size(this.children), 0);

  self.installed = true;
};

MergeInport.prototype.uninstall = function () {
  if (!this.installed) {
    return;
  }

  var self = this;
  _.each(self.children, function (child) {
    child.operator = self.operator;
    child.uninstall();
  });

  this.bitset = null;
  this.installed = false;
};

MergeInport.prototype.enqueue = function (message) {
  var self = this;
  var flag = _.every(self.tags, function(tag){
    return _.indexOf(Object.keys( message.meta.tags ), tag.name) > -1;
  });
  if ( !flag ){
    console.log("Get out");
    return -1;
  }
  var inport = _.find(self.children, function(child) {
    return true &&
    // wid id should be the same
    child.wid === message.meta.wid &&
    // component id should be the same
    child.operator.sid === message.meta.cid &&
    // port id should be the same;
    child.sid === message.meta.pid && true;
  });
  checker.check_not_empty("Merge<process.inport>", inport);
  Inport.prototype.enqueue.call(inport,message);

  checker.check_not_empty("Merge<inport>.index", inport.index);
  self.bitset.set(inport.index, true);
  //console.log("Come in");
};

MergeInport.prototype.dequeue = function (message) {
  var self = this;
  var result = null;
  var total = Object.keys(self.children).length;
  if (self.bitset.count() !== total) {
    console.log("No enough message");
    return result;
  }

  // TODO: currently we ignore tags, passive etc
  result = {};
  result.payload = {
    IN:{}
  };
  result.meta = {};
  result.ports = [];

  var inport = _.find(self.children, function(child) {
    return true &&
    // wid id should be the same
    child.wid === message.meta.wid &&
    // component id should be the same
    child.operator.sid === message.meta.cid &&
    // port id should be the same;
    child.sid === message.meta.pid && true;
  });
  var keymsg = [];
  var all = _.every(self.children,function(child){
    if( child.index === inport.index ){
      keymsg[child.index] =  child.queueLength() - 1;
      return true;
    }
    else{
      for( var i = 0; i < child.queueLength(); i++ ){
        var msg = child.eleAt(i);
        var flag = self.tags.every(function(tag){
          return msg.meta.tags[tag.name] === message.meta.tags[tag.name];
        });
        if( flag ){
          keymsg[child.index] = i;  // record the position of the right msg
          return true;
        }
      }
      return false;
    }
  });
  if( !all ){
    console.log("No match message");
    return null;
  }
  _.each(self.children, function(child){
      var msg = child.getAt(keymsg[child.index]);
      if( !child.queueLength() ){
        self.bitset.set(child.index, false);
      }
      _.extend(result.payload.IN, msg.payload.IN);
      _.extend(result.meta, msg.meta);
      result.ports.push(msg.meta.pid);
  });

  // change the port id to self's id, so upper level could be used
  if (result !== null) {
    result.meta.pid = self.sid;
  }
  //console.log("Dequeue a message:");
  //console.log(JSON.stringify(result,4));
  return result;
};

MergeInport.prototype.addTag = function (type, name) {
  var flag =  _.every(this.tags,function(tag){
    return tag.name !== name;
  });
  if( !flag ){
    return -1;
  }
  var operator = this.parent;
  var cid = operator.sid;
  var port = this.sid;
  var tag = new Tag(cid, port, type, name);
  this.tags.push(tag);
};

MergeInport.prototype.print = function(fstream) {
  var self = this;
  self.printIndent(fstream);

  fstream.write("Merge " + self.id() + "\n");
  _.each(self.children, function(op) {
    op.print(fstream);
  });
};



/**
 * ChoiceInport class will issue a message once *one* of its child get
 * ready input message. ChoiceInport can composite any kind of inports
 * includes Inport, MergeInport, and ChoiceInport.
 *
 * @class class ChoiceInport
 * @extends InPort
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 * @param {object} evtbs event bus object the port will be
 *                           used.
 * @param {object} operator the instance of Operator referenced by this inport
 */
function ChoiceInport() {
  Inport.apply(this, arguments);
}
ChoiceInport.prototype = new Inport();
ChoiceInport.prototype.constructor = ChoiceInport;

ChoiceInport.prototype.install = function() {
  if (this.installed) {
    return;
  }

  checker.check_not_empty("Merge<install.operator>", this.operator);


  // create a operator wrapper that collect required
  // information and trigger operator
  var self = this;
  var wrapped = new Operator(self.operator.wid, self.operator.sid,
                             self.operator.operate.clone());
  wrapped.operate.in_handler = function (message) {
    //console.log("At " + message.meta.pid + " of " + this.operator.sid + ",coming a message:");
    //console.log(JSON.stringify(message, 4));
    self.enqueue(message);
    // get result ready message
    var ready = self.dequeue(message);
    if (ready !== null) {
      self.operator.operate.in_handler(ready);
    }
  };

  // install the wrapped operator into each child
  // set index for it's child
  var index = 0;
  _.each(self.children, function (child) {
    child.index = index;
    child.operator = wrapped;
    child.install();
    index++;
  });


  this.installed = true;

};

ChoiceInport.prototype.uninstall = function() {
  if (!this.installed) {
    return;
  }

  var self = this;
  _.each(self.children, function(child) {
    child.operator = self.operator;
    child.uninstall();
  });

  this.installed = false;
};


ChoiceInport.prototype.enqueue = function (message) {
  var self = this;
  var flag = _.every(self.tags, function(tag){
    return _.indexOf(Object.keys( message.meta.tags ), tag.name) > -1;
  });
  if ( !flag ){
    console.log("Get out");
    return -1;
  }
  var inport = _.find(self.children, function(child) {
    return true &&
    // wid id should be the same
    child.wid === message.meta.wid &&
    // component id should be the same
    child.operator.sid === message.meta.cid &&
    // port id should be the same;
    child.sid === message.meta.pid && true;
  });
  checker.check_not_empty("Choice<process.inport>", inport);
  Inport.prototype.enqueue.call(inport,message);

};

// TODO handle tags
ChoiceInport.prototype.dequeue = function (message) {
  var result = {
    meta: {
      pid: this.sid
    },
    payload: {
      IN: {}
    },
    ports: []
  };
  result.ports = [];

  _.each(this.children, function(child) {
    var msg = child.dequeue() || {};
    msg.meta = msg.meta || {};
    msg.payload = msg.payload || {};
    msg.payload.IN = msg.payload.IN || {};
    _.extend(result.payload.IN, msg.payload.IN);
    _.extend(result.meta, msg.meta);
    if (msg.meta.pid) {
      result.ports.push(msg.meta.pid);    
    }
  });

  //console.log("Dequeue a message:");
  //console.log(JSON.stringify(result,4));
  return result;

};


ChoiceInport.prototype.print = function(fstream) {
  this.printIndent(fstream);

  fstream.write("Choice \n");
  _.each(this.children, function(op) {
    op.print(fstream);
  });
};


Inport.prototype.install = function () {
  if (this.installed) {
    return;
  }

  if (!(this instanceof MergeInport) && !(this instanceof ChoiceInport)) {
    var id = this.id();
    var subscription = this.evtbs.getSubscription(id);
    checker.check_should_empty("subscription " + id, subscription);

    var self = this;
    this.evtbs.subscribe(id, function(event) {
      if (self.enabled) {
        self.operator.operate.in_handler(event);
      }
    });

    // add the default into cached port
    if (!this.is_buffered) {
      var _in = {};
      _in[this.sid] = this.default;
      this.queue.enqueue({
        meta: {},
        payload: {
          IN: _in
        }
      });
    }

    subscription = this.evtbs.getSubscription(id);
    checker.check_not_empty("subscription " + id, subscription);
  }

  this.installed = true;
};


Inport.prototype.uninstall = function () {
  if (!this.installed) {
    return;
  }

  if (!(this instanceof MergeInport) && !(this instanceof ChoiceInport)) {
    var id = this.id();
    var subscription = this.evtbs.getSubscription(id);
    checker.check_not_empty("subscription " + id, subscription);

    this.evtbs.unsubscribe(id);

    subscription = this.evtbs.getSubscription(id);
    checker.check_should_empty("subscription " + id, subscription);
  }

  this.installed = false;
};

Inport.prototype.id = function () {
  return this.operator.id() + "-" + this.sid;
};

Inport.prototype.print = function (fstream) {
  this.printIndent(fstream);

  fstream.write("Inport " + this.id() + "\n");
};



/**
 * Target class holds outport destination information, and filter expression.
 * Target instance can only be composited by Outport object.
 *
 * @class class Target
 * @extends OpBase
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 */
function Target () {
  OpBase.apply(this, arguments);
}
Target.prototype = new OpBase();
Target.prototype.constructor = Target;

Target.prototype.id = function () {
  var wid = this.wfid();
  var cid = this.cid();
  var sid = this.port();

  return wid + "-" + cid + "-" + sid;
};

Target.prototype.wfid = function() {
  var outport = this.parent;
  var operator = outport.parent;
  var wid = operator.wid;

  return wid;
};

Target.prototype.cid = function () {
  return this.wid;
};

Target.prototype.port = function () {
  return this.sid;
};

Target.prototype.print = function (fstream) {
  this.printIndent(fstream);
  fstream.write("Target " + this.id() + "\n");
};


/**
 * Tag class holds the tag information for the outport
 *
 * @class class Tag
 * @extends OpBase
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 * @param {string} type the tag type, usually BATCH
 * @param {string} name the tag name
 */
function Tag(wid, sid, type, name) {
  OpBase.apply(this, arguments);
  this.type = type;
  this.name = name;
}
Tag.prototype = new OpBase();
Tag.prototype.constructor = Tag;

Tag.prototype.id = function () {
  var wid = this.wfid();
  var cid = this.cid();
  var port = this.port();
  var type = this.type;
  var name = this.name;

  return wid + "-" + cid + "-" + port + "-" + type + "-" + name;
};

Tag.prototype.wfid = function() {
  var outport = this.parent;
  var operator = outport.parent;
  var wid = operator.wid;

  return wid;
};

Tag.prototype.cid = function () {
  return this.wid;
};

Tag.prototype.port = function () {
  return this.sid;
};

Tag.prototype.print = function (fstream) {
  this.printIndent(fstream);
  fstream.write("Tag " + this.id() + "\n");
};


/**
 * Outport class holds all the destination information for a output message
 * generated by an operator. Its responsibility is to send approperate message
 * or part of the message to target operator's inport.
 *
 * @class class Outport
 * @extends Port
 * @param {string} wid workflow id
 * @param {string} sid operator self id, allocated by workflow
 */
function Outport () {
  Port.apply(this, arguments);
  this.targets = [];
  this.tags = [];
}

Outport.prototype = new Port();
Outport.prototype.constructor = Outport;

/**
 * Publish message to destination ports
 * @member
 * @function
 * @param {object} message the message to be sent.
 */
Outport.prototype.publish = function (message) {
  var self = this;
  if (self.enabled) {
    var evtbs = this.evtbs;
    var value = message.payload.OUT[self.sid];
    if (value !== undefined) {
      var output = {
        meta: message.meta,
        payload: {
          IN:{}
        }
      };
      output.payload.IN[self.sid] = value;
      _.each(self.targets, function (target) {
        var msg = JSON.parse(JSON.stringify(output));
        self.updateEvent(msg, target);
        evtbs.publish(target.id(), msg);
      });
    }
  }
};

Outport.prototype.updateEvent = function (event, target) {
  var wid = target.wfid();
  var cid = target.cid();
  var port = target.port();
  var sid = this.sid;

  event.meta = event.meta || {};
  event.meta.wid = wid;
  event.meta.cid = cid;
  event.meta.pid = port;

  if( port !== sid ){
    // if port equals to sid, following codes will cause a bug.
    event.payload.IN[port] = event.payload.IN[sid];
    delete event.payload.IN[sid];
  }

};

Outport.prototype.addTarget = function (node, port) {
  var target = new Target(node, port);
  this.targets.push(target);
  target.setParent(this);
};

Outport.prototype.addTag = function (type, name) {
  var operator = this.parent;
  var cid = operator.sid;
  var port = this.sid;
  var tag = new Tag(cid, port, type, name);
  this.tags.push(tag);
  tag.setParent(this);
};

Outport.prototype.id = function () {
  var operator = this.parent;
  var wid = operator.wid;
  var cid = operator.sid;
  var sid = this.sid;

  return wid + "-" + cid + "-" + sid;
};

Outport.prototype.print = function (fstream) {
  this.printIndent(fstream);

  fstream.write("Outport " + this.id() + "\n");
  _.each(this.children, function (target) {
    target.print(fstream);
  });
};


module.exports = {
  Inport       :Inport,
  MergeInport  :MergeInport,
  ChoiceInport :ChoiceInport,
  Outport      :Outport,
  Operator     :Operator
};
