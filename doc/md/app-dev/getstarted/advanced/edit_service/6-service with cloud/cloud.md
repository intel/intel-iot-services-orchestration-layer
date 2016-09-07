# Invoke Services in Cloud/Remote

In some scenarios, the IoT app need to access cloud service, e.g. requesting weather information, face identification, and posting twitter/weibo. Those cloud servies will expose API for users to access, and those APIs could be restful, socket or other kinds. All we need to do is using those API in IoT SOL services, so that we can invoke cloud services.

## Example 1: socket API

Node.js provides [net module](https://nodejs.org/api/net.html) to support socket communication.

If there is a weather service in cloud with socket API. After the client send the date to the server, the server will respond the weather history/forecast on that day.
* The service has 2 CONFIG item: host and port. It indicates the server address
* One inport: date. string, e.g. "20160330"
* One outport: info. string, the detailed weather report.

In kernel.js

```javascript
var net = require('net');
var client = net.connect({port: CONFIG.port, host: CONFIG.host}, function(){
  console.log('connected to weather server!');
  client.write(IN.date);
});
client.on('data', function(data) {
  sendOUT({
    info: data.toString()
  });
  client.end();
});
client.on('end', function(){
  console.log('disconnected from weather server');
});
```

## Example 2: RESTful API

Node.js provides [http module](https://nodejs.org/api/http.html) to support RESTful API access, such as get and post.

You can also use the famous 3rd party npm module [request](https://github.com/request/request).

If there is a similar weather service with RESTful API. When it receives the GET request in address `base_url/date`, e.g. `http://www.my_weather_service.com/20160330`, it will response the weather information on that day.
* The service has 1 CONFIG item: url. the base url
* One inport: date. string, e.g. "20160330"
* One outport: info. string, the detailed weather report.

In kernel.js

```javascript
var request = require("request");
var url = CONFIG.url + "/" + IN.date.
request.get(url, function(e, res, body) {
  sendOUT({
    info: body.toString()
  });
})
```