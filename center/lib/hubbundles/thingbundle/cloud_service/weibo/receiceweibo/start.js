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

shared.weibo = [];
function getWeibo(access_token, since_id, proxy) {
    var url = "https://api.weibo.com/2/statuses/friends_timeline.json?access_token=" + access_token;
    if(since_id) {
      url += "&since_id=" + since_id;
    }
    var option = {
      url: url
    };
    if(proxy) {
      option.proxy = proxy;
    }
    return new Promise(function(resolve, reject) {
      request(option, function (err, response) {
        if(err) {
          return reject(err);
        }
        resolve(response.body);
      });
    });

}

shared.receive_weibo = function(access_token, type, proxy) {
  return new Promise(function(resolve, reject) {
    if(type === "all") {
      getWeibo(access_token, null, proxy).then(function(data) {
        shared.weibo = JSON.parse(data).statuses;
        resolve(JSON.parse(data).statuses);
      }).catch(function(err) {
        reject(err);
      });
    } else if(type === "new") {
      var last_since_id;
      if(shared.weibo.length === 0) {
        last_since_id = 0;
      } else {
        last_since_id = shared.weibo[0].id;
      }
      getWeibo(access_token, last_since_id, proxy).then(function(data) {
        var wd = JSON.parse(data).statuses;
        shared.weibo = wd.concat(shared.weibo);
        resolve(wd);
      }).catch(function(err) {
        reject(err);
      });
    } else {
        return reject("method " + type + " is not supported");
    }
  });
};

done();