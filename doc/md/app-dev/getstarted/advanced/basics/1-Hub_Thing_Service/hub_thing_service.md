# Hub, Thing and Service


## Service

In the IDE of creating workflow, we could drag various **Services** from the left panel and drop them into the center canvas. A **Service** represents something invokable functionality, i.e. it could accept some messages from its inports, and send out some messages through its outports.

The service, when dropped into the canvas, would be visualized as a block with some ports (inports and outports), please see [Use Service](#getstarted/advanced/use_service) for more details.


## Thing

These **Services** are actually functionalities of certain **Things**. A **Thing** could be a physical device, for example, a lamp, its "Services" could be "Turn ON", "Turn Off", "Set Color" etc. A **Thing** could be a collection of cloud services as well, for example, it could be a "DropBox", and its Services could be "store a file", "fetch a file" etc.


## Hub

**Things** are managed by "Hubs". For example, an Edison Board could be a **Hub**, it manages multiple sensors connected to it, and these sensors are "Things" and each may have some "report" **Service** to send out the data it colloect.


## Under the Hood

Internally inside Intel(r) IoT Services Orchestration Layer, each **Hub** is a Node.js process thats running some code provided by Intel(r) IoT Services Orchestration Layer. Each **Service** is some JavaScript code that running inside this Node.js process. You may see [Edit Service](#getstarted/advanced/edit_service) for more details.

## Example

As illustrated by the figure below, there are two **Hubs** (hub_a and hub_b) listed at the left side panel, each corresponding to a physical board (which has a Node.js process running on top of it).

On hub_a, "fan" is one of its **Things** which has a **Service** called "switch", which represents the phyiscal fan connected to the board.

![](./doc/pic/advanced/basics/Hub_Thing_Service.png){.viewer}