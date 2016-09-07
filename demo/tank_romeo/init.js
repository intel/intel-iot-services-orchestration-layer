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


//I2C
var i2c = new m.I2c(1);
hub_shared.i2c = i2c;

// wheel


function i2c_write(v1, v2) {
  i2c.address(4);
  var buf = new Buffer(5);
  buf[0] = 0x55;
  buf[1] = 0xaa;
  buf[2] = v1;
  buf[3] = v2;
  buf[4] = buf[0] + buf[1] + buf[2] + buf[3];
  i2c.write(buf);
}

function stop() {
  //i2c_write(0xb1, 1);
  //i2c_write(0xb2, 1);
  i2c_write(0xc1, 0);
  i2c_write(0xc2, 0);
}

function forward() {
  i2c_write(0xb1, 1);
  i2c_write(0xb2, 1);
  i2c_write(0xc1, 0xff);
  i2c_write(0xc2, 0xff);
}

function backward() {
  i2c_write(0xb1, 0);
  i2c_write(0xb2, 0);
  i2c_write(0xc1, 0xff);
  i2c_write(0xc2, 0xff);
}

function left() {
  i2c_write(0xb1, 1);
  i2c_write(0xb2, 0);
  i2c_write(0xc1, 0xff);
  i2c_write(0xc2, 0xff);
}

function right() {
  i2c_write(0xb1, 0);
  i2c_write(0xb2, 1);
  i2c_write(0xc1, 0xff);
  i2c_write(0xc2, 0xff);
}

hub_shared.tank_forward = forward;
hub_shared.tank_backward = backward;
hub_shared.tank_stop = stop;
hub_shared.tank_left = left;
hub_shared.tank_right = right;

stop();
console.log("wheel init");




//PWM
var servo_v = new m.Pwm(14);
var servo_h = new m.Pwm(20);
servo_v.period_ms(20);
servo_h.period_ms(20);
servo_v.pulsewidth_us(1300);
servo_h.pulsewidth_us(1300);
servo_v.enable(true)
servo_h.enable(true)
hub_shared.servo_h = servo_h;
hub_shared.servo_v = servo_v;



hub_shared.base_angle=90;
hub_shared.top_angle=90;
var MIN=500;
var MAX=2100;


function rotate_h(angle) {
  var angle = Math.min(Math.max(0, angle), 180);
  hub_shared.base_angle=angle;
  var pulse = Math.round(MIN + (MAX - MIN) / 180 * angle);
  hub_shared.servo_h.pulsewidth_us(pulse);
}

function rotate_v(angle) {
  var angle = Math.min(Math.max(40, angle), 150);
  hub_shared.top_angle = angle;
  var pulse = Math.round(MIN + (MAX - MIN) / 180 * angle);
  hub_shared.servo_v.pulsewidth_us(pulse);
}

function rotate_up() {
  hub_shared.top_angle=Math.min(Math.max(40, hub_shared.top_angle+10), 150);
  rotate_v(hub_shared.top_angle);
  return hub_shared.top_angle;
}

function rotate_down() {
  hub_shared.top_angle=Math.min(Math.max(40, hub_shared.top_angle-10), 150);
  rotate_v(hub_shared.top_angle);
  return hub_shared.top_angle;
}

function rotate_left() {
  hub_shared.base_angle=Math.min(Math.max(0, hub_shared.base_angle+10), 180);
  rotate_h(hub_shared.base_angle);
  return hub_shared.base_angle;
}


function rotate_right() {
  hub_shared.base_angle=Math.min(Math.max(0, hub_shared.base_angle-10), 180);
  rotate_h(hub_shared.base_angle);
  return hub_shared.base_angle;
}


hub_shared.rotate_h = rotate_h;
hub_shared.rotate_v = rotate_v;
hub_shared.rotate_right = rotate_right;
hub_shared.rotate_left = rotate_left;
hub_shared.rotate_up = rotate_up;
hub_shared.rotate_down = rotate_down;
console.log("2 servos init");

//distanse
var p2 = new m.Gpio(13);
p2.dir(m.DIR_OUT);
p2.write(1);
function measure_distance() {

  var buf = new Buffer(5);
  buf[0] = 0x55;
  buf[1] = 0xaa;
  buf[2] = 0xa0;
  buf[3] = 1
  buf[4] = buf[0] + buf[1] + buf[2] + buf[3]

  p2.write(0);
  p2.write(1);

  i2c.address(4);
  i2c.write(buf);

  i2c.address(4);
  var resbuf = i2c.read(5);

  var value = resbuf[2] + resbuf[3]*256;

  return value*0.718;
}
hub_shared.measure_distance = measure_distance; 
console.log("untra sound init")


//gpio
var led_left = new m.Gpio(33);
var led_right = new m.Gpio(51);
var buzz = new m.Gpio(0);
var motion = new m.Gpio(38);
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
