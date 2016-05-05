# Configure How the Service is Invoked

Typically, you don't need to read through this if a service has only one inport. 

However, you need to understand the following content, if the service has multiple inports, and you need some special behaviors about service is invocated upon message arrival on inports. For example, A service may require that it only executes when all of its inports have data arrived. It would NOT be invoked if only one inport receives a message. 

To give a concrete example, think about a service so called "Full Name", which has two inports so called "First Name" and "Last Name". The service would concat the data from "First Name" and "Last Name" to return the "Full Name". So if a data arrives at the "First Name" inport, the service should NOT immediately be invoked. It should wait untile the "Last Name" also get its data. Then these two data are paired and be used to invoke the Service. 

IoT SOL provides a lot of visually configurable options to customize such behavior to match your really needs. What you need to do is to read the following to understand and use it smartly. :)

## Stages of Service Invocation

Invocation of a **Service** consists of stages of the following sequence of stages:

1. `Stage: Data Arrivial`: A message arrives at the inport of a Service 
2. `Stage: Trigger`: According to the configuration, it decides whether the data arrival results in the next stage so called **Prepare**
3. `Stage: Try to Prepare IN object`: Collect the data stored at inports and prepare that as the input (so called IN object) for service invocation. **NOTE** that the **Prepare** could fail to form an IN object (e.g. no data has been arrived on other required inport etc.), and thus would NOT actually invoke the service, i.e. would NOT enter the next stage.
4. `Stage: Service Execution`: Really invokes and executes the Service with the IN object. Related messages used to form the IN object would be consumed once. During the excution, sendOUT maybe invoked 0 to N times to send messages through one or multiple its outports.


As the illustration purpose, we would use the following comparison service as an example. By clicking the Service, it will have an Inspector panel to let us configure the behavior of above stages.

![](./doc/pic/advanced/use_service/inport.png){.viewer}

## Stage: Data Arrival

When a message arrives at the inport, before it is consumed to invoke the Service, the inport need to **Store** it first.

Depends on the mode of that inport, the behavior of **Store** could be different.

* `Bufferred Mode`: In this mode, the inport maintains a buffer (FIFO - First In First Out). The arrived message is stored into the buffer. And would **Removed** after it is consusmed (i.e. used for invocation).
* `Cached Mode`: In this mode, the inport always hold **ONLY** one latest message (could be null or default message if nothing ever arrived, will explain later). That means, the new message would drop the old message no matter whether the old message has been consumed or not. Furthermore, the message is **Still Stored** there even if it has been consumed at least once. It is **NOT Removed** upon consumption.

So typically in most of the cases, a message sent to `Bufferred Mode` inport would be used **Once** to invoke the Service, a message sent to `Cached Mode` inport could be used to invoke the Service by zero or multiple times.

![](./doc/pic/advanced/use_service/cache_inport.png){.viewer}
![](./doc/pic/advanced/use_service/buffer_inport.png){.viewer}

## Stage: Trigger

After a message is **Stored**, by default or in MOST of the cases, it would **Trigger** and enter the next stage so called **Prepare**.

But sometimes, although this is rare, we want that the data arrival at an inport will not result in the next stage. i.e. we simply need data to be stored in this inport, but do NOT want the service be invoked by this.

For example, there maybe a service so called "Beep Once". It would have two inports. One is "volume" and the other is "sigal". If a messasge arrives at "signal", it would immediately beep once with the volume level stored at "volume". However, if a message arrives at "volume", it simply means we would use this new volume level for future beeps, but it should NOT result in a beep. 

We could make this happen by clicking the line of the corresponding inport and it would be visualized to be dotted line, which is so called **No Trigger** mode.
![](./doc/pic/advanced/use_service/trigger.png){.viewer}

## Try to Prepare IN object

After it passes the **Trigger** stage, it enters into this **Prepare** stage.

