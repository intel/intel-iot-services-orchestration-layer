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
var B = require("../index");

var l = B.lock.make("test");


function gen$(s, time) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      console.log(s);
      resolve();
    }, time);
  });
}


l.lock(function() {
  console.log(">>> 1 - Lock");
  return gen$("<<< 1 - Release", 100);
});


l.lock(function() {
  console.log(">>> 2 - Lock");
  return gen$("<<< 2 - Release", 100);
});


l.lock(function() {
  console.log(">>> 3 - Lock");
  return gen$("<<< 3 - Release", 100);
}, 300, false, function() {
  console.log("~~~ 3 - Giveup");    // Shouldn't print this
});

l.lock(function() {
  console.log(">>> 4 - Lock");      // Shouldn't print this
  return gen$("<<< 4 - Release", 100); // Shouldn't print this
}, 100, false, function() {
  console.log("~~~ 4 - Giveup");
});


l.lock(function() {
  console.log(">>> 5 - Lock");      // Shouldn't print this
  return gen$("<<< 5 - Release", 100); // Shouldn't print this
}, 2000, true, function() {
  console.log("~~~ 5 - Giveup");
});

var l2 = B.lock.make("test2");
l2.lock_as_promise$(function() {
  return "test 2 --- 1";
}).then(function(r) {
  console.log(r);
}).done();


l2.lock_as_promise$(function() {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve("test 2 --- 2");
    }, 100);
  });
}).then(function(r) {
  console.log(r);
}).done();


l2.lock_as_promise$(function() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      reject("test 2 --- 3");
    }, 100);
  });
}).catch(function(r) {
  console.log(r);
}).done();
