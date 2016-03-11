# Run iSOL on Linux

iSOL runs on a general PC with Linux OS

## Prerequisite
 - We test it on **Ubuntu 14.04**, but other distributions and versions should also work.
 - **Node.js:** install nodejs with version >= 0.12.0. It is recomanded to install nodejs with `nvm`
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.30.1/install.sh | bash
nvm install 0.12.0
nvm alias default 0.12.0
```

## Fetch Pre-built iSOL

 - For x86 OS, download the `dist.tar` from [http://somewebsite](http://somewebsite) 
 - For x64 OS, download the `dist.tar` from [http://somewebsite](http://somewebsite)

## Start iSOL
 - untar the tarball: `tar xvf dist.tar`
 - run iSOL demo
```
 cd dist
 ./start_mock_demo.sh
```
Then you will see
```
start message broker ...
start center ...
start mock hub_a ...
start mock hub_b ...
visit ip:8080 for develop, ip:3000 for ui view
```
 
## Create new APP (a Helloworld example)
 - Visit `<your linux ip>:8080` in browser
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
