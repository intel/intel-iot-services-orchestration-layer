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
this.version = '1.0';
this.github_url = 'http://01org.github.io/intel-iot-services-orchestration-layer/search_update.json';
this.update_intelvel = 6000000;
this.search_function = function (name, pagenumber, proxy) {
  var base_url = 'https://www.npmjs.com/search?q=' + name;
  var option = {'uri': base_url + ' & page = ' + pagenumber, 'method': 'get'};
  if (proxy && proxy.length > 0) {
    option.proxy = proxy;
  }
  return new Promise(function (resolve, reject) {
    request(option, function (err, response) {
      if (err) {
        return reject(err)
      }
      ;
      if (response.statusCode !== 200)return reject('response state code is ' + response.statusCode);
      var $ = cheerio.load(response.body);
      var count = parseInt($('h2.centered')[0].children[0].data);
      var data = [];
      var description = $('p.description');
      var author = $('a.author');
      var name = $('a.name');
      var version = $('span.version');
      var data_length = description.length;
      for (var item = 0; item < data_length; item++) {
        data.push({
          description: description[item].children[0] ? description[item].children[0].data : ' ',
          name: name[item].children[0].data,
          author: author[item].children[0] ? author[item].children[0].data : ' ',
          version: version[item].children[0].data.slice(1)
        });
      };
      resolve({'count': count, 'data': data});
    });
  });
};