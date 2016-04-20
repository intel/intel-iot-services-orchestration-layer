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
/*eslint no-console:0*/
var B = require("hope-base");
var E = require("../index");
var ES = require("../../entity-store");


var specstore = ES.create_specstore("memory");
var specbundlestore = ES.create_specbundlestore("memory");
var em = E.create_entity_manager({spec_store:specstore, specbundle_store:specbundlestore});

var specbundlepath = B.path.join(__dirname, "./specbundle");

em.spec__load_from_localbundle$(specbundlepath)
.then(function(list) {
  console.log("[changed_list]", list);
  console.log("[specbundle]", em.specbundle_store.store.db);
  console.log("[spec]", em.spec_store.store.db);
}).done();

setTimeout(function() {
  em.spec__remove_in_store$("spec2")
  .then(function(list) {
    console.log("========= after remove spec2 =======");
    console.log("[changed_list]", list);
    console.log("[specbundle]", em.specbundle_store.store.db);
    console.log("[spec]", em.spec_store.store.db);
  }).done();
}, 100);
