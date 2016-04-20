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
var S = require("../index");
var assert = require("assert");
var _ = require("lodash");


describe("thing basic>>", function() {
	var ts;
  before("create_thingstore", function(d) {
    S.create_thingstore$("memory").then(function(obj) {
      ts = obj;
      d();
    }).done();
  });



	it("get_store_type", function() {
		assert.equal(ts.get_store_type(), 'memory');
	});

	var key_correct = [];
	var value_correct = [];
	it("set$ with valid schema", function(d) {
		key_correct = ["key1", "key2", 1];
		value_correct = [
			{"id" : "key1", "type": "hope_thing", "name" : "element1", "hub" : "h1", "is_builtin": false, "is_connect" : true, "services" : ["id1", "id2"]},
			{"id" : "key2", "type": "xxx_thing", "name" : "element2", "hub" : "h2", "is_builtin": false, "is_connect" : true, "services" : ["id3", 1]},
			{"id" : 1, "type": "hope_thing", "name" : "element3", "hub" : 3, "is_builtin": true, "is_connect" : false, "services" : [2, 3]}
		];

		var count = 0;
		for (var i = 0; i < key_correct.length; i++ ) {
			(function(index) {
				ts.set$(key_correct[index], value_correct[index]).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, value_correct[index]), true);
					if (count === key_correct.length) {
						d();
					}
				}).done();
			})(i);
		}	
	});

  it("set$ with list", function(d) {
    var list = [];
    key_correct = ["key1", "key2", 1];
    value_correct = [
      {"id" : "key1", "type": "hope_thing", "name" : "element1", "hub" : "h1", "is_builtin": false, "is_connect" : true, "services" : ["id1", "id2"]},
      {"id" : "key2", "type": "xxx_thing", "name" : "element2", "hub" : "h2", "is_builtin": false, "is_connect" : true, "services" : ["id3", 1]},
      {"id" : 1, "type": "hope_thing", "name" : "element3", "hub" : 3, "is_builtin": true, "is_connect" : false, "services" : [2, 3]}
    ];

    var count = 0;
    for (var i = 0; i < key_correct.length; i++ ) {
      (function(index) {
        ts.set$(key_correct[index], value_correct[index], list).then(function(v) {
          count++;
          assert.equal(_.isEqual(v, value_correct[index]), true);
          var expect_item = {
            id: key_correct[index],
            type: "thing",
            cmd: "set",
            obj: value_correct[index]
          };
          assert.equal(_.isEqual(list[index], expect_item), true);
          if (count === key_correct.length) {
            d();
          }
        }).done();
      })(i);
    }
  });


	var key_incorrect = [];
	var value_incorrect = [];

	it("set$ with invalid schema", function(d) {
		key_incorrect = ["key1", "key2", "key3", 4, 5, 6, [], 8];
		value_incorrect = [
			{"id" : "key2", "type": "hope_thing", "is_builtin": false, "name" : "element1", "hub" : "h1", "is_connect" : true, "services" : ["id1", "id2"]}/*key !== value.id*/,
			{"id" : "key2", "type": "hope_thing", "is_builtin": false, "name" : 1, "hub" : 1, "is_connect" : true, "services" : ["id1", "id2"]}/*value.name is not a string*/,
			{"id" : "key3", "type": "hope_thing", "is_builtin": false, "name" : "element3", "hub" : [], "is_connect" : true, "services" : ["id1", "id2"]}/*value.hub is not a string or number*/,
			{"id" : 4, "type": "hope_thing", "is_builtin": false, "name" : "element4", "hub" : "h4", "is_connect" : 1, "services" : ["id1", "id2"]}/*value.is_connect is not boolean*/,
			{"id" : 5, "type": "hope_thing", "is_builtin": false, "name" : "element5", "hub" : "h5", "is_connect" : true, "services" : {}}/*value.services is not a array*/,
			{"id" : 6, "type": "hope_thing", "is_builtin": false, "name" : "element6", "hub" : "h6", "is_connect" : true, "services" : [[], "id2"]}/*the element of value.services is not a string or number*/,
			{"id" : [], "type": "hope_thing", "is_builtin": false, "name" : "element7", "hub" : "h7", "is_connect" : true, "services" : ["id1", "id2"]}/*key is not a string or number*/,
      {"id" : 8, "type": "hope_thing", "is_builtin": false, "name" : "element7", "hub" : "h8", "services" : ["id1", "id2"]}/*lack of is_connect*/
		];

		var count = 0;
		for (var i = 0; i < key_incorrect.length; i++ ) {
			(function(index) {
				ts.set$(key_incorrect[index], value_incorrect[index]).catch(function(e) {
					count++;
					assert.equal(e, "schema_check_fail");
					if (count === key_incorrect.length) {
						d();
					}
				}).done();
			})(i);
		}
	});

	var list_length = 2;
	it("list$ with valid schema", function(d) {
		var length = list_length;
		if (list_length > key_correct.length) {
			length = key_correct.length; 
    }
    ts.list$(list_length).then(function(v) {
      if (length === 0) {
        assert(_.isArray(v), true) && assert(_.isEmpty(v), true);
      }
      else {
        var key_correct_new = [];
				for (var i = 0; i < key_correct.length; i++) {
					if (_.isNumber(key_correct[i])) {
						key_correct_new.push(key_correct[i].toString());
					}
				}
				for (var j = 0; j < key_correct.length; j++) {
					if (!(_.isNumber(key_correct[j]))) {
						key_correct_new.push(key_correct[j]);
					}
				}

				assert.equal(_.isEqual(v, key_correct_new.slice(0, length)), true);
      }
      d();
    }).done();
	});
	

	it("size$ with valid schema", function(d) {
    ts.size$().then(function(size) {
      assert.equal(size, key_correct.length);
      d();
    }).done(); 
	});


	it("get$ with valid schema", function(d) {
		var get_key = key_correct;
		var get_value = value_correct;

		var count = 0;
		for (var i = 0; i < get_key.length; i++) {
			(function(index) {
				ts.get$(get_key[index]).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, get_value[index]), true);
					if (count === get_key.length) {
						d();
					}
				}).done();
			})(i);
		}
	});


	var process1 = function(x) {
		return x;
	};

	it("get_with_lock$ with valid schema", function(d) {
		var get_lock_key = key_correct;
		var get_lock_value = value_correct;

		var count = 0;
		for (var i = 0; i < get_lock_key.length; i++) {
			(function(index) {
				ts.get_with_lock$(get_lock_key[index], process1).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, get_lock_value[index]), true);
					if (count === get_lock_key.length) {
						d();
					}
				}).done();
			})(i);
		}
	});

	it("has$ with valid schema", function(d) {
		var has_key = key_correct.concat("*", "null");

		var count = 0;
		for (var i = 0; i < has_key.length; i++) {
			(function(index) {
				ts.has$(has_key[index]).then(function(b) {
					count++;
					if (index < key_correct.length) {
						assert.equal(b, true);
					}
					else {
						assert.equal(b, false);
					}
					if (count === has_key.length) {
						d();
					}
				}).done();
			})(i);
		}
	});


	it("delete$ with valid schema", function(d) {
		var del_key = ["key1", "key2"];
		var list = [];

		var count = 0;
		for (var i = 0; i < del_key.length; i++) {
			(function(index) {
				ts.delete$(del_key[index], list).then(function(k) {
					count++;
					assert.equal(k, del_key[index]);

					if (count === del_key.length) {
						for (var j = 0; j < del_key.length; j++) {
							assert.equal(list[j].type, 'thing') && assert.equal(list[j].cmd, 'delete') && assert.equal(list[j].id, del_key[j]);
						}
						d();
					}
				}).done();
			})(i);
		}
	});
});


