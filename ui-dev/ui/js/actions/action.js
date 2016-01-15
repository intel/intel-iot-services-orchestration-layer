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
export default function Actions(dispatcher) {
  this.dispatcher = dispatcher;
  this.actions = {}; 
}

// If a null function is provided, it would create a default function for it
// User may provide a function to provide customized behavior
// the provided function should has signature like
//  function(dispatcher, params) {...}
// and the user decide how to invoke dispatcher
Actions.prototype.register = function(type, f) {
  $hope.check_warn(!this.actions[type], "Action", type, "would be overwritten!");
  if (!_.isFunction(f)) {
    f = function(dispatcher, params) {
      dispatcher.dispatch({
        type: type,
        params: params
      });
    };
  }
  this.actions[type] = f;
};


// register multiple actions in one batch
Actions.prototype.register_map = function(map) {
  _.forOwn(map, (f, type) => {
    this.register(type, f);
  });
};

Actions.prototype.act = function(type, params) {
  $hope.check_warn(this.actions[type], "Action", type, "not registered");
  $hope.log("Action", type, params);
  return {
    $promise: $Q(this.actions[type].call({}, this.dispatcher, params))
  };

};

