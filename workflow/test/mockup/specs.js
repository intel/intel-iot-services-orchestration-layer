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
module.exports = JSON.stringify({
  report: {
    id: "report",
    type: "spec",
    in: {
      ports: [{
        name: "interval",
        type: "int",
        default: 2000,
        buffered: false
      }]
    },
    out: {
      ports: [{
        name: "data",
        type: "int"
      }]
    }
  },
  compare: {
    id: "compare",
    type: "spec",
    in: {
      ports: [{
        name: "in1",
        type: "int",
        buffered: false
      }, {
        name: "in2",
        type: "int",
        buffered: false
      }]
    },
    out: {
      ports: [{
        name: "bool",
        type: "boolean"
      }]
    }
  },
  switch: {
    id: "switch",
    type: "spec",
    in: {
      ports: [{
        name: "on",
        type: "boolean",
        buffered: false
      }]
    },
    out: {
      ports: [{
        name: "status",
        type: "boolean"
      }]
    }
  }
});

