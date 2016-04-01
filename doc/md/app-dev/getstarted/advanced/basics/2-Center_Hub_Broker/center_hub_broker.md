# Center, Hub and Broker


## Center

While the **Hub** manages the **Things** (which is collection of **Services**), **Center** manages all **Hubs**.

The **Center** provides the HTML5 Web IDE so that developers could navigate through a modern browser to create IoT applications. The UI defined by the created IoT Application, is also powered by HTML5 so that end users could also use browser and navitage to **Center** to see the user interface of the application.

The **Workflows**, the logic of the IoT application, which is defined by developers through drag and drop in the IDE, is also stored at **Center** and executed by **Center**. 

## Broker

The **Workflow** uses **Services** managed by various **Hubs**. Therefore, during the execution of the **Workflow**, the **Center** need to communicate with these **Hubs** to send messages to and receive messages from the **Services** on these **Hubs**.

Such communication (send / receive or publish / subscribe of messages) happens with the help of a message **Broker**. The **Broker** acts like a proxy, a message (no matter from **Center** to **Hub** or from **Hub** to **Center**) is always sent to **Broker**, and **Broker** would correctly dispatch it to the right target. 

Intel(r) IoT Services Orchestration Layer allows to use multiple type of **Brokers**, for example, a **Broker** based on MQTT, or based on HTTP, etc. Please see [Configuration](#getstarted/advanced/configuration) for more details.

Advanced developers could enable more kind of **Brokers** by implemented a very limited set of APIs required by Intel(r) IoT Services Orchestration Layer.


## Illustration

The figure below illustrates the relationship between Center, Broker and Hubs.

![](./doc/pic/advanced/basics/Center_Broker_Hub.png){.viewer}