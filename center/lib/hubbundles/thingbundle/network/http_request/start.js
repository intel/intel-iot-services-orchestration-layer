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
var request = require("request");
var querystring = require('querystring');
service_shared.http_request = function(url, method, headers, body, timeout, proxy, switch) {
	return new Promise(function(resolve, reject) {
		//change url if invalid
		if (!((url.indexOf("http://") === 0) || (url.indexOf("https://") === 0))) {
			url = "http://" + url + switch;
		}
		method = method.toLowerCase();
		headers = (typeof headers == 'string') ? JSON.parse(headers) : headers;
		body = (typeof body == 'string') ? JSON.parse(body) : body;
		if (['get', 'post', 'put', 'delete', 'patch'].indexOf(method) === -1) {
			console.log("method ", method, " is not supported.");
			reject("method " + method + " is not supported.");
		}
		var option = {
			uri: url,
			method: method,
			headers: headers,
			timeout: parseInt(timeout)
		};
		if (proxy) {
			option['proxy'] = proxy;
		}
		if (method === "post") {
			option['body'] = querystring.stringify(body);
		}
		request(option, function(err, response) {
			if (err) {
				return reject(err);
			}
			resolve({
				statusCode: response.statusCode,
				headers: response.headers,
				body: response.body
			});
		});
	});
};

done();