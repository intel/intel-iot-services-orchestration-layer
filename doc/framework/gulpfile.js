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

var gulp = require("gulp");
var nib = require("nib");
var _ = require("lodash");
var browserify = require("browserify");
var watchify = require("watchify");
var babel = require("babelify");

// load plugins
var $ = require("gulp-load-plugins")();

var RELEASE = process.env.NODE_ENV === "production";
var DEBUG = !RELEASE;

gulp.task("doc_css", function () {
  gulp.src("ui/styles/doc.styl")
    .pipe($.plumber())
    .pipe($.if(DEBUG, $.sourcemaps.init()))
    .pipe($.stylus({use: nib(), import: ["nib"]}))
    .pipe($.plumber.stop())
    .pipe($.if(DEBUG, $.sourcemaps.write(".")))
    .pipe(gulp.dest("public/css"));
});
 


function make_bundle(watch) {
    // add custom browserify options here
    var customOpts = {
      entries: "./ui/js/index.js",
      debug: DEBUG
    };
    var opts = _.assign({}, watchify.args, customOpts);
    var _bundle = browserify(opts).transform(babel.configure({
      sourceMap: RELEASE ? false : "inline",
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
            console.log(err); 
          })
          .pipe($.plumber())
          .pipe(source("doc.js"))
          .pipe(buffer())
          .pipe($.if(DEBUG, $.sourcemaps.init({loadMaps: true})))
          // Add transformation tasks to the pipeline here.
          .pipe($.if(RELEASE, $.uglify()))
          .on("error", $.util.log)
          .pipe($.plumber.stop())
          .pipe($.if(DEBUG, $.sourcemaps.write(".")))
          .pipe(gulp.dest("public/js"));
    };
    if (watch) {
        _bundle.on("update", f);
    }
    return f;
}


gulp.task("doc_js", make_bundle(false));

// NOTE that this would result in vendor.js / vendor.css 
gulp.task("doc_html", function () {
    return gulp.src("ui/*.html")
        .pipe($.plumber())
        .pipe($.useref({searchPath: ["."]}))
        .pipe($.if(RELEASE, $.if("*.js", $.uglify())))
        .pipe($.if(RELEASE, $.if("*.css", $.csso())))
        .pipe($.plumber.stop())
        .pipe(gulp.dest("public"));
});

gulp.task("doc_image", function() {
    return gulp.src("ui/images/**/*")
        .pipe(gulp.dest("public/images"));
});

gulp.task("fonts", function () {
    return gulp.src("node_modules/bootstrap/fonts/*")
        .pipe($.flatten())
        .pipe(gulp.dest("public/fonts"));
});


gulp.task("clean", function () {
    return gulp.src(["public/*"], 
        { read: false }).pipe($.rimraf());
});

gulp.task("build", ["doc_css", "doc_js", "doc_html", "doc_image", "fonts"], function() {
});

gulp.task("watch_js", make_bundle(true)); // rebundle in case any dep changed

gulp.task("watch", ["watch_js"], function () {
    gulp.watch("ui/images/**/*", ["doc_image"]);
    gulp.watch(["ui/styles/**/*.styl"], ["doc_css"]);
    gulp.watch("ui/*.html", ["doc_html"]);
});
