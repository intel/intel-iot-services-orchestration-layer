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
global.$Q = require("q");

var top_navbar = $("#top-navbar");
var side_bar = $("#side-bar");
var breadcrumb = $("#doc-path");

var G = {
  doc: [],
  seg_1: null
};

function ___(s) {
  return s.replace(/\//g, "___");
}

function top_navbar_item_click(id) {
  if (G.seg_1 === id) {
    return;
  }

  G.seg_1 = id;

  top_navbar.children("li").removeClass("active");
  top_navbar.children("#" + ___(id)).addClass("active");
  side_bar.empty();

  var topic = _.find(G.doc.children, c => c.id === id);
  if (topic && _.isArray(topic.children)) {
    topic.children.forEach(x => {
      var path = id + "/" + x.id;
      var h3 = x.doc ?
        $("<div class='doc-margin'><a href='#" + path + "'><span id='" + ___(path) + "' class='doc-menu doc-book'>" + x.name + "</span></a></div>") :
        $("<div class='doc-margin'><span id='" + ___(path) + "' class='doc-menu doc-book'>" + x.name + "</span></div>");

      side_bar.append(h3);

      if (_.isArray(x.children)) {
        x.children.forEach(y => {
          var path2 = path + "/" + y.id;
          var h4 = $("<a href='#" + path2 + "'><div id='" + ___(path2) + "' class='doc-menu doc-chapter'>" + y.name + "</div></a>");
          side_bar.append(h4);
        });
      }
    });
  }
}


function setup_top_navbar() {
  $("#doc-title").html(G.doc.name);

  G.doc.children.forEach(x => {
    var li = $("<li id='" + ___(x.id) + "'><a href='#" + x.id + "'>" + x.name + "</a></li>");
    top_navbar.append(li);
  });
}

function update_doc_path(path) {
  var segs = path.split("/");
  var ch = G.doc;
  var p2 = "";

  segs.forEach((seg, idx) => {
    ch = _.find(ch.children, c => c.id === seg);
    p2 += seg;

    var name = ch && ch.name || seg;
    var li = idx === segs.length - 1 || (idx !== 0 && !ch.doc) ?
      $("<li class='active'>" + name + "</li>") :
      $("<li><a href='#" + p2 + "'>" + name + "</a></li>");

    breadcrumb.append(li);
    p2 += "/";
  });
}

function load_path(path) {
  side_bar.find("#" + ___(path)).addClass("active");
  update_doc_path(path);
  $("#doc-content").load("./doc/" + path + "/index.html");
}


function navigate_seg_1(ch) {
  if (!ch) {
    $("#doc-content").html("404");
    return;
  }

  top_navbar_item_click(ch.id);
  if (ch.doc) {
    load_path(ch.id);
    return;
  }

  if (!_.isArray(ch.children) || ch.children.length < 1 || !ch.children[0].doc) {
    update_doc_path(ch.id);
    $("#doc-content").empty();
    return;
  }

  load_path(ch.id + "/" + ch.children[0].id);
}

function navigate_seg_2(id1, id2) {
  var ch = _.find(G.doc.children, c => c.id === id1),
      ch2 = ch && _.isArray(ch.children) && _.find(ch.children, c => c.id === id2);

  if (ch) {
    top_navbar_item_click(ch.id);
  }

  if (!ch || !ch2) {
    $("#doc-content").html("404");
    return;
  }

  if (ch2.doc) {
    load_path(ch.id + "/" + ch2.id);
    return;
  }

  if (!_.isArray(ch2.children) || ch2.children.length < 1 || !ch2.children[0].doc) {
    update_doc_path(ch.id + "/" + ch2.id);
    $("#doc-content").empty();
    return;
  }

  load_path(ch.id + "/" + ch2.id + "/" + ch2.children[0].id);
}

function navigate_seg_3(id1, id2, id3) {
  var ch = _.find(G.doc.children, c => c.id === id1),
      ch2 = ch && _.isArray(ch.children) && _.find(ch.children, c => c.id === id2),
      ch3 = ch2 && _.isArray(ch2.children) && _.find(ch2.children, c => c.id === id3);

  if (ch) {
    top_navbar_item_click(ch.id);
  }

  if (!ch || !ch3) {
    $("#doc-content").html("404");
    return;
  }

  if (ch3.doc) {
    load_path(ch.id + "/" + ch2.id + "/" + ch3.id);
    return;
  }

  if (!_.isArray(ch3.children) || ch2.children.length < 1 || !ch2.children[0].doc) {
    update_doc_path(ch.id + "/" + ch2.id + "/" + ch3.id);
    $("#doc-content").empty();
    return;
  }

  load_path(ch.id + "/" + ch2.id + "/" + ch2.children[0].id);
}

function hashchange() {
  var hash = location.hash || "#";
  //console.log(location.hash);

  breadcrumb.empty();
  side_bar.find(".doc-menu.active").removeClass("active");

  if (hash === "#") {
    if (G.doc.doc) {
      $("#doc-content").load("./doc/index.html");
      return;
    }

    // redirect to first child
    navigate_seg_1(G.doc.children[0]);
    return;
  }

  var segs = hash.substr(1).split("/");
  //console.log(segs);

  if (segs.length <= 1) {
    var ch = _.find(G.doc.children, c => c.id === segs[0]);
    navigate_seg_1(ch);
    return;
  }

  if (segs.length === 2) {
    navigate_seg_2(segs[0], segs[1]);
  }

  navigate_seg_3(segs[0], segs[1], segs[2]);
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

$(window).on("hashchange", hashchange);
