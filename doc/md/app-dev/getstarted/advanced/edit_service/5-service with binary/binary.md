# Invoke Exsiting Executable Binaries or Scripts

If you already implemented the features use a executable binary, java file or other script files, you can easily invoke those existing executables in JavaScript, by the help of Nodejs's native module `child-process`.

[child-process](https://nodejs.org/api/child_process.html) provides the ability to spawn child processes, and in the child process, you can run any executables. You can see the Nodejs API doc for details.

The example is [lcd_display](https://github.com/01org/intel-iot-services-orchestration-layer/tree/master/node_modules/hope-demo/startkit/thing_bundle/lcd_keyboard/lcd_display) of startkit hub.

There is a executable binary `lcd` in the service folder. If you equip the lcd_keyboard on your edison board, and directly run `./lcd hello`, then you will see "hello" in the lcd screen.

In the `kernel.js`, we implemet the servcie as follows

```javascript
console.log("lcd_display", IN.content);
var spawn = require("child_process").spawn;
var child = spawn("./lcd", [IN.content], {cwd: __dirname});

child.on("exit", function(code) {
  if (code === 0) {
    sendOUT({status: true});
  } else {
    sendOUT({status: false});
    sendERR("lcd fail");
  }
});
``` 

We use the `spawn` function to fork a child process, and in the subprocess, we invoke the `lcd`.

So in a word, every exsiting executables can be wrapped as IoT SOL services, and the feature is supported by Node.js itself. 