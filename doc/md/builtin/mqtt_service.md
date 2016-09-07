mqtt service
===============

## mqtt_publish

### Description

This service provides ability to publish message of specific topic to mqtt server.

You must config the server url which starts with "mqtt://" or just ip + port. This service will automatic complete the url.

### Config

`server`: String. The mqtt server url.

`topic`: String. The publish topic .

### Inport

`message`: String. The message that will be published.

### Outport

`status`: Boolean. Output true if success to publish, otherwise false.

### Example

![](./pic/mqtt_publish.png)

In this example, every 2 second, this service generate a number between 0 and 100, then publish it to mqtt server. At last, the `Text` widget show the publish result.  

## mqtt_subscribe

### Description

This service provides ability to subscribe message of specific topic from mqtt server.

You must config the server url which starts with "mqtt://" or just ip + port. This service will automatic complete the url.

### Config

`server`: String. The mqtt server url.

`topic`: String. The subscribe topic .

### Inport

`on`: Boolean. If it's true, it will send request to mqtt server.

### Outport

`messgae`: String. The message received from mqtt server.

### Example

![](./pic/mqtt_subscribe.png)

In this example, every 1 second, this service send request to mqtt server and get message of specific topic, then output it to `Text` widget.

