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
var EventEmitter = require("events").EventEmitter;
var checker      = require("./check");

function EventBus() {
  this.emitter = new EventEmitter();
}

EventBus.prototype.subscribe = function (id, callback) {
  var oldHandler = this.emitter.listeners(id);
  checker.check_should_empty("EventBus<subscribe>.oldhandler", oldHandler);

  this.emitter.on(id, callback);
};

EventBus.prototype.unsubscribe = function(id) {
  var oldHandler = this.emitter.listeners(id);
  checker.check_not_empty("EventBus<unsubscribe>.oldHandler", oldHandler);

  this.emitter.removeAllListeners(id);
};

EventBus.prototype.getSubscription = function(id) {
  var oldHandler = this.emitter.listeners(id);
  if (oldHandler instanceof Array && oldHandler.length > 0) {
    return oldHandler[0];
  }

  return null;
};

EventBus.prototype.publish = function(id, event) {
  this.emitter.emit(id, event);
};


module.exports = EventBus;