describe("thing batch>>", function() {
  var ts;
  before("create_thingstore", function(d) {
    S.create_thingstore$("memory").then(function(obj) {
      ts = obj;
      d();
    }).done();
  });
	var batch_pair_correct = [];

	it("batch_set$ with valid schema", function(d) {
		batch_pair_correct = [
			["key1", {"id" : "key1", "type": "hope_thing", "is_builtin": true, "name" : "element1", "hub" : "h1", "is_connect" : true, "services" : ["id1", "id2"]}],
			["key2", {"id" : "key2", "type": "xxx_thing", "is_builtin": false, "name" : "element2", "hub" : "h2", "is_connect" : true, "services" : ["id3", 1]}], 
			[1, {"id" : 1, "type": "hope_thing", "is_builtin": false, "name" : "element3", "hub" : 3, "is_connect" : false, "services" : [2, 3]}]
		];

		ts.batch_set$(batch_pair_correct).then(function(v) {
			assert.equal(_.isEqual(v, batch_pair_correct), true);
			d();
		}).done();
	});

  it("batch_set$ with list", function(d) {
    var list = [];
    batch_pair_correct = [
      ["key1", {"id" : "key1", "type": "hope_thing", "is_builtin": true, "name" : "element1", "hub" : "h1", "is_connect" : true, "services" : ["id1", "id2"]}],
      ["key2", {"id" : "key2", "type": "xxx_thing", "is_builtin": false, "name" : "element2", "hub" : "h2", "is_connect" : true, "services" : ["id3", 1]}], 
      [1, {"id" : 1, "type": "hope_thing", "is_builtin": false, "name" : "element3", "hub" : 3, "is_connect" : false, "services" : [2, 3]}]
    ];
    var batch_set_key = [];
    var batch_set_value = [];

    batch_pair_correct.forEach(function(pair) {
      batch_set_key.push(pair[0]);
      batch_set_value.push(pair[1]);
    });

    ts.batch_set$(batch_pair_correct, list).then(function(v) {
      assert.equal(list[0].cmd, "set");
      assert.equal(list[0].type, "thing");
      assert.equal(_.difference(list.id, batch_set_key).length, 0);
      assert.equal(_.difference(list.obj, batch_set_value).length, 0);
      assert.equal(_.isEqual(v, batch_pair_correct), true);
      d();
    }).done();
  });


	var batch_pair_incorrect = [];
	it("batch_set$ with invalid schema", function(d) {
		batch_pair_incorrect = [
			["key1", {"id" : "key2", "type":"hope_thing", "is_builtin": false, "name" : "element1", "hub" : "h1", "is_connect" : true, "services" : ["id1", "id2"]}/*key !== value.id*/],
			["key2", {"id" : "key2", "type":"hope_thing", "is_builtin": false, "name" : 1, "hub" : 1, "is_connect" : true, "services" : ["id1", "id2"]}/*value.name is not a string*/],
			["key3", {"id" : "key3", "type":"hope_thing", "is_builtin": false, "name" : "element3", "hub" : [], "is_connect" : true, "services" : ["id1", "id2"]}/*value.hub is not a string or number*/],
			["key4", {"id" : "key4", "type":"hope_thing", "is_builtin": false, "name" : "element4", "hub" : "h4", "is_connect" : true, "services" : ["id1", "id2"]}],
			[5, {"id" : 5, "type":"hope_thing", "is_builtin": false, "name" : "element5", "hub" : "h4", "is_connect" : 1, "services" : ["id1", "id2"]}/*value.is_connect is not boolean*/],
			[6, {"id" : 6, "type":"hope_thing", "is_builtin": false, "name" : "element6", "hub" : "h5", "is_connect" : true, "services" : {}}/*value.services is not a array*/],
			[7, {"id" : 7, "type":"hope_thing", "is_builtin": false, "name" : "element7", "hub" : "h6", "is_connect" : true, "services" : [[], "id2"]}/*the element of value.services is not a string or number*/],
      [8, {"id" : 8, "type":"hope_thing", "is_builtin": false, "name" : "element7", "hub" : "h7", "services" : [[], "id2"]}/*lack of "is_connect" */]
		];

		ts.batch_set$(batch_pair_incorrect).catch(function(e) {
			assert.equal(e.message, "schema_check_fail");
			assert.equal(_.isEqual(e["finished_args"], []), true);
			assert.equal(_.isEqual(e["original_args"], batch_pair_incorrect), true);
			d();
		}).done();
	});


	it("batch_get$ with valid schema", function(d) {
		var batch_get_key = [];
		var batch_get_value = [];

		batch_pair_correct.forEach(function(pair) {
			batch_get_key.push(pair[0]);
			batch_get_value.push(pair[1]);
		});

		ts.batch_get$(batch_get_key).then(function(v) {
			for (var i = 0; i < v.length; i++) {
				assert.equal(_.isEqual(v[i], batch_get_value[i]), true);
			}
			d();
		}).done();
	});


	var process2 = function(x) {
		return x;
	};

	it("batch_get_with_lock$ with valid schema", function(d) {
		var batch_get_key = [];
		var batch_get_value = [];

		batch_pair_correct.forEach(function(pair) {
			batch_get_key.push(pair[0]);
			batch_get_value.push(pair[1]);
		});

		ts.batch_get_with_lock$(batch_get_key, process2).then(function(v) {
			for (var i = 0; i < v.length; i++) {
				assert.equal(_.isEqual(v[i], batch_get_value[i]), true);
			}
			d();
		}).done();
	});


	it("batch_has$ with valid schema", function(d) {
		var batch_has_key = ["*"];
		var batch_has_value = [false];

		batch_pair_correct.forEach(function(pair) {
			batch_has_key.push(pair[0]);
			if (_.isUndefined(pair[1])) {
       batch_has_value.push(false);
     }
     else {
      batch_has_value.push(true);
     }
		});

		ts.batch_has$(batch_has_key).then(function(v) {
			for (var i = 0; i < v.length; i++) {
        assert.equal(_.isEqual(v[i], batch_has_value[i]), true);
      }
      d();
    }).done();
	});


	it("batch_delete$ with valid schema", function(d) {
		var batch_del_key = ["key1", "key2", ""];
		var batch_del_list_id = _.clone(batch_del_key);
		var list = [];

		for (var i = 0; i < batch_del_key.length; i++) {
			if (!batch_del_key[i]) {
				delete batch_del_list_id[i];
			}
		}

		ts.batch_delete$(batch_del_key, list).then(function(v) {
			//rets === batch_del_key
			assert.equal(_.isEqual(v, batch_del_key), true);
			//test list
			assert.equal(list[0].type, 'thing') && assert.equal(list[0].cmd, 'delete') && assert.equal(_.isEqual(list[0].id, batch_del_list_id), true);
			d();
		}).done();
	});
});