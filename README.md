Intel(r) IoT Services Orchestration Layer
====================================================
## Introduction

This is a solution that provides visual graphical programming for developing IoT applications.

The solution contains a HTML5 IDE running inside browser / WebView for developers to create the IoT application, including its internal logic (e.g. workflows) and its HTML5 based end user interface, through drag-and-drop in an easy and intuitiveway.

The solution also contains a distributed middleware running on top of Node.js to host and execute the IoT applications created by the IDE.

The middleware contains an Orchestration Center which runs the workflow engine to execute the logic, and web servers to host the HTML5 IDE for developers and HTML5 UI for end users. 

The middleware also contains one or multiple Service Hubs which actually manages the devices and cloud services in various procotols. The Service Hub roll up these information about services to Orchestration Center to let the developers create applications based on these services. The Service Hub also receives commands from Orchestration Center to actually invoke the services managed by it, according to the logic defined by workflows.

To understand this by a demo, please go through the instructions below and we do have a demo (with simulated devices and services) project as well.

## Important Notes

### Contribute to the Development Project

This project is called as a Release Project.

It is read only to host the releases, to help contribute to this project, please go to its Development Project (git URL to be published soon). 

The reason is that the solution is quite complicated. So for each release, it needs some building processing (e.g. package the modules, build the UI files etc.) from the Development Project. This brings trouble for end users who simply want to use this project instead of contributing to that.

So to make the installation much easier, we will build the Development Project and put the ready-to-run solution here. Thus end users no need to build by themselves if start from this Release Project. 

However, if you hope to contribute to this project (bug fix, new enhancements etc.), you should work on the Development Project instead of this.

### Proxies

As this is a solution based on Node.js, so the installation may touch npm (Node.js Package Manager) which would download and install dependant packages from internet.

So if you are behind a firewall / proxy, you may need to configure the proxy settings of your npm so you could download and install. You may do this by run `npm config edit` to open npm's configuration file, and configure related proxy items inside it. For example, add these lines in it

```
proxy=http://my_proxy:proxy_port
https-proxy=http://my_proxy:proxy_port
```

Please replace the `my_proxy` and `proxy_port` in above example accordingly.

## Installation

First, Node.js with version >= 0.12 is required. And you might need to configure npm proxy settings as mentioned above.

Secondly, if you are using Windows, you need a shell environment to run scripts. You may install cygwin, or gitbash (which is a MingGW)

With that, under the shell, you may `git clone` this project (or download the zip and uncompress it) and `npm install` under it for necessary additional packages. Below is an example of installing it 

```shell
  # Instead of git clone, you may download the zip of project through
  # github webpage and then uncompress it
  git clone https://github.com/01org/intel-iot-services-orchestration-layer

  cd intel-iot-services-orchestration-layer

  # this would install all dependent npm packages for this
  npm install
```


## Documentation

You may choose ANY of the following options to read the documentation.

* Run `./start_doc.sh`
* In the HTML5 IDE of this solution, click the link `Help` on the top right 
* (Under Construction...) Read the [wiki of this project] (https://github.com/01org/intel-iot-services-orchestration-layer/wiki)

### Demos

To help understand the framework, a demo project is created. There are couple ways to run the demo project. 

### Run Demo in Seperated Shells

One way is to run the Broker, Center and Hub in seperated shells. (Please read the documentation for the concepts of Broker, Center and Hub).

Firstly, open a shell and start a Broker based on HTTP in it.
```shell
    # Kill all existing Node.js processes
    # This only needed to do once before start Broker
    killall node 2>/dev/null

    # Start a sample HTTP Broker
    ./run_demo broker
```

Then open another shell and start the center
```shell
    # Start a sample Center
    ./run_demo center
```

Then open another shell and start a Hub (named hub_a)
```shell
    # Start a sample Hub
    ./run_demo hub 
```

(Optional) You may open the 4th shell to start another Hub (named hub_b), although this isn't always necessary
```shell
    # Start another sample Hub
    ./run_demo hub_b 
```


After that, you may navigate to `http://localhost:8080` in browser for HTML5 UI for application developers, and `http://localhost:3000` for HTML5 UI for end users. You may replace localhost to real ip/host if you need to remotely connect to it.

### Run Demo with One Command

Above explains the details of running the demo, we have created a helper script to include all of the above, so instead of openning 4 shells and start related components, you may run the demo via running this script:

```shell
  # This contains all steps above
  ./start_mock_demo.sh
```

After that, it is the same as above, i.e. open the browser to navigate the UIs.

If running in this way, there would be logs saved as `xxx.log`. `xxx` corresponds to broker, center, mock_hub, mock_hub_b etc.

