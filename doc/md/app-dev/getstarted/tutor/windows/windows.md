# Run iSOL on Windows

iSOL runs on a general PC with Windows OS

## Prerequisite

 - **git-bash:** download and install git-bash in [https://git-scm.com/downloads](https://git-scm.com/downloads)
 - **Node.js:** install [Node.js](https://nodejs.org/en/download/) with version >= 0.12.0. 

## Fetch Pre-built iSOL

 - For x86 OS, download the `dist.tar` from [http://somewebsite](http://somewebsite) 
 - For x64 OS, download the `dist.tar` from [http://somewebsite](http://somewebsite)

## Start iSOL
 - untar the tarball
 - open the bash in the folder `dist`
 - run iSOL demo: ` ./start_mock_demo.sh`
Then you will see

```
start message broker ...
start center ...
start mock hub_a ...
start mock hub_b ...
visit ip:8080 for develop, ip:3000 for ui view
``` 
 
## Create new APP (a Helloworld example)
 - Visit `<your windows ip>:8080` in browser
 - Create App

![](./doc/pic/create_app.gif)

-    Edit the Workflow using mockup devices/sensors
     - the **thermometer A** in *hub\_a* reports the temperature in every 1s. If the temperature value is above 27 degree, turn on the **fan** in *hub\_b*

![](./doc/pic/edit_wf.gif)

-    Edit the UI
     - **text**, **gauge** will show the temperature, and **fan** will show the fan status

![](./doc/pic/edit_ui.gif)

- Binding UI's data scource

![](./doc/pic/binding_ui.gif)

-    Start APP and visit the page for end-user
     - If the temperature is above 27, the fan will be turned on, otherwise, it will be turned off.

![](./doc/pic/end_user.gif)
