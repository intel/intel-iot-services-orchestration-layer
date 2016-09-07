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
global.$Q = require("q");

var top_navbar = $("#top-navbar");
var side_bar = $("#side-bar");
var breadcrumb = $("#doc-path");
var doc_content = $("#doc-content");

var G = {
  doc: [],
  seg_1: null,
  seg_4: null
};

function ___(s) {
  return s.replace(/\s+|\//g, "___");
}

function find(arr, id) {
  if (!_.isArray(arr)) {
    return null;
  }
  return _.find(arr, x => x.id === id);
}

function scroll_to_top() {
  window.scrollTo(0, 0);
}

function page_404() {
  doc_content.html("404");
  scroll_to_top();
  resize();
}

function page_empty(path) {
  update_doc_path(path);
  doc_content.empty();
  resize();
}

function top_navbar_item_click(id, ch4) {
  var id4 = ch4 ? ch4.id : null;
  if (G.seg_1 == id && G.seg_4 == id4) {
    return;
  }

  if (G.seg_1 == id && G.seg_4 && !id4) {
    G.seg_4 = null;
    return;
  }

  G.seg_1 = id;
  G.seg_4 = id4;

  top_navbar.children("li").removeClass("active");
  top_navbar.children("#" + ___(id)).addClass("active");
  side_bar.empty();

  var topic = find(G.doc.children, id);
  if (!topic || !_.isArray(topic.children)) {
    return;
  }

  topic.children.forEach(function(x) {
    var path = id + "/" + x.id;
    var divx = $("<span id='" + ___(path) + "' class='doc-menu doc-book'>" + x.name + "</span>");
    var hx = x.doc ? $("<a href='#" + path + "'></a>").append(divx) : divx;

    side_bar.append($("<div class='doc-margin'></div>").append(hx));

    if (!_.isArray(x.children)) {
      return;
    }

    x.children.forEach(function(y) {
      var pathy = path + "/" + y.id;
      var divy = $("<div id='" + ___(pathy) + "' class='doc-menu doc-chapter'>" + y.name + "</div>");

      side_bar.append(y.doc ? $("<a href='#" + pathy + "'></a>").append(divy) : divy);

      if (!_.isArray(y.children) || y.children.length <= 0) {
        return;
      }

      var chy = $("<div class='section-list'></div>");

      side_bar.append(chy);

      var icon = $("<i class='glyphicon glyphicon-plus icon-right'></i>");
      icon.click((e)=> {
        e.stopPropagation();
        e.preventDefault();
        do_expcol();
      });

      divy.click(()=> {
        do_expcol();
      });
      divy.append(icon);

      if (decodeURI(location.hash) === ("#" + pathy) || y.children.indexOf(ch4) >= 0) {
        do_expcol();
      }

      function do_expcol() {
        var plus = icon.hasClass("glyphicon-plus");
        side_bar.find(".glyphicon-minus").removeClass("glyphicon-minus").addClass("glyphicon-plus");
        side_bar.find(".section-list").empty();
        if (plus) {
          y.children.forEach(z => {
            var pathz = pathy + "/" + z.id;
            var hz = $("<a href='#" + pathz + "'><div id='" + ___(pathz) +
              "' class='doc-menu doc-section" + (decodeURI(location.hash) === ("#" + pathz) ? " active" : "") +
              "'>" + z.name + "</div></a>");
            chy.append(hz);
          });
          icon.removeClass("glyphicon-plus").addClass("glyphicon-minus");
        }
      }
    });
  });
}


function setup_top_navbar() {
  //$("#doc-title").html(G.doc.name);

  G.doc.children.forEach(x => {
    var li = $("<li id='" + ___(x.id) + "'><a href='#" + x.id + "'>" + x.name + "</a></li>");
    top_navbar.append(li);
  });
}

function update_doc_path(path) {
  var sg = path.split("/");
  var ch = G.doc;
  var p2 = "";

  breadcrumb.append($("<li><a href='/'>Home</a></li>"));
  breadcrumb.append($("<li><a href='#'>" + G.doc.name + "</a></li>"));

  sg.forEach((seg, idx) => {
    ch = find(ch.children, seg);
    p2 += seg;

    var name = ch && ch.name || seg;
    var li = idx === sg.length - 1 || (idx !== 0 && !ch.doc) ?
      $("<li class='active'>" + name + "</li>") :
      $("<li><a href='#" + p2 + "'>" + name + "</a></li>");

    breadcrumb.append(li);
    p2 += "/";
  });
}

function load_path(path, callback) {
  side_bar.find("#" + ___(path)).addClass("active");
  update_doc_path(path);
  doc_content.load("./doc/" + encodeURI(path) + "/index.html", ()=> {
    if (callback) {
      callback();
    }
    else {
      scroll_to_top();
    }

    var imgs = doc_content.find("img");
    if (imgs.length > 0) {
      _.forEach(imgs.filter(".viewer"), img => {
        $(img).fancybox({
          type: "image",
          href: $(img).attr("src")
        });
      });

      imgs.one("load", resize);
    }
    else {
      resize();
    }
  });
}


function navigate_seg_1(ch) {
  if (!ch) {
    page_404();
    return;
  }

  top_navbar_item_click(ch.id);
  if (ch.doc) {
    load_path(ch.id);
    return;
  }

  if (!_.isArray(ch.children) || ch.children.length < 1 || !ch.children[0].doc) {
    page_empty(ch.id);
    return;
  }

  load_path(ch.id + "/" + ch.children[0].id);
}

function navigate_seg_2(id1, id2) {
  var ch = find(G.doc.children, id1),
      ch2 = ch && find(ch.children, id2);

  if (ch) {
    top_navbar_item_click(ch.id);
  }

  if (!ch || !ch2) {
    page_404();
    return;
  }

  if (ch2.doc) {
    load_path(ch.id + "/" + ch2.id);
    return;
  }

  if (!_.isArray(ch2.children) || ch2.children.length < 1 || !ch2.children[0].doc) {
    page_empty(ch.id + "/" + ch2.id);
    return;
  }

  load_path(ch.id + "/" + ch2.id + "/" + ch2.children[0].id);
}

function navigate_seg_3(id1, id2, id3) {
  var ch = find(G.doc.children, id1),
      ch2 = ch && find(ch.children, id2),
      ch3 = ch2 && find(ch2.children, id3);

  if (ch) {
    top_navbar_item_click(ch.id);
  }

  if (!ch || !ch3) {
    page_404();
    return;
  }

  var p3 = ch.id + "/" + ch2.id + "/" + ch3.id;

  if (ch3.doc) {
    load_path(p3, ()=> {
      var ch = ch3.children;
      if (ch3.navigator && _.isArray(ch) && ch.length > 0) {
        var ch4 = ch[0];
        var btn = $("<div class='center'><a class='margin-top btn btn-lg' href='#" +
          p3 + "/" + ch4.id + "'><i class='margin-right glyphicon glyphicon-step-forward'></i>" +
          (ch3.entry_message || ch4.name) + "</a></div>");
        doc_content.append(btn);
      }
      scroll_to_top();
    });
    return;
  }

  page_empty(p3);
}

function navigate_seg_4(id1, id2, id3, id4) {
  var ch = find(G.doc.children, id1),
      ch2 = ch && find(ch.children, id2),
      ch3 = ch2 && find(ch2.children, id3),
      ch4 = ch3 && find(ch3.children, id4);

  if (ch) {
    top_navbar_item_click(ch.id, ch4);
  }

  if (!ch || !ch4) {
    page_404();
    return;
  }

  var p3 = ch.id + "/" + ch2.id + "/" + ch3.id;
  var p4 = p3 + "/" + ch4.id;

  if (ch4.doc) {
    load_path(p3 + "/" + ch4.id, ()=> {
      var ch = ch3.children;
      if (ch3.navigator && _.isArray(ch) && ch.length > 0) {
        var idx = ch.indexOf(ch4);
        var prev = idx === 0 ? p3 : p3 + "/" + ch[idx - 1].id;
        var btns = $("<div class='right'><a class='btn' href='#" +
          prev + "'><i class='margin-right glyphicon glyphicon-step-backward'></i>Previous</a></div>");
        if (idx < ch.length - 1) {
          btns.append($("<a class='margin-left btn' href='#" +
            p3 + "/" + ch[idx + 1].id + "'>Next<i class='margin-left glyphicon glyphicon-step-forward'></i></a>"));
        }
        else {
          btns.append($("<a class='disabled margin-left btn'>Next<i class='margin-left glyphicon glyphicon-step-forward'></i></a>"));
        }
        doc_content.prepend(btns);
        doc_content.append(btns.clone().addClass("margin-top"));
      }
      scroll_to_top();
    });
    return;
  }

  if (ch3.doc && ch4.href) {
    load_path(p3, ()=> {
      side_bar.find("#" + ___(p4)).addClass("active");
      var h = doc_content.find("#" + ch4.href)[0];
      if (h) {
        var parent = h.parentElement;
        window.scrollTo(0, $(h).offset().top - $(parent).offset().top);
      }
    });
    return;
  }

  page_empty(p4);
}

function hashchange() {
  var hash = decodeURI(location.hash) || "#";

  breadcrumb.empty();
  side_bar.find(".doc-menu.active").removeClass("active");

  if (hash === "#") {
    if (G.doc.doc) {
      doc_content.load("./doc/index.html", scroll_to_top);
      return;
    }

    // redirect to first child
    navigate_seg_1(G.doc.children[0]);
    return;
  }

  var sg = hash.substr(1).split("/");

  if (sg.length <= 1) {
    var ch = find(G.doc.children, sg[0]);
    navigate_seg_1(ch);
    return;
  }

  if (sg.length === 2) {
    navigate_seg_2(sg[0], sg[1]);
    return;
  }

  if (sg.length === 3) {
    navigate_seg_3(sg[0], sg[1], sg[2]);
    return;
  }

  navigate_seg_4(sg[0], sg[1], sg[2], sg[3]);
}

function resize() {
  var docheight = $(document).height();
  var winheight = $(window).height();
  $('body').css('position', winheight < docheight ? "relative" : "absolute");
}

$(()=> {
  $Q($.ajax({
    type: "GET",
    url: "./doc/package.json"
  }).then(data => {
    G.doc = data;
    //console.log(data);

    setup_top_navbar();

    hashchange();
  })).done();
});

$(window).on("hashchange", hashchange).on("resize", resize);
