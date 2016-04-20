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
// e.g. Stepper(3, 3) would generate sequence range as [-3, 3], and 
// it would split [0, 3] to 3 steps
// 0, 1, 2, 3, 2, 1, 0, -1, -2, -3, -2, -1, 0, ... 
// it would start this pattern after delay. It returns 0 if in delay period
function Stepper(range, number_of_splits, delay) {
  this.range = range;
  this.number_of_splits = number_of_splits;
  this.n = 0;
  this.delay = delay || 0;
}

Stepper.prototype.next = function() {
  if (this.delay > 0) {
    this.delay --;
    return 0;
  }
  // totally would be number_of_splits * 4 steps
  if (this.n === this.number_of_splits * 4) {
    this.n = 0;
  }
  var n = this.n ++;
  var f = 1;
  if (n > this.number_of_splits * 2) {
    n = n - this.number_of_splits * 2;
    f = -1;
  }
  return f * this.range * 
  (this.number_of_splits - Math.abs(this.number_of_splits - n)) / this.number_of_splits;
};


var stepper = new Stepper(3, 6, 12);

console.log("TB kernel")
shared.sensor.start(function() {
  var value = 23 + stepper.next();
  console.log("[TEMPERATURE B]:", value);
  sendOUT({
    T: value
  });
}, IN.interval);
