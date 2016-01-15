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
var E = require("../index.js");
var ES = require("../../entity-store");
var B = require("hope-base");
var _ = require("lodash");
var assert = require("assert");

describe("spec", function() {
	//create spec_store, specbundle_store
	var specstore;
	var specbundlestore;
	var em;

	before("create_entity_manager", function(d) {
		ES.create_specstore$("memory").then(function(obj1) {
			specstore = obj1;
			return ES.create_specbundlestore$("memory");
		}).then(function(obj2) {
			specbundlestore = obj2;
			em = E.create_entity_manager({
				spec_store:specstore, 
				specbundle_store:specbundlestore
			});
			d();
		}).done();
	});


	var specbundle_path = B.path.join(__dirname, "./spec_bundle");


	var spec1 = 
	{ 
		id: 'spec1',
		name: 'spec1 in myspec1',
		path: '/home/myuser/hope/entity/test/spec_bundle/myspec1/spec1.json',
		specbundle: 'specbundle01' 
	};

	var spec2 = 
	{ 
		id: 'spec2',
		name: 'spec2 in myspec1',
		path: '/home/myuser/hope/entity/test/spec_bundle/myspec1/spec2.json',
		specbundle: 'specbundle01' 
	};

	var spec3 = 
	{
		id: 'spec3',
		name: 'spec3 in myspec2',
		path: '/home/myuser/hope/entity/test/spec_bundle/myspec2/spec3.json',
		specbundle: 'specbundle01'
	};

	var spec4 = 
	{
		id: 'spec4',
		name: 'spec4 in myspec2',
		path: '/home/myuser/hope/entity/test/spec_bundle/myspec2/spec4.json',
		specbundle: 'specbundle01' 
	};

	var specbundle01 = 
	{ 
		id: 'specbundle01',
		name: 'spec_bundle',
		specs: [ 'spec1', 'spec2', 'spec3', 'spec4' ],
		path: '/home/myuser/hope/entity/test/spec_bundle' 
	};

	it("spec__load_from_localbundle$", function(d) {
		var specbundle_in_store = { 
			specbundle01: specbundle01
		};

		
		var spec_in_store = { 
			spec1:  spec1,
			spec2:  spec2,
			spec3:  spec3,
			spec4:  spec4	
		};


		em.spec__load_from_localbundle$(specbundle_path).then(function() {
			assert.equal(_.isEqual(em.specbundle_store.store.db, specbundle_in_store), true);
			assert.equal(_.isEqual(em.spec_store.store.db, spec_in_store), true);
			d();
		}).done();
	});

	it("spec__get$", function(d) {
		var count = 0;
		var spec_arr = ["spec1", "spec2", "spec3", "spec4"];
		var spec_arr_value = [spec1, spec2, spec3, spec4];

		for (var i = 0; i < spec_arr.length; i++) {
			(function(index) {
				em.spec__get$(spec_arr[index]).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, spec_arr_value[index]), true);
					if (count == spec_arr.length)
						d();
				}).done();
			})(i);
		}
	});

	it("spec__list$", function(d) {
		var max_length = 2;
		var spec_list_value = ["spec1", "spec2", "spec3", "spec4"];
		if (max_length > spec_list_value.length)
			max_length = spec_list_value.length;

		em.spec__list$(max_length).then(function(v) {
			assert.equal(_.isEqual(v, spec_list_value.slice(0, max_length)), true);
			d();
		}).done();
	});

	it("spec__get_specbundle$", function(d) {
		em.spec__get_specbundle$("spec1").then(function(v) {
			assert.equal(_.isEqual(v, specbundle01), true);
			d();
		}).done();

	});

	it("specbundle__get$", function(d) {
		var specbundle_id_arr = ["specbundle01"];
		var specbundle_arr = [specbundle01];
		var count = 0;

		for (var i = 0; i < specbundle_id_arr.length; i++) {
			(function(index) {
				em.specbundle__get$(specbundle_id_arr[index]).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, specbundle_arr[index]), true);
					if (count == specbundle_id_arr.length)
						d();
				}).done();
			})(i);
		}
	});

	it("specbundle__list$", function(d) {
		var max_length = 2;
		var specbundle_list_value = [specbundle01];
		if (max_length > specbundle_list_value.length)
			max_length = specbundle_list_value.length;
		em.specbundle__list$(max_length).then(function(v) {
			assert.equal(_.isEqual(v, specbundle_list_value.slice(0, max_length)), true);
			d();
		}).done();
	});

	it("specbundle__list_specs$", function(d) {
		var specbundle_id_arr = ["specbundle01"];
		var specbundle_list_specs_value = [[spec1, spec2, spec3, spec4]];
		var count = 0;

		for (var i = 0; i < specbundle_id_arr.length; i++) {
			(function(index) {
				em.specbundle__list_specs$(specbundle_id_arr[index]).then(function(v) {
					count++;
					assert.equal(_.isEqual(v, specbundle_list_specs_value[index]), true);
					if (count == specbundle_id_arr.length)
						d();
				}).done();
			})(i);
		}
	});
});