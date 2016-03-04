sina weibo
================
## postweibo

### Description

This service provides ability for post message to sina weibo.

It is implemented by [node-weibo-twitter](https://www.npmjs.com/package/node-weibo-twitter)

At this stage, only supports plain-text message, and don't support the network proxy.

### Config

`token`: String. The access token of weibo account.

### Inport

`text`: String. The message content of weibo.

### Outport

`status`: Boolean. Output true if success to sending, otherwise false.

### Example

![](./pic/weibo.jpg)

In this example, we post a weibo message with "hello".

