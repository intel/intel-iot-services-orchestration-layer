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
var MuteStream = require("mute-stream");
var chalk = require("chalk");


exports.enable_debug_shell = function() {
  // register Ctrl+C
  var ms = new MuteStream();
  ms.pipe(process.stdout);

  var readLine = require("readline");
  var rl = readLine.createInterface({
    input: process.stdin,
    output: ms
  });

  var bar = chalk.cyan("------------------------------------------------------------");
  var repl = require("repl");
  var debug_mode = false;

  rl.on("line", function(l) {
    if (l.toLowerCase() === "debug" && !debug_mode) {
      rl.pause();
      ms.mute();
      console.log(bar + "\n" + chalk.cyan("| DEBUG SHELL, enter ") + 
        chalk.red(".exit") + chalk.cyan(" or ") +
        chalk.red("Ctrl+C TWICE") +
        chalk.cyan(" to quit") + "\n" + bar);
      debug_mode = true;
      var r = repl.start({
        prompt: "HOPE>",
        input: process.stdin,
        output: process.stdout,
        useGlobal : true
      });



      r.on("exit", function() {
        console.log(bar + "\n" + chalk.cyan("| You may enter ") + 
          chalk.red("debug") + 
          chalk.cyan(" to start DEBUG again\n") + bar);
        debug_mode = false;
        rl.resume();
        ms.unmute();
        rl.prompt();
      });
    }
  });

  rl.on("SIGINT", function() {
    if (!debug_mode) {
      process.emit("SIGINT");
    }
  });

};