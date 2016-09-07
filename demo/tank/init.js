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
var spawn = require('child_process').spawn;
var m = require("mraa");
hub_shared.peerserver = spawn("node", ["./PeerServer/peerserver.js"], { cwd: __dirname});
console.log("webrtc peerserver start, spawn pid:", hub_shared.peerserver.pid);

//PWM

var servo_v = new m.Pwm(9);
var servo_h = new m.Pwm(3);
servo_v.period_ms(20);
servo_h.period_ms(20);
servo_v.pulsewidth_us(1200);
servo_h.pulsewidth_us(1200);
servo_v.enable(true)
servo_h.enable(true)
hub_shared.servo_h = servo_h;
hub_shared.servo_v = servo_v;
console.log("2 servos init");

//distanse
var distance_p = new m.Gpio(12);
var distance_a = new m.Aio(0);
distance_p.dir(m.DIR_OUT);
distance_p.write(1);
hub_shared.distance_p = distance_p;
hub_shared.distance_a = distance_a;
console.log("untra sound init")

//wheel
var left_dir = new m.Gpio(4);
var left_speed = new m.Gpio(5);
var right_speed = new m.Gpio(6);
var right_dir = new m.Gpio(7);
left_dir.dir(m.DIR_OUT);
left_speed.dir(m.DIR_OUT);
right_speed.dir(m.DIR_OUT);
right_dir.dir(m.DIR_OUT);
hub_shared.left_dir = left_dir;
hub_shared.left_speed = left_speed;
hub_shared.right_speed = right_speed;
hub_shared.right_dir = right_dir;
console.log("wheel init")

//gpio
var led_left = new m.Gpio(0);
var led_right = new m.Gpio(1);
var buzz = new m.Gpio(11);
var motion = new m.Gpio(10);
led_left.dir(m.DIR_OUT);
led_right.dir(m.DIR_OUT);
buzz.dir(m.DIR_OUT);
motion.dir(m.DIR_IN);
hub_shared.led_left = led_left;
hub_shared.led_right = led_right;
hub_shared.buzz = buzz;
hub_shared.motion = motion;
console.log("gpio init")
done();
