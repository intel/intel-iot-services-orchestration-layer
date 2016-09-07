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
var S = require("../index.js");
var assert = require("assert");
var _ = require("lodash");
var chai = require("chai");
var fs = require("fs");
chai.should();


function key_subset(small, big) {
  if (small.length > big.length) {
    return false;
  }

  var small_array = _.map(small, function(x) { return x.toString();});
  var big_array = _.map(big, function(x) { return x.toString();});

  var rc = true;
  _.forEach(small_array, function(x) {
    if (!_.includes(big_array, x)) {
      rc = false;
      return false;
    }
  });
  return rc;
}



describe("store_file_basic>>", function() {
  var s;
  before("create the store", function(d) {
    S.create_store$("file", {path: "./test_file_store.json"}).then(function(obj) {
      s = obj;
      d();
    }).done();
  });

  after(function() {
    fs.unlink("./test_file_store.json");
  });


  //test StoreFile.set$()
  var key_correct = [1, "b", "a", 4], value_correct = ["value1", "value2", "value3", "sss"];
  var key_incorrect = [[], {}, null], value_incorrect = ["a", "b", "c"];

  it("set with valid key", function(d) {
    var i;
    var count = 0;
    for (i = 0; i < key_correct.length; i++) {
      (function(index) { 
        s.set$(key_correct[index], value_correct[index]).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, value_correct[index]), true);
          if (count === key_correct.length) {
            d();
          }
        }).done();
      })(i);
    }
  });



  it("set with invalid key", function(d) {
    var i;
    var count = 0;
    for (i = 0; i < key_incorrect.length; i++) {
        (function(index) {
              s.set$(key_incorrect[index], value_incorrect[index]).catch(function(err) {
              count++;
              assert.equal(err, "invalid key");
              if (count === key_incorrect.length) {
                d();
              }
            }).done();
        })(i);  
    }
  });


//test StoreFile.list$()

var list_length = 2;
var list_length_incorrect = null;
it("list with valid key", function(d) {

  var length = list_length;

  if (list_length > key_correct.length) {
    length = key_correct.length; 
  }
  s.list$(list_length).then(function(v) {
    if (length === 0) {
      assert(_.isArray(v), true) && assert(_.isEmpty(v), true);
    }
    else {
      assert(key_subset(v, key_correct));
    }
    d();
  }).done();
});

it("list with invalid key", function(d) {
  //var key_correct_obj = {};

  s.list$(list_length_incorrect).then(function(v) {
    assert(key_subset(v, key_correct));
    d();
  }).done();
});


//test StoreFile.size$()
 it("size with valid key", function(d) {
    s.size$().then(function(size) {
      assert.equal(size, key_correct.length);
      d();
    }).done(); 
});


//test  StoreFile.get$()
var get_key = [];
var get_value = [];

it("get with valid key", function(d) {
  get_key = key_correct.concat("", "notexist");
  get_value = value_correct.concat(undefined, undefined);

  var count = 0;
  var i;
  for (i = 0; i < get_key.length; i++) {
    (function(index) {
      s.get$(get_key[index]).then(function(v) {
        count++;
        assert.equal(_.isEqual(v, get_value[index]), true);
        if (count === key_correct.length) { 
          d();
        }
      }).done();
    })(i);
  }
});


var get_key_incorrect = [];

it("get with invalid key", function(d) {
  get_key_incorrect = [null, {}];

  var i;
  var count = 0;
  for (i = 0; i < get_key_incorrect.length; i++) {
    (function(index) {
      s.get$(get_key_incorrect[index]).catch(function(e) {
        count++;
        assert.equal(e, "invalid key");
        if (count === get_key_incorrect.length)
          d();
      }).done();
    })(i);
  }
});


//test  StoreFile.has$()
var has_key = [];
var has_key_incorrect = [];

it("has with invalid key", function(d) {
  has_key = key_correct.concat("*", "null");
  has_key_incorrect = [null, {}];

  var i;
  var count = 0;
  for (i = 0; i < has_key.length; i++) {
    (function(index) {
      s.has$(has_key[index]).then(function(b) {
        count++;
        if (index < key_correct.length) {
          assert.equal(b, true);
        }
        else {
          assert.equal(b, false);
        }
        if (count === has_key.length) 
          d();
      }).done();
    })(i);
  }
});


it("has with invalid key", function(d) {
  var i;
  var count = 0;
  for (i = 0; i < has_key_incorrect.length; i++) {
    (function(index) {
      s.has$(has_key_incorrect[index]).catch(function(e) {
        count++;
        assert.equal(e, "invalid key");
        if (count === has_key_incorrect.length)
          d();
      }).done();
    })(i);
  }
});


//test StoreFile.delete$()
var del_key = ["a", "abc"];
var del_key_incorrect = [null, {}];


it("delete with valid key", function(d) {
  var i;
  var count = 0;
  for (i = 0; i < del_key.length; i++) {
    (function(index) {
      s.delete$(del_key[index]).then(function(v) {
        count++;
        assert.equal(v, del_key[index]);
        s.get$(del_key[index]).then(function(v1) {
          assert.equal(_.isEqual(v1, undefined), true);
        });
        if (count === del_key.length)
          d();
      }).done();
    })(i);
  } 
});


