# Edit Service

Edit the service's `start.js` and  `kernel.js`

![](./doc/pic/example/add_service/edit_http_request_service.gif){.viewer}

`start.js`

```Javascript
var request = require("request");
var querystring = require('querystring');
service_shared.http_request = function(url, method, headers, body, timeout, proxy) {
	return new Promise(function(resolve, reject) {
		//change url if invalid
		if (!((url.indexOf("http://") === 0) || (url.indexOf("https://") === 0))) {
			url = "http://" + url;
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
```

`kernel.js`

```javascript
if (IN.switch) {
	service_shared.http_request(CONFIG.url, CONFIG.method, CONFIG.headers, CONFIG.body, CONFIG.timeout, CONFIG.proxy)
		.then(function(response) {
			sendOUT({
				"out": response
			});
		}, function(err) {
			sendERR(err);
		});
}
```