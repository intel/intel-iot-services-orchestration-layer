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
var ES = require("../index.js");
var HubStore = ES.HubStore;
var B = require("hope-base");
var log = B.log.for_category("example");

var ds = new HubStore("memory");

var key1 = "hub1";
var hub1 = {
  id:key1,
  name:"hub 1",
  things:[1, 2, 3],
  mnode: "no-need",
  type: "normal"
};

ds.set$(key1, hub1).done();
log(ds.store.db);

var key2 = "hub2";
var hub2 = {
  id:key2,
  name:"hub 2",
  things:1,
  mnode: "no-need",
  type: "normal"
};

ds.set$(key2, hub2)
.catch(console.log.bind(console))
.done();// schema_check_fail
        // invalid things (should be array)

log(ds.store.db);


var key3 = "hub3";
var hub3 = {
  id:key3,
  name:"hub 3",
  things:[],
  mnode: "no-need",
  type: "normal"
};

ds.batch_set$([[key1, hub1], [key3, hub3]]).then(console.log.bind(console)).done();
log(ds.store.db);

ds.batch_delete$([key1, key3]);
log(ds.store.db);

ds.batch_set$([[key1, hub1], [key3, hub3], [key2, hub2]])
.catch(console.log.bind(console))// schema_check_fail with original args and finished args
.done();
log(ds.store.db);