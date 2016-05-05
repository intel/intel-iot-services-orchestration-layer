Web camera
================
## camera

### Description

This service turn on the camera and connect the WebRTC server.

### Config

`id`: String. The ID of web camera.

`server ip`： String. Defaut is 127.0.0.1, The IP address of WebRTC server.

### Inport

`switch`: Boolean. The switching signal of web camera, true for connecting WebRTC server and false will cause disconnecting.

### Outport

`status`: Boolean. Output true if connect successfully, false if disconnect successfully.

### Example

![](./pic/camera.jpg)



## webrtc_server

### Description

This service is a WebRTC server.

### Inport

`switch`: Boolean. The working state switching of server.

### Outport

`status`: Boolean. The current working state of server.
