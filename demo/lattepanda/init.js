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
var http = require("http");
var five = require("johnny-five");
var serialPort = require("serialport");

var defaultPort = "COM3";

var board;

serialPort.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  
  if (port.manufacturer.toLowerCase().indexOf("arduino") > -1 || port.pnpId.toLowerCase().indexOf("usb") > -1){
    console.log("Arduino board discovered at: " + port.comName);
    defaultPort = port.comName;
    log("using port: " + defaultPort);

    // use default address, auto detected
    board = new five.Board({port: defaultPort, repl: false});

    // #################################################
    // main function
    board.on("ready", function () {
      
      // populate pin names
      initPinNames();
      
      // populate pin objects
      initPinWrites();
      
      // register reading hooks
      initPinReads();
      
      // populate the commands array
      initCommands();
      
      // create server after pin initialization
      createServer();
      server.listen(SCRATCH_PORT);
      
      //heartbeat();
      
      log("Server is listening");
      done();
      
    });

    // end main
    // #################################################


  }
  });
});





// for polling frequency calculation
var time = 0;
var count = 0;
var pollInterval = 50;


// Scratch listening port
var SCRATCH_PORT = 23456;
hub_shared.arduino_port = SCRATCH_PORT;

// frequency for checking serial port connection
var CONNECTION_TIMEOUT = 500;


// names of pins. e.g. "5", "13", "A3"
var pinNames  = [];

// Readings of Pins, not actual Pin objects.
var pinReads  = {};

// provide reading functions to override pinRead values
// Currently used when the servo is sweeping.
var pinReadFuncs = {};

// Writing Pins, actual Pin objects.
var pinWrites = {};

// Record wrote pin data, avoid fast re-write
var pinWroteData = {};

// servo objs
var servos = {};

// LCD, use LCD address as key
var lcds = {};

var lcdGuard = false;

// command objects. e.g. { "poll", function(){ /*returns pin data*/}}
var commands  = {};


// debug info flag
var debug = false;


// global http server
var server;


var MODE_OUTPUT = five.Pin.OUTPUT;
var MODE_SERVO  = five.Pin.SERVO;
var MODE_PWM  = five.Pin.PWM;




// #################################################
// Initialization setups
function initPinNames(){
  pinNames = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"
  ];
}


// ################################################
// create pins for writing

function initCommands(){
  commands = {
    "set_analog"  : setAnalog,
    "set_digital" : setDigital,
    "set_lcd"   : setLcd,
    "set_servo"   : setServo,
    "sweep_servo" : sweepServo,
    "stop_servo"  : stopServo,
    "reset_all"   : resetAll
  }
}

function initPinWrites(){

  pinNames.forEach(function(pinName){
    try{
      log(pinName);
      pinWrites[pinName] = new five.Pin({pin: pinName,mode: 0});
      //debug
      var injectPinName = "pin" + pinName;
      if (debug){
        board.repl.inject({
          injectPinName : pinWrites[pinName]
        })
      }
    } catch ( err ) {
      if (debug){
        dir(err);
        log(err.stack.split("\n"));
      }
    }
  });
}


function initPinReads(){
  Object.keys(pinWrites).forEach(function(pinName){
    try{
      var pin = pinWrites[pinName];

      log("initPinReads pinName: " + pinName + " type: " + pin.type + " mode: " + pin.mode);

      if (pin.type === 'analog'){
        pin.on("data", function(value){
          //pinReads[pinName] = (value / 1023 * 5).toFixed(2);
          pinReads[pinName] = value;
        });
      } else if (pin.type === 'digital'){
        pin.on("data", function(value){
          pinReads[pinName] = value;
        });
      }
    } catch (err){
      dir(err);
      log(err.stack.split("\n"));
    }
  });
}


// end init block
// #################################################


// #################################################
// for debugging
function dir(){
  var dataArray = new Array;
  for(var o in arguments) {
      dataArray.push(arguments[o]);
  }
  if (debug){
    console.dir.apply(this, dataArray);
  }
}


function log(){
  var dataArray = new Array;
  for(var o in arguments) {
      dataArray.push(arguments[o]);
  }
  //if (debug){
    console.log.apply(this, dataArray);
  //}
}
// #################################################



// #################################################
// command functions
function setDigital(params){

  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1],
    pinVal    = params[2];

  if (pinWrites[pinNumber] == null) {
    log("creating new pin " + pinNumber);
    try{
      var pin = new five.Pin(pinNumber);
      pinWrites[pinNumber] = pin;
      _registerPinRead(pin);
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
      
    }
  }

  log("pinNumber %d, pinVal %d", pinNumber, pinVal);

  if ( pinVal != pinWroteData[pinNumber] ){
    if (pinVal == 1) {
      pinWrites[pinNumber].high();
    } else {
      pinWrites[pinNumber].low();
    }
    
    pinReads[pinNumber] = pinVal;
    pinWroteData[pinNumber] = pinVal;
  }
  // TODO handle PWM
}

function setAnalog(params){

  // parse params, params[0] should be "set_analog"
  var pinNumber = params[1],
    pinVal    = params[2];

  if (pinWrites[pinNumber] == null) {
    log("creating new pin " + pinNumber);
    try{
      var pin = new five.Pin(pinNumber);
      pinWrites[pinNumber] = pin;
      _registerPinRead(pin);
      
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
    }
  }
  
  dir(pinWrites[pinNumber]);

  log("set analog pinNumber %s, pinVal %d", pinNumber, pinVal);

  pinWrites[pinNumber].write(pinVal);
  pinReads[pinNumber] = pinVal;

}


