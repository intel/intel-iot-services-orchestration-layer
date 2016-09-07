# Center, Hub and Broker


## Center

While the **Hub** manages the **Things** (which is collection of **Services**), **Center** manages all **Hubs**.

The **Center** provides the HTML5 Web IDE so that developers could navigate through a modern browser to create IoT applications. The UI defined by created IoT Application, is also provided by HTML5 so that end users could also use browser and navitage to **Center** to see the user interface of the application.

The **Workflows**, is the logic of the IoT application, which is defined by developers through drag and drop in the IDE, is also stored at **Center** and executed by **Center**. 

One thing need to mention is that the **Center** also have an embedded **Hub** in it, which is called as **Builtin Hub**. It provides a lot of builtin **Services** by default, and also hosts of virtual **Things** that represent the UI widgets used by the users.

## Broker

The **Workflow** uses **Services** managed by various **Hubs**. Therefore, during the execution of the **Workflow**, the **Center** need to communicate with these **Hubs** to send messages to and receive messages from the **Services** on these **Hubs**.

Such communication (send / receive or publish / subscribe of messages) happens with the help of a message **Broker**. The **Broker** acts like a proxy, a message (no matter from **Center** to **Hub** or from **Hub** to **Center**) is always sent to **Broker**, and **Broker** would correctly dispatch it to the right target. 

Intel(r) IoT Services Orchestration Layer allows to use multiple type of **Brokers**, for example, a **Broker** based on MQTT, or based on HTTP, etc. Please see [Configuration](#getstarted/advanced/configuration) for more details.

Advanced developers could enable more kind of **Brokers** by implemented a very limited set of APIs required by Intel(r) IoT Services Orchestration Layer.

## How to start Center, Hub and Broker

To start a **Center**, simply run `./center [config]`. The `[config]` is the path to a configuration file. It's optional and would use `./config.json` if it is omitted.

Similarly, running `./hub [config]` would start a **Hub**. `[config]` is similar as above.

The details of the `config.json` is described at [Configuration](#getstarted/advanced/configuration).

If one already have MQTT setup and started, he/she could use it as a **Broker** by doing some configuration in `config.json`. 

Otherwise, users may start a simple HTTP broker comes with this project, which uses HTTP to communicate with **Center** and **Hubs**. To start this HTTP broker, simpley run `./http_broker [port]`. `[port]` specifies the tcp/ip port for this broker, it uses 16666 by default if omitted. To use this HTTP broker, the `config.json` also need certain configuration as well.

There may be some helper scripts such as `./start_mock_demo.sh` etc., which would hide these details and start a **Center**, a **Broker** and some **Hubs** in one batch. 

## Illustration

The picture below illustrates the relationship between Center, Broker and Hubs.

![](./doc/pic/advanced/basics/Center_Broker_Hub.png){.viewer}