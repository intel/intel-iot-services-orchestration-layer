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
var querystring = require('querystring'),
  Oauth = require('oauth');

/*
 * @ NodeWeiboTwitter
 * ----------------------------------
 * - Factory w singleton
 * - var twitter = NodeWeiboTwitter.create("twitter", options); twitter.getTweet()
 */
var NodeWeiboTwitter = {
  TYPE2API: {
    "weibo":   Weibo,
    "twitter": Twitter
  },

  create: function (type, options) {
    var API = this.TYPE2API[type];
    if (!API) {
      throw new TypeError(type + " is not supported");
    }
    if (!options.consumer_key || !options.consumer_secret) {
      throw new TypeError("appKey or appSecret is not set");
    }
    if (!options.access_token_key) {
      throw new TypeError("appKey or appSecret is not set");
    }

    return new API(options);
  }
};

/*
 * @ Weibo
 * ----------------------------------
 * - How to get Weibo access_token - read README
 */
function Weibo(options) {
  this.oauth = new Oauth.OAuth2(
    options.consumer_key,
    options.consumer_secret,
    "https://api.weibo.com/",
    "oauth2/authorize",
    "oauth2/access_token"
  );
  if (!options.access_token_key) {
    throw new TypeError("accessTokenKey is needed for Weibo");
  } else {
    this.accessTokenKey = options.access_token_key;
  }
}

Weibo.prototype = {
  //TODO: As of 2.0, weibo stop supporting get weibo by screenName service, only allow return user's own weibo
  //http://open.weibo.com/wiki/2/statuses/user_timeline
  getWeibo: function (screenName, count, cb) {
    if (!screenName) {
      throw new TypeError("screenName is not set");
    }
    if (!count) {
      count = 10;
    }
    if (!cb) {
      cb = function () {
      };
    }
    var api = "https://api.weibo.com/2/statuses/home_timeline.json?trim_user=true&screen_name=" + screenName + "&count=" + count,
      header = {"User-Agent": "node-weibo-twitter"};
    this.oauth._request("GET", api, header, "", this.accessTokenKey, this._weiboCallbackWrapper(cb));
  },

  postWeibo: function (msg, cb) {
    if (!cb) {
      cb = function () {};
    }
    var api = "https://api.weibo.com/2/statuses/update.json",
      header = {"Content-Type": "application/x-www-form-urlencoded"},
      data = {status: msg};
    data = querystring.stringify(data);
    this.oauth._request(
      "POST",
      api,
      header,
      data,
      this.accessTokenKey,
      this._weiboCallbackWrapper(cb)
    );
  },

  _weiboCallbackWrapper: function (cb) {
    return function (err, data, response) {
      if (err) {
        console.log(err);
        return;
      }
      var result;
      try {
        result = JSON.parse(data);
      } catch (e) {
        console.log(e);
        return;
      }
      cb(null, result, response);
    };
  }
};

/*
 * @ Twitter
 * ----------------------------------
 * - https://dev.twitter.com/docs/api/1.1
 */
function Twitter(options) {
  this.oauth = new Oauth.OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    options.consumer_key,
    options.consumer_secret,
    '1.0A',
    null,
    'HMAC-SHA1'
  );

  this.accessTokenKey = options.access_token_key;
  this.accessTokenSecret = options.access_token_secret;
}

Twitter.prototype = {
  getTweet: function (screenName, count, cb) {
    if (!count) {
      count = 10;
    }
    var api = "https://api.twitter.com/1.1/statuses/user_timeline.json?trim_user=true&exclude_replies=true&screen_name=" + screenName + "&count=" + count;
    this.oauth.get(
      api,
      this.accessTokenKey,
      this.accessTokenSecret,
      cb
    );
  },

  postTweet: function (msg, cb) {
    var api = "https://api.twitter.com/1.1/statuses/update.json";
    this.oauth.post(
      api,
      this.accessTokenKey,
      this.accessTokenSecret,
      {"status": msg},
      cb
    );
  },

  postDM: function (screenName, msg, cb) {
    if (!screenName) {
      throw new TypeError("screenName is not set");
    }
    var api = "https://api.twitter.com/1.1/direct_messages/new.json";
    this.oauth.post(
      api,
      this.accessTokenKey,
      this.accessTokenSecret,
      {
        "screen_name": screenName,
        "text": msg
      },
      cb
    );
  }
};

module.exports = NodeWeiboTwitter;
