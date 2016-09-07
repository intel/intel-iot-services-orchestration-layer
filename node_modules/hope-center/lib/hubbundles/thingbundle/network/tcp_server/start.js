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
var net = require("net");
var vm = require("vm");
shared.tcp_server = function(ip, port, data_handler, err_handler) {
	return new Promise(function(resolve, reject) {
		if(net.isIP(ip) === 0) {
			reject(ip + " is not valid");
		}
		if(shared.server) {
			resolve();
		}  else {
			var content = "(function(data){\n" + data_handler + "\n})";
			shared.server = net.createServer(function(socket) {
				socket.setTimeout(100000);
				socket.on('data', function(data) {
					try{
						var result = vm.runInThisContext(content)(data);
						socket.write(result);
					} catch (e) {
						err_handler(e);
					}
				});
				socket.on('close', function() {
				});
				socket.on('timeout', function() {
					socket.destroy();
				});
				socket.on('error', function(err) {
					socket.destroy();
					err_handler(err);
				});
			});
			shared.server.listen({
				host:ip,
				port:port
			}, function(err) {
				if(err) {
					reject(err);
				} else {
					shared.server.on('close',function() {
						shared.server = false;
					});
					resolve();
				}
			});
		}
	});	
};

done();