it("delete with invalid key", function(d) {
  var i;
  var count = 0;
  for (i = 0; i < del_key_incorrect.length; i++) {
    (function(index) {
      s.delete$(del_key_incorrect[index]).catch(function(e) {
        count++;
        assert.equal(e, "invalid key");
        if (count === del_key_incorrect.length)
          d();
      }).done();
    })(i);
  }
});

//test  StoreFile.size$()
//count the amount of the elements will be deleted 
var del_count = 0;

 it("size with invalid key", function(d) {
    for (var i = 0; i < del_key.length; i++) {
      if (key_correct.indexOf(del_key[i]) !== -1) {
        del_count++;
      }
    }

    s.size$().then(function(size) {
      assert.equal(size, key_correct.length - del_count);
      d();
    }).done(); 
});
});


describe("store_file_batch>>", function() {
  var s;
  before("create the store", function(d) {
    S.create_store$("file", {path:"./test_file_store_batch.json"}).then(function(obj) {
      s = obj;
      d();
    }).done();
  });

  after(function() {
    fs.unlink("./test_file_store_batch.json");
  });

  //test StoreFile.batch_set$()
  var  batch_pair = [["a", "value1"], ["b", "value2"], [2, {}]];
  var batch_pair_incorrect = [["s", {}], ["ss", "vv"], [undefined, "b"]];

  it("batch_set with valid key", function(d) {
   
    
    s.batch_set$(batch_pair).then(function(v) {
      assert.equal(_.isEqual(v, batch_pair), true);
      batch_pair.forEach(function(pair) {
        s.get$(pair[0]).then(function(v1) {
          assert.equal(_.isEqual(v1, pair[1]), true);
        });
        
      });
      d();
    }).done();
  });

  it("batch_set with invalid key", function(d) {
    

    var finished_count = 0;
    s.batch_set$(batch_pair_incorrect).catch(function(e) {
      assert.equal(e.message, "invalid key");
      for (var i = 0; i < batch_pair_incorrect.length; i++) {
        var batch = batch_pair_incorrect[i];
        var pp = e["original_args"][i];

        assert.equal(_.isEqual(batch[0], pp[0]), true) && assert.equal(_.isEqual(batch[1], pp[1]), true);
        
      }

      for (var j = 0; j < batch_pair_incorrect.length; j++) {
        if (_.isNumber(batch_pair_incorrect[j][0]) || _.isString(batch_pair_incorrect[j][0])) {
          finished_count++;
          assert.equal(_.isEqual(e["finished_args"][j][0], batch_pair_incorrect[j][0]), true) && assert.equal(_.isEuqal(e["finished_args"][j][1], batch_pair_incorrect[j][1]), true);
        }
      }
      assert.equal(_.isEqual(e["finished_args"].length, finished_count), true);
      d();
    }).done();
  });
  
  //test StoreFile.batch_get$()
  var get_key = [];
  var get_value = [];
  var get_key_incorrect = [];


  it("batch_get with valid key", function(d) {
    get_key = [""];
    get_value = [undefined];
    

    batch_pair.forEach(function(pair) {
      get_key.push(pair[0]);
      get_value.push(pair[1]);
    });


    s.batch_get$(get_key).then(function(v) {
      for (var i = 0; i < v.length; i++) {
        assert.equal(_.isEqual(v[i], get_value[i]), true);
      }
      d();
    }).done();
  });



  it("batch_get with invalid key", function(d) {
    get_key_incorrect = [null, {}];

    s.batch_get$(get_key_incorrect).then(function(v) {
      for (var i = 0; i < v.length; i++) {
        assert.equal(v[i], undefined);
      }
      d();
    }).done();
  });


  //test StoreFile.batch_has$()
  var has_key = [];
  var has_value = [];
  var has_key_incorrect = [];
  var has_value_incorrect = [];


  it("batch has with invalid key", function(d) {
    has_key = ["*"];
    has_value = [false];
    has_key_incorrect = [null, undefined];
    has_value_incorrect = [undefined, undefined];

    batch_pair.forEach(function(pair) {
     has_key.push(pair[0]);
    });

    batch_pair.forEach(function(pair) {
     if (_.isUndefined(pair[1])) {
       has_value.push(false);
     }
     else {
      has_value.push(true);
     }
    });

    s.batch_has$(has_key).then(function(v) {
      for (var i = 0; i < v.length; i++) {
        assert.equal(_.isEqual(v[i], has_value[i]), true);
      }
      d();
    }).done();
  });



  it("batch_has with invalid key", function(d) {
    s.batch_has$(has_key_incorrect).then(function(v) {
      for (var i = 0; i < v.length; i++) {
        assert.equal(v[i], has_value_incorrect[i]);
      } 
      d();
    }).done();
  });


  //test StoreFile.batch_delete$()
  var del_key = [];
  var del_key_incorrect = [];

  it("batch_delete with invalid key", function(d) {
    del_key = ["a", "", "*", null];
    del_key_incorrect = [null, undefined, {}];

    s.batch_delete$(del_key).then(function(v) {
      for (var i = 0; i < v.length; i++) {
        assert.equal(_.isEqual(v[i], del_key[i]), true);
      }
      for (var j = 0; j < del_key.length; j++) {
        s.get$(del_key[j]).then(function(v1) {
          assert.equal(_.isEqual(v1, undefined), true);
        });
      }
      d();
    }).done();
  });


  it("batch_delete should be key_incorrect", function(d) {
    s.batch_delete$(del_key_incorrect).then(function(v) {
      assert.equal(_.isEqual(v, []), true);
      d();
    }).done();
  });

});

