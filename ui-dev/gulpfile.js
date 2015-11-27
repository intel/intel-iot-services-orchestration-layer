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
var fs = require('fs');
var gulp = require("gulp");
var nib = require("nib");
var _ = require("lodash");
var browserify = require("browserify");
var watchify = require("watchify");
var babel = require("babelify");

// load plugins
var $ = require("gulp-load-plugins")();
var wiredep = require("wiredep").stream;
var mainBowerFiles = require("main-bower-files");


gulp.task("hope_css", function () {
  gulp.src("ui/styles/hope.styl")
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.stylus({use: nib(), import: ["nib"]}))
    .pipe($.plumber.stop())
    .pipe($.sourcemaps.write("."))
    .pipe(gulp.dest("public/css"));
});
 


function make_bundle(watch) {
    // add custom browserify options here
    var customOpts = {
      entries: "./ui/js/index.js",
      debug: true 
    };
    var opts = _.assign({}, watchify.args, customOpts);
    var _bundle = browserify(opts).transform(babel.configure({
      optional: ["es7.classProperties"]
    })); 

    if (watch) {
        _bundle = watchify(_bundle);
    }

    var f = function() {
      $.util.log("Starting browserify");
      var source = require("vinyl-source-stream");
      var buffer = require("vinyl-buffer");
      return _bundle.bundle()
          .on("error", function (err) { 
            console.log("\nError : " + err.message + "\n"); 
          })
          .pipe($.plumber())
          .pipe(source("hope.js"))
          .pipe(buffer())
          .pipe($.sourcemaps.init({loadMaps: true}))
          // Add transformation tasks to the pipeline here.
          //.pipe($.uglify())
          .on("error", $.util.log)
          .pipe($.plumber.stop())
          .pipe($.sourcemaps.write("."))
          .pipe(gulp.dest("public/js"));
    };
    if (watch) {
        _bundle.on("update", f);
    }
    return f;
}


gulp.task("hope_js", make_bundle(false));


// all 3rd party files into ui/*.html
gulp.task("wire_html", function() {
    return gulp.src("ui/*.html")
        .pipe($.plumber())
        .pipe(wiredep({
            directory: "ui/bower_components"
        }))
        .pipe($.plumber.stop())
        .pipe(gulp.dest("ui"));
});


// NOTE that this would result in vendor.js / vendor.css 
gulp.task("hope_html", ["wire_html"], function () {
    var jsFilter = $.filter("**/*.js");
    var cssFilter = $.filter("**/*.css");
    var assets = $.useref.assets({searchPath: [".tmp", "ui"]});

    return gulp.src("ui/*.html")
        .pipe($.plumber())
        .pipe(assets)
        .pipe(jsFilter)
        .pipe($.uglify())
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe(cssFilter.restore())
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.plumber.stop())
        .pipe(gulp.dest("public"));
});

gulp.task("hope_image", function() {
    return gulp.src("ui/images/**/*")
        .pipe(gulp.dest("public/images"));
});

gulp.task("fonts", function () {
    return gulp.src(["ui/bower_components/bootstrap/fonts/*", "ui/bower_components/font-awesome/fonts/*"])
        .pipe($.filter("**/*.{eot,svg,ttf,woff,woff2}"))
        .pipe($.flatten())
        .pipe(gulp.dest("public/fonts"));
});



gulp.task("clean", function () {
    return gulp.src(["public/*", ".tmp"], 
        { read: false }).pipe($.clean());
});

gulp.task("awesome", function() {
  var input = 'ui/bower_components/font-awesome/less/variables.less';
  var output = 'ui/js/lib/font-awesome.js';
  var icons = {};
  fs.readFileSync(input, 'utf8').match(/@fa-var-[^;]*/g).forEach(function (line) {
    var match = /@fa-var-(.*): \"\\(.*)\"/.exec(line);
    if (match) {
      icons[match[1]] = unescape("%u" + match[2]);
    }
  });
  fs.writeFileSync(output, "export default " + JSON.stringify(icons) + ";");
});

gulp.task("build", ["hope_css", "awesome", "hope_js", "hope_html", "hope_image", "fonts"], function() {
});

gulp.task("start", function () {
    require("opn")("http://localhost:8080");
});

gulp.task("watch_js", make_bundle(true)); // rebundle in case any dep changed

gulp.task("watch", ["watch_js"], function () {
    var server = $.livereload();
    server.changed();   // tricky that we need this to trigger the LR server
    // watch for changes
    gulp.watch([
        "public/*.html",
        "public/css/**/*",
        "public/js/**/*",
        "public/images/**/*",
        "public/fonts/**/*"
    ]).on("change", function (file) {
        server.changed(file.path);
    });

    gulp.watch("ui/images/**/*", ["hope_image"]);
    gulp.watch(["ui/styles/**/*.styl"], ["hope_css"]);
    gulp.watch("ui/*.html", ["hope_html"]);
    gulp.watch("bower.json", ["hope_html"]);
});
