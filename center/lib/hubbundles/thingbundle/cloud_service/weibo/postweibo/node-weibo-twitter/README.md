node-weibo-twitter
==================

An util for get/post weibo/tweet

## Installation

npm install node-weibo-twitter

## TODO

- add docs
- refactor code, put in its own file in lib
- add unit test cover 
- more api support (direct message)

## Usage 

```js
var NodeWeiboTwitter= require("node-weibo-twitter");

var twitterOptions = {
  consumer_key: "YOURS",
  consumer_secret: "YOURS",
  access_token_key: "YOURS",
  access_token_secret: "YOURS"
};
var twitter = NodeWeiboTwitter.create("twitter", twitterOptions);
twitter.getTweet("Real_CSS_Tricks", 5, function (error, data) {
  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
});

var weiboOptions = {
  consumer_key: "YOURS",
  consumer_secret: "YOURS",
  access_token_key: "YOURS"
};
var weibo = NodeWeiboTwitter.create("weibo", weiboOptions);
weibo.postWeibo("test 2 from npm", function (error, data) {
  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
});
```

## API 

Weibo
- getWeibo(screenName, count, cb)
- postWeibo(msg, cb)

Twitter
- getTweet(screenName, count, cb)
- postTweet(msg, cb)
- postDM(screenName, msg, cb)
 
## How to get Weibo access_token

- Weibo API Doc
http://open.weibo.com/wiki/%E5%BE%AE%E5%8D%9AAPI
- Get Authorize Code, set redirect url to http://127.0.0.1
https://api.weibo.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REGISTERED_REDIRECT_URI
- Get Access Token (Use POSTMAN w post method, not support browser access)
https://api.weibo.com/oauth2/access_token?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=authorization_code&redirect_uri=YOUR_REGISTERED_REDIRECT_URI&code=CODE

License (MIT)
-------------

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
