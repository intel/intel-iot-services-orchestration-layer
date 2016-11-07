network
===========

## http_request

### Description

This servide provides ability for send http request.

It is implemented by [Request](https://www.npmjs.com/package/request).

### Config

`url1`: String. Http request url. If the url does not start with *http://*, it will be added with *http://*.

`method`: String. Request method. Now only `get`,`post`,`put`,delete`,`patch` are supported.

`headers`: Object. Request headers. Default is *{}*.

`body`: Object. Request body. Default is *{}*.

`proxy`: String. Optional. You can set the proxy manually.

`timeout`: Number. Request timeout. Default is *50000*(50s).

### Inport

`trigger`: The switching signal of http request. If it's true, this service will send request and format response data. 
`url2`: String. The tail of url1. If it's not null, it will be added in the back of url1 to make the request variable.

### Outport

`out`: String. The http reuquest result including `statusCode`,`headers`,`body`


### Example

![](./pic/http_request_1.png)

In this example, we send request to http://www.baidu.com and write the response body to file.

</br>
![](./pic/http_request_2.png)

In this example, we send dynamic temperature data to http://www.web.com?temp= and get the response body.

</br>

### Output Format

```javascript
{
    "statusCode": 200,
    "headers": "response.headers",
    "body": "response.body"
}
```

## tcp_request

### Description

This servide provides ability for send tcp request.

### Config

`ip`: String. Server ip.

`port`: Number. Server port.


### Inport

`switch`: Boolean. The switching signal of tcp request. If it's true, this service will send request and format response data. 

`data`: String. The message send to server.

### Outport

`out`: String. Data response from server.


### Example

![](./pic/tcp_request.png)

In this example, every 3 second, we send request to 127.0.0.1:9999 and show response data with `Text` widget.

</br>

## tcp_server

### Description

This servide provides ability for create a simple tcp server.

### Config

`ip`: String. Listening ip. Default is *0.0.0.0*

`port`: Number. Listening port.

`f(data)`: Function. Deal with the data from cilent.

### Inport

`switch`: Boolean. The switching signal of tcp server. If it's true, this server will be alive otherwise the server will be closed.


### Example

![](./pic/tcp_server.png)

In this example, we create a tcp server listening on 0.0.0.0:9999. When cilent send data, we simply append "hello" to it.

function code
```javascript
return data.toString() + "hello";
```

</br>

## udp_request

### Description

This servide provides ability for send udp request.

### Config

`ip`: String. Server ip.

`port`: Number. Server port.


### Inport

`switch`: Boolean. The switching signal of udp request. If it's true, this service will send request and format response data. 

`data`: String. The message send to server.

### Outport

`out`: String. Data response from server.


### Example

See tcp request example. 

</br>

## udp_server

### Description

This servide provides ability for create a simple udp server.

### Config

`ip`: String. Listening ip. Default is *0.0.0.0*

`port`: Number. Listening port.

`f(data)`: Function. Deal with the data from cilent.

### Inport

`switch`: Boolean. The switching signal of udp server. If it's true, this server will be alive otherwise the server will be closed.


### Example

See tcp server example. 