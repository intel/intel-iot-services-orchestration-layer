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

function WFError(msg, err)
{
  this.message = msg;
  this.error = err;
}

function StatusConflict()
{
  WFError.apply(this, arguments);
}
_.extend(StatusConflict.prototype, WFError.prototype);

function RequiredIsEmpty()
{
  WFError.apply(this, arguments);
}
_.extend(RequiredIsEmpty.prototype, WFError.prototype);

function RequiredIsNotEmpty()
{
  WFError.apply(this, arguments);
}
_.extend(RequiredIsNotEmpty.prototype, WFError.prototype);

module.exports = {
  check_status: function(expected, current) {
    if ( ! _.contains(expected, current)) {
      throw new StatusConflict("Expect workflow engine in status [" +
                               expected + "]" + " but current status is " +
                               current);
    }
  },

  check_not_empty: function(name, obj) {
    if ( obj === undefined || obj === null || (obj instanceof Array && obj.length === 0)) {
          throw new RequiredIsEmpty("Required object [" + name +
                                    "] should not be empty!");
    }    
  },

  check_should_empty: function(name, obj) {
    if ( obj === undefined || obj === null) {
      return;
    }  
      
    if (obj instanceof Array && obj.length === 0) {
      return;
    }

    throw new RequiredIsNotEmpty( "Required object [" + name +
                                  "] should be empty!");    
  }
};
