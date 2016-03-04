# Run iSOL on LattePanda

## Prerequisite
 - LattePanda Board with Windows 10 32bit inside

### Configure Windows
 - **git-bash:** download and install git-bash in [https://git-scm.com/downloads](https://git-scm.com/downloads)
 - **Node.js:** install [Node.js](https://nodejs.org/en/download/) with version >= 0.12.0. 
 
### Flash Firmata
TODO

## Fetch pre-build iSOL
Download the `dist_panda_win32_node0.12.zip` from [http://yun.baidu.com/share/link?shareid=152966760&uk=4178147136](http://yun.baidu.com/share/link?shareid=152966760&uk=4178147136)

## Start iSOL
 - unzip the `dist_panda_win32_node0.12.zip`
 - run lattepanda demo
```
 cd dist
 ./start_lattepanda.sh
```
Then you will see
```
start message broker ...
start center ...
start lattepanda hub ...
visit ip:8080 for develop, ip:3000 for ui view
```
 
## Create new APP (a helloworld example)
Use ui-widget **switch** to control the blue led in lattepanda.
 - Open the browser in your lattepanda or other host machine which is in the same network with lattepanda.
 - Visit `<your lattepanda ip>:8080` in browser
 - Create new App

![](./doc/pic/create_app.gif)

-    Edit the workflow: use **digitalWrite** service to control the led. Note that the pin of led is 13.

![](./doc/pic/lattepanda/create_wf.gif)

-    Edit the UI: there is a **switch** widget to send out *true* or *false* signals.

![](./doc/pic/lattepanda/create_ui.gif)  

- Binding UI's data scource: connect **switch** and **digitalWrite**
 
 ![](./doc/pic/lattepanda/binding_ui.gif)

-    Start APP and visit the page for end-user: you can see the changle of blue led, when you change the switch status

![](./doc/pic/lattepanda/end_user.gif)