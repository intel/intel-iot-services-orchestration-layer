# Run iSOL on Edison + Start Kit

## Prerequisite
 - [Intel® Edison with Arduino Breakout Kit](http://www.dfrobot.com/index.php?route=product/product&path=166_167&product_id=1198)

 ![](./doc/pic/startkit/edison.jpg)

 - [DFRobot Starter Kit for Intel® Edison/Galileo](http://www.dfrobot.com/index.php?route=product/product&path=166_168&product_id=1200)

 ![](./doc/pic/startkit/startkit.jpg)

### Update the firmware of Edison board

 - Download the firmware from [https://github.com/jiangzidong/image4hope](https://github.com/jiangzidong/image4hope)
 - Flash the firmware according to the `readme.md` 

### Configure the network of Edison
see the [Edison Official Website](https://software.intel.com/en-us/iot/library/edison-getting-started) for details
You should login the Edison board via serialport or ssh, after the actions above

## Fetch pre-build iSOL
Download the `dist.tar` from [http://somewebsite](http://somewebsite), then put it into Edison via sdcard or scp. 

## Start iSOL
 - untar the tarball: `tar xvf dist.tar`
 - run startkit demo
```
 cd dist
 ./start_startkit.sh
```
Then you will see
```
start message broker ...
start center ...
start startkit hub ...
visit ip:8080 for develop, ip:3000 for ui view
```
 
## Create new APP (a helloworld example)

The sample on security area : It detect whether people moves in every 1s. If someone moves, it will be buzzing to alert.

### Assemble sensors/devices

 - Attach the [IO Expansion Shield for Arduino](http://www.dfrobot.com/index.php?route=product/product&product_id=1009&search=IO+Expansion&description=true) into Edison Arduino Board, then attach [RIP Sensor](http://www.dfrobot.com/index.php?route=product/product&product_id=1140&search=sen0171&description=true) into `GPIO0`, and attach [Buzzer](http://www.dfrobot.com/index.php?route=product/product&product_id=84&search=DFR0032&description=true) into `GPIO13`
 - All those things are included in the **DFRobot Starter Kit for Intel® Edison/Galileo**

![](./doc/pic/startkit/assemble.jpg)

### Create App

 - Open the browser in your host machine, make sure the machine is in the same network with Edison board.
 - Visit `<your edison ip>:8080` in browser
 - Create new App

![](./doc/pic/create_app.gif)

-    Edit the workflow: the PIR sensor reports its detection in 1s interval. If it detects that people moves, alarm the buzzer.
  - Don't forget to set the pin number of each sensor/device. PIR is in pin 0 and buzzer is in pin 13. 

![](./doc/pic/startkit/create_wf.gif)

-    Edit the UI: there is a **light** widget to show the PIR status.

![](./doc/pic/startkit/create_ui.gif)  

- Binding UI's data scource
 
 ![](./doc/pic/startkit/binding_ui.gif)

-    Start APP and visit the page for end-user
     - If the PIR sensor detects people move, the light in the sensor and user-page will be on, and buzzer starts buzzing

![](./doc/pic/startkit/end_user.gif)