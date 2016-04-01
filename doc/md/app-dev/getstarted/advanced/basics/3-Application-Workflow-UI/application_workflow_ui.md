# Application, Workflow and UI

## Application

The developers could use the HTML5 IDE to create **Applications**. Each **Application** would have certain application logic and certner user interface to present to the end users.

## Workflow

Such application logic is modelled as one or multiple **Worflows**, so that developers could easily compose them by drag-and-drop the services and wiring them. 

The figure below illustrates a **Workflow**.

![](./doc/pic/advanced/basics/workflow.png){.viewer}

## Nodes, Ports and Edges of a Workflow

As illustrated above, the workflow is modelled as a Graph, i.e. consists of Nodes and Edges. 

Each **Node** corresponds to a **Service** of a **Thing** on a **Hub**. 

Each **Node** may have zero, one or multiple **Ports**. The **Ports** at left side are called **inports**, while these at right side are called as **outports**. The **Node** could receive message from its **inports** and send out message through its **outports**.

There are **Edges** to wire the **inport** and **outport**. An **Edge** means that the message send out from the **outport** of the source **Node** would be dispatched to the **inport** of the destination **Node**.

As each **Node** actually represents a **Service**, so arrival of message at **inport** of a **Node** may trigger the invocation of the **Service**, with the message received as the parameters for this invocation. For more details, please see [Use Service](#getstarted/advanced/use_service)

## Example of Workflow

The workflow illustrated in above figure has 4 **Nodes**. The two **Nodes** at the left side represents two **Services** so called "report". The upper one is the service of **Thing** "thermometer A", while the other one is of "thermometer B".

This "report" service has one **inport** and one **outport**. The **inport** is named as "interval" which sets how ofter the thermometer would report the temperature it measured. In this example, a default message with value "3000" is set there so it reports data by every 3000ms.

The output of the "report" service is sent out through its **output** "T", and dispatched to another **Service** (the **Node** in the middle) so called "operator >", which belongs to a **Thing** "logical compare" of the built-in **Hub**.

The "operator >" have two **inports**, it would compare the messages received from these two **inports** and send out the result (e.g. TRUE or FALSE) through its **outport** names as "bool".

Finally, the "switch" **Service** of the **Thing** "fan" would use this comparison result to determine the on/off of the real physical fan.

So put all of these together, the workflow defines the following application logic - measure two thermometers A & B by every 3 seconds, and if A is greater than B, then turn on the fan, otherwise turn off it.

## UI

In addition to the workflow which models the logic, typical applications would have UI as well to present an interactive interface with end users.

We develop the UI in IDE with two steps:

* First, we select the UI widgets and layout them. This defines how the UI would look like.

* After that, we will feed data to or receive data from these UI widgets. This enables the real functionality of UI to show real data or accept user inputs.

### Step one - Layout UI

There are a lot of pre-builtin UI widgets already provided and senior developers could add more by themselves. Application developers only need to drag them from left panel and drop to the right canvas in UI editor, layout them and sometimes do certain configuration.

### Step two - wire UI widgets into workflow

All UI widgets dropped to the right side canvas would be listed in the "Widgets" tab in Workflow Editor. These widgets behaves like a **Service**, i.e. have **inports** and **outports** and could be be connected to existing workflow.

Connecting an **Edge** to an **inport** of a **Widget** means to send data to this widget to visualize. And connecting an **Edge** to an **outport** of a **Widget** means the user input captured from this widget would be dispatched through this **Edge**

The example below is similar as the the exmaple above, except that its workflow have UI widgets wired. In this enhanced example, the data reported by the thermometers, are dispatched not only the "operator >" for comparison, but also send to "Text" widget, "Gauge" widget and "Chart" widget to visualize.

The status of the fan, is sent to a "fan" UI widget, and a "Switch" UI widget to visualize.

Please note that for the "Switch" UI widget, it also has an **outport** (named as "state"), which connects to the **inport** of the real fan **Service**. This means the end user may directly turn on or turn off the fan through the user interface by switching the "Switch" UI control.

![](./doc/pic/advanced/basics/ui.png){.viewer}