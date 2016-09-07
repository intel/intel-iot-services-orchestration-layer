Import node-red workflow
=============================
## Introduction

This feature allow user import Node-RED workflow into Intel IoT SOL (IoT Services Orchestration Layer) project.

## use

Firstly, has at least one workflow on Node-RED website.

Secondly, deploy the workflow.

Thirdly,  open a folder './node-red' (located same as Node-RED project), then can see a json file with a name format like flows_****.json,  '****'is the hostname of your computer. For eaxmple, my computer hostname is 'yaqunliu-MOBL',so the workflow file's name is 'flow_yaqunliu-MOBL.json'

Finally, login Intel IoT SOL (IoT Services Orchestration Layer) project. click 'workflow' button to show a dialog then click 'import' menu button and select 'Node-RED Workflow' to click , choose the previous json file you see and click open.

Note: the workflow file will defaultly locate at root category of './node-red' when depoly ,you may change it by set some config, someone who has interst can try it.


## Example

Node-RED workflow's location
<br/>
![](./doc/pic/advanced/use_service/import_nodered_workflow1.png){.viewer}


<br/>
In this animated gif, you can  see how to open 'import Node-RED Workflow' channel, how to import Node-RED workflow and open the workflow in our Iot SOL project.
<br/>

![](./doc/pic/advanced/use_service/import_nodered_workflow2.gif){.viewer}


<br/>

Edit node-red service
==========================
##Introduction

If you drag-and-drop a node-red service from the left sidebar under title of nodered or import a  Node-RED workflow into Intel IoT SOL (IoT Services Orchestration Layer) project then want to edit the service, you can double click the service or click the button on the right sidebar to open a  config dialog. And then will apprear a dialog , you can config them like in Node-RED project.


## Example 

One situation: drag-and-drop Node-RED service from Iot SOL project 
under 'nodered' title of left sidebar, drap-and-drop service


![](./doc/pic/advanced/use_service/node_red_config1.gif){.viewer}



set the service's configuration

![](./doc/pic/advanced/use_service/node_red_config2.gif){.viewer}

<br/>

Another situation: imported Node-RED workflow ,ex: previous imported workflow: can set 'websocket out' service's configuration by directly double-click the service or click the service then click 'Click Here' button on the right sidebar. 

<br/>
![](./doc/pic/advanced/use_service/node_red_config3.gif){.viewer}



<br/>

Isol service and node-red service mixed-use
==============================================
##Introduction

A workflow can not only composed by Iot SOL service or Node-RED service, but also can composed by Iot SOL service and Node-RED service. you can try by this way, and achieve a different idea by mixed Isol service and node-red service.

## Example

There are four service : inject and range (Node-RED service),random (Iot SOL service), a Gauge widgets. Then line them to creat a workflow: line inject service output to random service trigger input ,line random service output to range service input and finally line range service output to Gauge widgets value input.

Some configuration: set random service's max value as 100; double-click to open range service's config dialog, set ' Map the input range' as '0' to '100', and set 'to the result range' as '50' to '90'.

Execute the workflow: use inject service to trigger random service creat a number between '0' and  '100', because range service's input range is '0' to '100',so it can accept the number create by random service, and then translate it to a number range from '50' to '90' .Guage widgets recept the number from 'value' input ,then we can see the pointer of Guage walk.

![](./doc/pic/advanced/use_service/IotSOL_NodeRED_workflow1.png){.viewer}

<br/>

![](./doc/pic/advanced/use_service/IotSOL_NodeRED_workflow2.gif){.viewer}


