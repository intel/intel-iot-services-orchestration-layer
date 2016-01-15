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
import {Dispatcher} from "flux";


// Action Format
// {
//   type:          // action type
//   params: {      // the actaul params for handler
//   }
// }

export default class D {
  constructor() {
    this.dispatcher = new Dispatcher();
  }

  // each handler takes an object (i.e. the params from action) as input
  register_action_handler(f) {
    $hope.check(_.isFunction(f), "Dispatcher", "Handler should be a function");
    this.dispatcher.register(f);
  }


  //
  // {
  //    "action_type_1": its_handler_function,
  //    "action_type_2": its_handler_function
  // }
  //
  register_action_handler_map(map) {
    // normalize the map
    var m = {};
    _.forOwn(map, (f, k) => {
      if (_.isFunction(f)) {
        m[k] = f;
      }
    });
    this.register_action_handler(action => {
      if (m[action.type]) {
        m[action.type].call({}, action.params);
      }
    });
  }

  dispatch() {
    this.dispatcher.dispatch.apply(this.dispatcher, arguments);
  };
}