function _registerPinRead(pin){
  // pin.on("high", function(){
  //  pinReads[pinName] = 1;
  // });
  //
  // pin.on("low", function(){
  //  pinReads[pinName] = 0;
  // });
  //
  // pin.on("data", function(value){
  //  pinReads[pinName] = value;
  // });
}

function setLcd(params){
  
  if ( lcdGuard ) {
    return;
  } else {
    lcdGuard = true;
  }
  
  var address, string;

  // parse params, params[0] should be "set_analog"
  if (params.length == 3){
    address   = params[1],
    string    = params[2];
  } else if (params.length == 2){
    address   = "0x20";
    string    = params[1];
  }
  
  log("address: " + address);
  log("string: " + string);
  
  string = decodeURI(string);
  
  if (!lcds[address]) {
    log("creating lcd at address: " + address);
    lcds[address] = {
      obj: new five.LCD({ 
          controller: "PCF8574", // works for DF lcd
          address   : 0x20 + (Number(address - "0x20") || 0)
          }),
      msg: ""
    };
  }
  
  var lcd = lcds[address].obj;
  var msg = lcds[address].msg;
  
  if (msg != string){
    lcd.clear();
    lcd.blink();
    lcds[address].msg = string;
  
    lcd.print(string);
    log("lcd: "+ string);
  }
  
  lcdGuard = false;
  
  board.repl.inject({
    lcd: lcd
  });
}


function setServo(params){
  
  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1],
    degree    = params[2];
  
  var servo = servos[pinNumber];
  
  if (servo == null) {
    log("creating new servo " + pinNumber);
    try{
      servo = new five.Servo(pinNumber);
      servos[pinNumber] = servo;
      
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
      
    }
  }

  log("servoNumber %d, degree %d", pinNumber, degree);
  servo.to(degree);

  pinWrites[pinNumber].mode = MODE_SERVO;
  pinReads[pinNumber] = degree;
  
}


function stopServo(params){
  
  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1];
  
  var servo = servos[pinNumber];
  
  if (servo == null) {
    log("creating new servo " + pinNumber);
    try{
      servo = new five.Servo(pinNumber);
      servos[pinNumber] = servo;
      
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
      
    }
  }

  log("servoNumber %d stop", pinNumber);

  servo.stop();

  pinWrites[pinNumber].mode = MODE_SERVO;
  pinReads[pinNumber] = servo.value;

}


function sweepServo(params){
  
  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1];
  var servo = servos[pinNumber];
  
  if (servo == null) {
    log("creating new servo " + pinNumber);
    try{
      servo = new five.Servo(pinNumber);
      servos[pinNumber] = servo;
      
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
      
    }
  }

  log("servoNumber %d sweep", pinNumber);

  servo.sweep();

  pinWrites[pinNumber].mode = MODE_SERVO;
  pinReadFuncs[pinNumber] = function(){
    return servos[pinNumber].value;
  };
}

// writeLine is a function
function reportPins(writeLine){
  Object.keys(pinWrites).forEach(function(pinName){
    var readVal = pinReads[pinName];
    
    var pin = pinWrites[pinName];
    
    if (pin.type === "digital" && pin.mode != MODE_SERVO){
      readVal = readVal == 1 //? "true" : "false"
    }
    
    // overwrite with reading functions
    var func = pinReadFuncs[pinName];
    if (func){
      //log("calling reading func for %d", pinName);
      readVal = func();
    }
    
    var pinType = pin.type;
    
    var pinMode = pin.mode;
    
    // use "servo" to indicate servo reading
    if (pinMode == MODE_SERVO){
      pinType = "servo";
    }
    
    var line = [pinType+"/"+pinName, readVal].join(" ");
    // log(line);
    //writeLine(line);
    writeLine(pinName, readVal);
  });
}


function resetAll(){
  Object.keys(servos).forEach(function(pinName){
    var servo = servos[pinName];
    servo.stop();
  });
  
  Object.keys(lcds).forEach(function(address){
    if (lcds[address] && lcds[address].obj){
      var lcd = lcds[address].obj;
      lcd.clear();
      lcd.blink();
    }
  });
}


function heartbeat(){
  
  setInterval(function(){
    if (!isConnected()){
      log("Error: disconnected!")
      process.exit(1);
      // retry connection
    }
  }, CONNECTION_TIMEOUT);
  
}


// checks if the connection is alive
// using the check version api call from firmata lib
function isConnected(){
  
  // check version
  if (board.io.version.major){
    // check passed, reset data
    board.io.version = {};
    // call api to fill in the `version` field again
    board.io.reportVersion(function(){});
    return true;
  } else {
    return false;
  }
  
}


// #################################################
// create server async
function createServer(){

  server = http.createServer(function (request, response) {

    // start recording request entry time
    if (time == 0) {
      time = new Date().getTime();
    }
        
    if (request.url != '/poll') { // not poll
      // print non-polling command sent by Scratch
      
      dir(request.url);

      var params = request.url.substring(1).split("/");
      log(params);
      var command = params[0];
      
      var commandFunc = commands[command];

      // check board readiness again
      if (commandFunc && board.isReady){
        commandFunc(params);
        response.write("ok");
      }
      else {
        response.write("fail");
      }

    } else { // Polling
      var polljson = {};
      reportPins(function(key, value){
        polljson[key] = value;
      });
      response.write(JSON.stringify(polljson));
      
    } // end if
    
    count += 1;
    if (count % pollInterval == 0) {
      var currentTime = new Date().getTime();
      log((currentTime - time) / count);
      count = 0;
      time = currentTime;
    }
    
    response.end();
  });
}

