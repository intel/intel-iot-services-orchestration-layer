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
service_shared.status = false; // whether the woogen is running

service_shared.child = null;

var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
service_shared.turn_on = function() {
  if (service_shared.status ) {
    console.log("web camera already running, ignore the command");
    return service_shared.status;
  }
  var serverIP = CONFIG.serverip || "127.0.0.1";
  var id = CONFIG.id || "abc";
  var env = Object.create(process.env);
  env.LD_LIBRARY_PATH = __dirname;
  //var cmd = "./woogeen_sample "+id+" "+serverIP+" 1>/dev/null 2>/dev/null";
  //service_shared.child = exec(cmd, {cwd: __dirname, env:env});
  service_shared.child = spawn("./woogeen_sample",[id, serverIP],{cwd: __dirname, env:env, stdio:"ignore"});
  console.log("spawn pid:", service_shared.child.pid, ", " + id + ", " + serverIP);
  service_shared.status = true;
  return service_shared.status;
};

service_shared.turn_off = function() {
  if (!service_shared.status) {
    console.log("web camera already stopped, ignore the command");
    return service_shared.status;
  }

  if (service_shared.child) {
    service_shared.child.kill();
    console.log("kill pid:", service_shared.child.pid);
  }

  service_shared.status = false;
  return service_shared.status;
};

done();