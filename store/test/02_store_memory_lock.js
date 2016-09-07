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
var assert = require("assert");
var _ = require("lodash");
var S = require("../index.js");



describe("get_with_lock$ in memory>>", function () {


	var key_correct = [1, "b", "a", 4], value_correct = ["value1", "value2", "value3", "value4"];

	var process1 = function(x) {
		return x;
	};
	var get_key = [];
	var get_key_value = [];

  var s;
  before("create the store", function(d) {
    S.create_store$("memory").then(function(obj) {
      s = obj;
      for (var i = 0; i < key_correct.length; i++) {  
        s.set$(key_correct[i], value_correct[i]);
      }
      d();
    }).done();
  });

	it("get_with_lock with valid key", function(d) {
		get_key = key_correct.concat("", "notexist");
		get_key_value = value_correct.concat(undefined, undefined);

		var count = 0;
		for (var i = 0; i < get_key.length; i++) {
			(function(index) {
				s.get_with_lock$(get_key[index], process1).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, get_key_value[index]), true);
					if (count === get_key.length) {
						d();
					}
				}).done();
			})(i);
		}
	});


	it("get_with_lock with invalid key", function(d) {
		var get_key_incorrect = [null, {}];

		var count = 0;
		for (var i = 0; i < get_key_incorrect.length; i++) {
			(function(index) {
				s.get_with_lock$(get_key_incorrect[index], process1).catch(function(e) {
					count++;
					assert.equal(_.isEqual(e, "invalid key"), true);
					if (count === get_key_incorrect.length) {
						d();
					}
				}).done();
			})(i);
		}
	});



	it("get_with_lock$ and change the db", function(d) {
		get_key = key_correct.concat("", "notexist");
		get_key_value = value_correct.concat(undefined, undefined);

		var count = 0;
		for (var i = 0; i < get_key.length; i++) {
			(function(index) {
				s.get_with_lock$(get_key[index], function process(x) {
					return s.set$(get_key[index], x + "change");
				}).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, get_key_value[index] + "change"), true);
					if (count === get_key.length) {
						d();
					}
				}).done();
			})(i);
		}
	});
});


describe("batch_get_with_lock$ in memory>>", function () {
  var s;
  before("create the store", function(d) {
    S.create_store$("memory").then(function(obj) {
      s = obj;
      return s.batch_set$(batch_pair);
    }).then(function() {
      d();
    }).done();
  });
	var batch_pair = [["a", "value1"], ["b", "value2"], [2, {}]];


	var process2 = function(x) {
		return Promise.resolve(x);
	};
	
	var get_key = [];
  var get_value = [];
  var get_key_incorrect = [];

	it("batch_get_with_lock$ with valid key", function(d) {
    get_key = [""];
    get_value = [undefined];

    batch_pair.forEach(function(pair) {
      get_key.push(pair[0]);
    });

    batch_pair.forEach(function(pair) {
      get_value.push(pair[1]);
    });

    s.batch_get_with_lock$(get_key, process2).then(function(v) {
      for (var i = 0; i < v.length; i++) {
        assert.equal(_.isEqual(v[i], get_value[i]), true);
      }
      d();
    }).done();
  });


  it("batch_get_with_lock with invalid key", function(d) {
    get_key_incorrect = [null, "a"];
    s.batch_get_with_lock$(get_key_incorrect, process2).catch(function(e) {
      assert.equal(e, "invalid key");
      d();
    }).done();
  });
});
