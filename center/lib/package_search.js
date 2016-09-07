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
var B = require("hope-base");
var log = B.log.for_category("package_search");
var _ = require("lodash");
var util = require("util");
var fs = require("fs");
var cheerio = require("cheerio");
var semver = require('semver');


var reldir = B.fs.dir_exists(__dirname + "/../../ui-widgets") ? "/../.." : "/../../..";
var absdir = B.path.resolve(__dirname + reldir);


module.exports = PackageSearch;

function PackageSearch() {
  this.search_function = null;
  this.github_url = "http://01org.github.io/intel-iot-services-orchestration-layer/search_update.json";
  this.version = null;
  this.update_intelvel = 6000000; //10 min
}

PackageSearch.prototype.init$ = function(proxy) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.read_npmsearch_file();
    self.update_from_github$(proxy).then(function() {
      setInterval(function() {
        self.update_from_github$(proxy);
      }, self.update_intelvel);
      resolve();
    }).catch(function(err) {
      log.warn("package search", "init fail", err);
      reject(err);
    });
  });
};


PackageSearch.prototype.update_jsfile = function(content) {
  var public_filepath = absdir + "/ui-dev/public/js/search.js";
  var dev_filepath = absdir + "/ui-dev/ui/js/search.js";
  if (B.fs.file_exists(public_filepath)) {
    fs.writeFileSync(public_filepath, content);
  }
  if (B.fs.file_exists(dev_filepath)) {
    fs.writeFileSync(dev_filepath, content);
  }
  return "update js file ok";
};


PackageSearch.prototype.update_from_github$ = function(proxy) {
  var option = {
    uri: this.github_url,
    method:"get"
  };
  if(proxy&&proxy.length>0) {
    option.proxy = proxy;
  }
  var self = this;
  return new Promise(function(resolve, reject) {
    request(option, function(err, response) {
      if(err) return reject(err);
      if(response.statusCode!==200) return reject("response state code is " + response.statusCode);
      var github_json = response.body;
      if(_.isString(github_json)) {
        github_json = JSON.parse(github_json);
      }

      if(github_json.version != self.version) {
        log.info("package search", "need update");
        fs.writeFileSync(__dirname + "/npm_search.js", github_json.npm_search_jsfile);
        self.update_jsfile(github_json.auto_complete_jsfile);
        self.read_npmsearch_file();
      }
      resolve();
    })
  });
};


PackageSearch.prototype.read_npmsearch_file = function() {
  try{
    var search_js = fs.readFileSync(__dirname + "/npm_search.js").toString();
    if(search_js) {
      eval(search_js);
    }
  } catch (err) {
    log.warn("package search", "read npm file fail", __dirname, err.toString());
  }
};

PackageSearch.prototype.search = function(name, pagenumber, proxy) {
  var self = this;
  if(typeof this.search_function === "function") {
    return new Promise(function(resolve, reject) {
      self.search_function(name, pagenumber, proxy).then(function(data) {
        resolve(data);
      }).catch(function(err){
          log.error("package search", "search package", name, "failed due to", err.toString());
          reject(err);
        });
    });
  } else {
    return Promise.resolve({
      'count':0,
      'data':[]
    });
  }
};

PackageSearch.prototype.get_version = function(name, proxy) {
  var option = {
    uri: "https://registry.npmjs.org/" + name,
    method: "get"
  };
  if(proxy) {
    option.proxy = proxy;
  }
  return new Promise(function(resolve, reject) {
    request(option, function(err, response) {
      if(err) return reject(err);
      var data = response.body;
      var version = [];
      if(typeof data === "string") {
        data = JSON.parse(data);
      }
      if (data['versions']) {
        version = data['versions'];
        version = Object.keys(version).sort(semver.compareLoose);
        version.reverse();
      }
      resolve(version);
    });
  });
};