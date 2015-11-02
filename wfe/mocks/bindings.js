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
var _ = require("underscore");

function Binding() {
  
}
Binding.prototype.resolve = function (context) {
  throw "Virtual interface need to be override!";
};

function StaticBinding (wid) {
  Binding.apply(this, arguments);

  this.wid = wid;
  this.mapping = {};
}
StaticBinding.prototype = new Binding();
StaticBinding.prototype.constructor = StaticBinding;

StaticBinding.prototype.addMapping = function (nid, binding) {
  this.mapping[nid] = binding;
};

StaticBinding.prototype.resolve = function (context) {
  var nid = context.cid;
  return this.mapping[nid];
};

function Bindings() {
  this.binding_list = [];
}

Bindings.prototype.addBinding = function (binding) {
  this.binding_list.push(binding);
};

Bindings.prototype.resolve = function (context) {
  var self = this;
  for (var i = 0 ; i < self.binding_list.length; i++) {
    var binding = self.binding_list[i].resolve(context);
    if (binding) {
      return binding;
    }
  }

  return null;
};


module.exports = {
  StaticBinding  : StaticBinding, 
  Bindings       : Bindings
};
