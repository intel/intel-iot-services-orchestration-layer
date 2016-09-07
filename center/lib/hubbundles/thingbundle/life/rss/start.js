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
var request    = require('request')
  , sax        = require('sax')
  , _          = require('lodash');


var RssRead = function(feed_url, option) {
  option = option || {};
  if(_.isArray(feed_url)) {
    var task = _.map(feed_url, function(url) {
      return RssRead.get(_.assign({url:url}), option);
    });
    return Promise.all(task);
  } else {
    return RssRead.get(_.assign(option, {url:feed_url}));
  }
};

RssRead.get = function(option) {
  return new Promise(function(resolve, reject) {
    request(option, function(err, response) {
      if(err) return reject(err);
      resolve(response.body);
    });
  }).then(function(body) {
    var type = RssRead.identify(body);
    if(type === "atom") {
      return RssRead.atom(body, option.url)
        .then(function(data) {
          return data;
        });
    } else if(type === "rss") {
      return RssRead.rss(body, option.url).then(function(data) {return data;});
    } else {
      throw new Error("body is not RSS or ATOM");
    }
  });
};

RssRead.identify = function(xml) {
  if (/<(rss|rdf)\b/i.test(xml)) {
    return "rss";
  } else if (/<feed\b/i.test(xml)) {
    return "atom";
  } else {
    return false;
  }
}

RssRead.atom = function(xml, source) {
  var parser = new FeedParser(),
    articles = [],
    article;
  parser.onopentag = function(tag) {
    if (tag.name == "entry") article = tag;
  };

  parser.onclosetag = function(tagname, current_tag) {
    if (tagname == "entry") {
      articles.push(article);
      article = null;
    }
  };
  parser.onend = function() {
    articles = _.filter(_.map(articles,
      function(art) {
        if (!art.children.length) return false;
        var obj = {
          title:     child_data(art, "title")
          , content:   scrub_html(child_data(art, "content:encoded"))
          || scrub_html(child_data(art, "description"))
          , published: child_data(art, "pubDate")
          , link:      child_data(art, "link")
        };
        if (obj.published) obj.published = new Date(obj.published);
        return obj;
      }
    ), function(art) { return !!art; });
    resolve(articles);
  };
};

RssRead.rss = function(xml, source) {
  return new Promise(function(resolve, reject) {
    var parser = new FeedParser(),
      articles = [],
      article;
    parser.onopentag = function(tag) {
      if (tag.name == "item") article = tag;
    };
    parser.onclosetag = function(tagname, current_tag) {
      if (tagname == "item") {
        articles.push(article);
        article = null;
      }
    };

    parser.onend = function() {
      articles = _.filter(_.map(articles,
        function(art) {
          if (!art.children.length) return false;
          var obj = {
            title:     child_data(art, "title")
            , content:   scrub_html(child_data(art, "content:encoded"))
            || scrub_html(child_data(art, "description"))
            , published: child_data(art, "pubDate")
            , link:      child_data(art, "link")
          };
          if (obj.published) obj.published = new Date(obj.published);
          return obj;
        }
      ), function(art) { return !!art; });
      resolve(articles);
    };
    parser.write(xml);
  });
};


var FeedParser = (function() {
  function FeedParser() {
    this.current_tag = null;
    var parser = this.parser = sax.parser(true,
      {
        trim: true,
        normalize: true
      });
    var self        = this;
    parser.onopentag  = function(tag) {self.open(tag);};
    parser.onclosetag = function(tag) {self.close(tag);};

    parser.onerror = function(err) {
      this.error = err;};
    parser.ontext  = function(text) {self.ontext(text);};
    parser.oncdata = function(text) {self.ontext(text);};
    parser.onend   = function() {self.onend();};
  }
  FeedParser.prototype.write = function(xml) {
    this.parser.write(xml).close();
  };
  FeedParser.prototype.open = function(tag) {
    tag.parent   = this.current_tag;
    tag.children = [];
    if (tag.parent) tag.parent.children.push(tag);
    this.current_tag = tag;
    this.onopentag(tag);
  };
  FeedParser.prototype.close = function(tagname) {
    this.onclosetag(tagname, this.current_tag);
    if (this.current_tag && this.current_tag.parent) {
      var p = this.current_tag.parent;
      delete this.current_tag.parent;
      this.current_tag = p;
    }
  };
  FeedParser.prototype.ontext = function(text) {
    if (this.current_tag) {
      this.current_tag.children.push(text);
    }
  };
  return FeedParser;
})();



function scrub_html(html) {
  return html.replace(/<script.*<\/script>/gi, "");
}

function child_by_name(parent, name) {
  var children = parent.children || [];
  for (var i = 0; i < children.length; i++) {
    if (children[i].name == name) return children[i];
  }
  return null;
}

function child_data(parent, name) {
  var node  = child_by_name(parent, name);
  if (!node) return "";
  var children = node.children;
  if (!children.length) return "";
  return children.join("");
}

shared.rss = function(url, proxy) {
  var option = {};
  if(proxy) {
    option.proxy = proxy;
  }
  return new RssRead(url, proxy);
};

done();