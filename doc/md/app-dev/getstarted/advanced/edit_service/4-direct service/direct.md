# Direct Control/Calulate in JavaScript

IoT SOL is based on Node.js, so it is the most staightfoward method to implement the service in JavaScript. Majority of our builtin services belong to this category.

Besides the special function (e.g. `sendOUT`) and the special variable (e.g. `shared` and `IN`), you can write just like a standard Nodejs program. You can require any 3rd-party npm modules as long as the module is in your module search path.

In the [led's switch service](https://github.com/01org/intel-iot-services-orchestration-layer/blob/master/demo/startkit/thing_bundle/led/switch/start.js), we require the `mraa` module. [MRAA](https://github.com/intel-iot-devkit/mraa) is a builtin node module on Edison Image for controling peripherals.

Led switch's start.js

```javascript
var m = require("mraa");
shared.pin = new m.Gpio(CONFIG.pin);
done();
```

Led switch's kernel.js

```javascript
console.log("led switch:", IN.on, CONFIG.pin);
shared.pin.dir(0);
var value = 0;
if (IN.on) {
  value = 1;
}
shared.pin.write(value);
sendOUT({status : !!IN.on});
```