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
var B = require("../index");


var id = 1;

function AAA(config, ref) {
  this.id = config.id || id ++;
  this.ref = ref;
}

AAA.create = function(config, ref) {
  return new AAA(config, ref);
};

AAA.prototype.desc = function() {
  return "AAA<" + this.id + ">";
};

AAA.prototype.show = function() {
  var s = this.id;
  if (this.ref) {
    s += " [REF] " + this.ref.desc();
  }
  console.log("AAA: ", s);
};


function BBB(config, ref) {
  this.id = config.id || id ++;
  this.ref = ref;
}

BBB.create = function(config, ref) {
  return new BBB(config, ref);
};

BBB.prototype.desc = function() {
  return "BBB<" + this.id + ">";
};


BBB.prototype.show = function() {
  var s = this.id;
  if (this.ref) {
    s += " [REF] " + this.ref.desc();
  }
  console.log("BBB: ", s);
};



var assembler = B.assemble.default;

assembler.add_factories({
  "AAA": AAA.create,
  "BBB": BBB.create,
  "ASYNC": function(x) {
    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve(x);
      }, 500);
    });
  }
});

var config = {
  p1: {
    $type: "AAA",
    $params: {
      id: {
        $type: "ASYNC",
        $params: 123
      }
    },
    additional_field: 123
  },
  p2: {
    $type: "BBB",
    $params: {
      id: "$p8"      // points to p8
    }
  },
  p3: {
    p1: {
      $type: "BBB",
      $params: [{}, 
        "$p6"     // This points to inner p6
      ]
    },
    p2: ["property 2", "$p4"],  // 2nd element points to p4 which further points to p8
    p3: "inner 333",
    p4: "$p8",         // This points to the out p8
    p5: {
      pp: "$p1"          // This points to inner p1
    },
    p6: {
      $type: "AAA",
      $params: {
        id: {
          $type: "ASYNC",
          $params: 567
        }
      }
    },
    p7: "$external"   // points to external
  },
  p8: "888"
};

assembler.assemble$(config, {
  external: "This is external"
}).then(function(o) {
  o.p1.show();                    // AAA: 123
  o.p2.show();                    // BBB: 888
  o.p3.p1.show();                 // BBB: 1 [REF] AAA<567>
  console.log(o.p3.p3);           // inner 333
  console.log(o.p3.p2[1]);        // 888
  console.log(o.p3.p4);           // 888
  o.p3.p5.pp.show();              // BBB: 1 [REF] AAA<567>
  console.log(o.p3.p7);           // This is external
}).done();





