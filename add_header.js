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
var fs = require("fs");
var program = require('commander');

program
  .version('0.0.2')
  .description('Utility for file header maintenance')
  .usage('[options] <pattern ...>')
  .option('-h, --head [path]', 'header file')
  .option('-o, --old [path]', 'old header file')
  .option('-n, --suppress', 'suppress the <newline> in output')
  .option('-c, --comment', 'wrap as block comment')
  .parse(process.argv);

if (!program.args.length || !program.head) {
  program.help();
  process.exit(0);
}

var BEGIN = "/******************************************************************************\n";
var END = "*****************************************************************************/\n";

function read_header(file) {
  var header = fs.readFileSync(file, 'utf8');

  if (!program.suppress) {
     header = header + "\n";
  }
  if (program.comment) {
    header = BEGIN + header + END;
  }
  return header;
}

try {
  var header = read_header(program.head);

  if (program.old) {
    var old = read_header(program.old);
  }
} catch(e) {
  console.error(e);
  process.exit(-1);
}

program.args.forEach(function(file) {
  var content = fs.readFileSync(file, 'utf8');
  if (header === content.slice(0, header.length)) {
    console.log(file, " [skiped]");
    return;
  }

  var replaced = false;
  if (old && old === content.slice(0, old.length)) {
    content = content.slice(old.length);
    replaced = true;
  }

  fs.writeFileSync(file, header + content, 'utf8');
  console.log(file, replaced ? " [replaced]": " [added]");
});
