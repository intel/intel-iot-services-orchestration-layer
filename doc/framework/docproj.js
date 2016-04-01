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
var path = require("path");
var fs = require("fs");
var util = require("util");
var child_process = require("child_process");
var _ = require("lodash");
var ncp = require("ncp");

var J = path.join;

function check_args() {
  if(process.argv.length !== 4) {
    console.error("Usage:\n\tnode docproj.js md-dir html-dir");
    process.exit(-1);
  }
}

function check_pandoc() {
  try {
    child_process.execSync("pandoc --version");
  }
  catch(e) {
    console.error("No pandoc command found, Please install it and try again.")
    process.exit(0);
  }
}

function rel2html(src, tgt, pkg, child) {
  var relp = tgt.replace(htmldir, "");
  var reldir = pkg["rel-dir"];
  var files = _.isString(child.files) ? [child.files] : child.files;
  var id = child.id || child.name;
  
  // combine all md
  var md = "";
  files.forEach(function(f) {
    var p = J(src, J(reldir, f));
    md = md + "\n\n\n" + fs.readFileSync(p, "utf-8");
  });

  var pics = [];

  // replace the prefix of path, search ![]( IMAGE_FILE_PATH )
  var rximg = /\!\[\]\(([^\)]+)/gm;
  var s;
  while ((s = rximg.exec(md)) !== null) {
    pics.push(s[1]);
  }
  pics = _.uniq(pics);

  pics.forEach(function(f) {
    var p = J(src, J(reldir, f));
    var t = J(tgt, path.basename(f));

    if (!fs.existsSync(p)) {
      console.error("File not found:", p);
      return;
    }

    if (fs.existsSync(t)) {
      fs.unlinkSync(t);
    }
    fs.linkSync(p, t);

    var oldstr = "![](" + f;
    var newstr = "![](./doc" + relp + "/" + path.basename(f);
    md = md.split(oldstr).join(newstr);
  });

  var children = [];

  // get all the service's name, starts with ##
  if (child.scan) {
    var relscrex = pkg["rel-scan-regexp"];
    var rex = _.isString(child.scan) ? child.scan : child.scan === true && relscrex ? relscrex : "^\#\#\s(.+)";
    var hashhash = new RegExp(rex, "gm");
    var s;
    while ((s = hashhash.exec(md)) !== null) {
      var name = s[1].trim();
      children.push({
        id: name,
        name: name,
        href: name
      });
    }
  }

  if (_.isArray(child.children)) {
    child.children.forEach(function (c) {
      var id, name, href;
      if (_.isString(c)) {
        id = name = href = c;
      }
      else {
        id = c.id || c.name;
        name = c.name || c.id;
        href = c.href || c.id || c.name;
      }
      children.push({
        id: id,
        name: name,
        href: href
      });
    });
  }

  tgt = J(tgt, id);
  if (!fs.existsSync(tgt)) {
    fs.mkdirSync(tgt);
  }

  // save as tmp file, and invoke pandoc convert to HTML
  var tmp = J(".", Date.now() + ".md");
  fs.writeFileSync(tmp, md, "utf-8");

  try {
    var cmd = "pandoc -o \"" + J(tgt, "index.html\" ") + tmp;
    //console.log(cmd);
    child_process.execSync(cmd);
  }
  catch(e) {
    console.error(e)
  }
  fs.unlinkSync(tmp);

  return {
    id: id,
    name: child.name,
    doc: true,
    children: children
  };
}

function md2html(src, tgt, id) {
  var pkg = {
    exclude: [],
    id: id,
    name: id
  };

  try {
    var json = JSON.parse(fs.readFileSync(J(src, "package.json"), "utf-8"));
    _.merge(pkg, json);

    if (_.isString(pkg.exclude)) {
      pkg.exclude = [pkg.exclude];
    }
  }
  catch(e) {}

  var subdir = [];
  var md = [];

  var entires = pkg.subdir || fs.readdirSync(src).sort();
  //console.log(entires);

  entires.forEach(function(entry) {
    if (_.includes(pkg.exclude, entry)) {
      return;
    }

    var p = J(src, entry);
    var stat = fs.statSync(p);
    if (stat.isDirectory()) {
      subdir.push(entry);
    }
    else if (stat.isFile() && _.endsWith(p, ".md")) {
      md.push(entry);
    }
  });

  if (pkg.subdir) {
    fs.readdirSync(src).sort().forEach(function(entry) {
      if (_.includes(pkg.exclude, entry)) {
        return;
      }

      var p = J(src, entry);
      var stat = fs.statSync(p);
      if (stat.isFile() && _.endsWith(p, ".md") && !_.includes(md, entry)) {
        md.push(entry);
      }
    });
  }

  if (!fs.existsSync(tgt)) {
    fs.mkdirSync(tgt);
  }

  if (md.length > 0) {
    var srcs = md.map(function(m) {
      return '"' + J(src, m) + '"';
    });

    try {
      var cmd = "pandoc -o \"" + J(tgt, "index.html\" ") + srcs.join(" ");
      //console.log(cmd);
      child_process.execSync(cmd);
    }
    catch(e) {
      console.error(e)
    }
    pkg.doc = true;
  }

  if (subdir.length > 0) {
    var children = [];

    subdir.forEach(function(dir) {
      var child = md2html(J(src, dir), J(tgt, dir), dir);
      children.push(child);
    });
    pkg.children = children;
  }

  pkg.exclude.forEach(function(dir) {
    ncp(J(src, dir), J(tgt, dir));
  });

  var relchildren = pkg["rel-children"];
  if (_.isArray(relchildren) && relchildren.length > 0) {
    var children = pkg.children || [];

    relchildren.forEach(function(child) {
      children.push(rel2html(src, tgt, pkg, child));
    });

    pkg.children = children;
    delete pkg["rel-children"];
    delete pkg["rel-dir"];
  }

  delete pkg.exclude;
  delete pkg.subdir;
  return pkg;
}


check_args();
check_pandoc();

var cwd = process.cwd();
var mddir = J(cwd, process.argv[2]);
var htmldir = J(cwd, process.argv[3]);
var pkg = md2html(mddir, htmldir, path.basename(process.argv[2]));

try {
  fs.writeFileSync(J(htmldir, "package.json"), JSON.stringify(pkg));
}
catch(e) {
  console.error(e);
}

//console.log(util.inspect(pkg, {depth: 6}));
