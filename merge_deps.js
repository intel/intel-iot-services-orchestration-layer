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
// Merge the npm dependencies of specified (passed in as args)
// packages in ./dist/node_modules
// It would create a new package.json under ./dist

var args = process.argv;

args.shift();   // remove node
args.shift();   // remove path of this file

var fs = require("fs");


var all_deps = {};
var bundledDependencies = ["doc", "ui-dev", "ui-user", "ui-widgets"];


args.forEach(function(proj) {
  bundledDependencies.push("hope-" + proj);
  var deps = JSON.parse(fs.readFileSync(
    "./dist/node_modules/hope-" + proj + "/package.json")).dependencies;

  // TODO: We simply merge the entry, without considering the versions
  if (deps) {
    Object.getOwnPropertyNames(deps).forEach(function(k) {
      all_deps[k] = deps[k]; 
    });
  }
});

fs.writeFileSync("./dist/package.json", JSON.stringify({
  name: "iot-sol",
  version: require("./version"), 
  description: "Intel(r) IoT Services Orchestration Layer - HTML5 IDE + Node.js middleware to create and host distributed IoT Apps in minutes",
  main: "index.js",
  scripts: {
    test: "echo \"Error: no test specified\" && exit 1"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/01org/intel-iot-services-orchestration-layer.git"
  },
  keywords: [
    "iot",
    "graphical",
    "programming",
    "app",
    "dev"
  ],
  author: {
    name: "Jonathan Ding",
    email: "jonathan.ding@intel.com"
  },
  license: "BSD-3-Clause",
  bugs: {
    url: "https://github.com/01org/intel-iot-services-orchestration-layer/issues"
  },
  homepage: "https://github.com/01org/intel-iot-services-orchestration-layer#readme",

  dependencies: all_deps,
  bundledDependencies: bundledDependencies
}, null, "  "));