The major task of this **Prepare** stage is to form an IN object which would be used to invoke the service as input parameters. (You may see the IN is used in code of the Service in [Edit Service](#getstarted/advanced/edit_service/2-service)).

The IN object is formed by firstly fetching the data (the arrived message) from each inport, and then using them to compose an compound object.

### Prepare Step 1: Read Data from inports

For `Bufferred Inport`, the data is read from its FIFO, and if no data(i.e. message) in FIFO, it returns `undefined`.

For `Cached Inport`, it returns its stored data (as new data overwrites old data). But if no data (i.e. message) has ever arrived at this inport, it would return a `default value` (could be configured in Inspector Panel). And if `default value` isn't configured, it returns `undefined`.

### Prepare Step 2: Compose IN based on whether inports are `Grouped`

As you may see, the read data could be `undefined`, which represents that we failed to get data from corresponding inport. Wether we allow the IN object be composed in case failed to fetech data from certain inport, is determined by another property of the inports, i.e. whether the inports is `Grouped` or not.

![](./doc/pic/advanced/use_service/buffer_example.png){.viewer}

The above shows how to set all inports to be `Grouped`, and it is visualized as a Solid Bar. 

`Grouped` means that all inports should have valid data, and they are paired (i.e. grouped) together to form the IN object. 

So the **Prepare** stage would Sucess and go to next stage if it manages to read data (i.e. no undefined returned) from all of its inports. Otherwise, it would FAIL and will **NOT** enter to the next `Execution` stage, if the inports are `Grouped` and failed to read data from at least one of its inports.

So recall the "First Name" service we talked at the beginning, it could be implemented by set the inports to be `Grouped`. So the service is only invoked when both "First Name" and "Last Name" has data arrived.

On the other hand, if it is `NOT Grouped`, the **Prepare** will always Succeed to form an IN object, although some fields of the IN object could be `undefined` if failed to read data from a inport.

### Typical Combinations between `Grouped` and `Bufferred` and `Cached`

Fail to read data from `Cached Inport` is typically rare, because normally `Cached` inport always has something stored there if it has a default value or at least received one message - to be explained later soon, the invocation doesn't remove the data stored in `Cached Inport`. 

So normally the most frequently used combination is:

* `Cached` and `NOT Grouped`: This is the mode by default for most of the services. For example, the comparion service we shown at the beginning. Everytime a data arrives at either inport (i.e. in1 or in2), the comparison would always happen and would compare with the stored (cached) data in the other inport.

* `Bufferred` and `Grouped`: This is typical if the service need data to be paired, i.e. the "Full Name" example.

These are very typical combinations, so when toggle it between `Grouped` and `NOT Grouped` in the IDE by clicking the bar, it would automatically to set all inports to `Buffered` or `Cached` respectively.


## Stage: Service Execution

If the **Prepare** stage succeeds and an IN object is formed, the service would be invoked with this IN object as input parameters.

### Execution - Consume Messages

Before really start the execution, it would `consume` the messages that read from the inports and form the IN object.

To `consume` the messages:

* For `Buffered` inport, the message read from the inport would be `Removed` from the FIFO buffer, so a message would be used to invoke the service at most once.

* For `Cached` inport, however, as its name implied, it does `NOT Remove` the message read from the inport, so it remains there and could be used again to invoke the service later.

### Execution - Send Out Messages

During the execution, it may invokes `sendOUT` to send message to its outputs. The `sendOUT` could be invoked 0 to N times. You may see more details at [Edit Service](#getstarted/advanced/edit_service/2-service)).


## Sidenotes

### Auto Trigger for Heads of workflow

Normally, a Service can only be triggered (then prepare and execute) only if one of its inports receive a message. And this message is dispatched to this inport through a line connected to an outport which sends out it.

However, for a workflow consists of many Services, typically there are Services inside it that has no lines connected to any of its inports. So call these Services as `Heads` of the workflow. 

For example, the "interval" service of "timer" thing, locates at the left, is the `Head` of this workflow, as it has no lines connected to its inports

![](./doc/pic/advanced/use_service/buffer_example.png){.viewer}

When start to execute the workflow, the `Heads` would be automatically **triggered once**, even though it has no lines connected to inports so have no chance to receive messages.

So these `Heads` are actually the entry point of the entire workflow which would send messages to services in rest of the workflow.

As you could image, as the `Heads` need to prepare after it is triggered, to ensure the **Prepare** succeed, normally its inports are `Cached` (so could set `default value`) and `NOT Grouped`

### No-Store for Received Message

As mentioned above, typically, an arrival of the message would first be stored at that inport, and then enter into trigger stage and then prepare, if the inport is NOT in **No Trigger** mode.

However, in some rare cases, we want to **SKIP** the `Store` and directly jump to `Trigger` stage. For example, sometimes we would like a service always be invoked with its default value in the inport, no matter which kind of message it receives.

To acoompolish this goal, one could easily set the **line** connected to the inport as `No Store`, as illustrated below.

![](./doc/pic/advanced/use_service/no_store.png){.viewer}