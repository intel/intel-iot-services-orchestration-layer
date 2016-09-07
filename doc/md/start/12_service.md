
Service
================
## Introduction of Service

**Service** represents one service provided by a **thing**. For example, *LED* is a thing, and *turn on*, *turn off*, *dim* are services of the thing.

## Directory Layout
Each **Service** is a thing directory's first-level subdirectory, which must have a `service.json`

For example, the thing directory is *led/*, and its tree graph is as follows.

    led
    |-- dim
    |   |-- service.json
    |   `-- a
    |       `--service.json
    |-- b
    |-- switch
    |   `-- service.json
    `-- thing.json

- *dim* and *switch* are services.
- *a* is **NOT** service because it is not the first-level directory of *led*. 
- *b* is **NOT** service because it does not have service.json

`service.json` describes some properties of the service. Except for `service.json`, service directory should have the following JavaScript files.

* `service_init.js`: initialize the service
* `service_destroy.js`: destroy the service
* `start.js`: open and initialize the session
* `resume.js`: resume the session
* `after_resume.js`: actions after the session resumed
* `pause.js`: pause the session
* `stop.js`: destroy and close the session

If any of above file is missing, the system will create a default one in memory (not in filesystem)

Besides, user can add any other files or subdirectories into the service directory. 

     
## Service and Session
In the workflow graph, each node represents a service. When the graph starts running, each node will create a new session to execute the service. It is designed to maintain node's own state, because each session has a sandbox to isolate each other.

Note that if two nodes represent one service, they have two different sessions.

### Service Status
Service only has two status: initialized or not.  

    Not-initialized ------ service_init.js -------> initialized
        ^                                                  |
        |                                                  |
        `------------------service_destroy.js--------------
### Session Status
Session has 3 status: `idle`, `paused`, `working`.

The following table shows the state transition rules.

| current state | start | resume | pause | stop |
|----|---|--|--|--|
|`idle`|`paused`|invalid|invalid|invalid|
|`paused`|invalid|`working`|invalid|`idle`|
|`working`|invalid|invalid|`paused`|invalid|

Here, **invalid** means the action is illegal when session is in that status.

## `service.json`
* `id`:  String. The unique id of the service. Default: one created by service directory path and thing id.
* `name`: String. The name of the service. It will be showed in the web IDE. 
* `description`: String. The description of the service.
* `spec`: **Essential**. String or Object. If the spec is string, it means the spec id which service links to. If the spec is object, it is service's own spec. 
* `config`: Object. The service's config information.

## JavaScript Files
This sections shows how to write these JS service files. (`service_init.js`, `start.js`, ...)
### Sandbox
Each JS service file runs in a sandbox, and it make sure that the service codes in each file will not affect each other or affect the framework.

* All Nodejs's original global variables can be used in each files, such as `buffer`, `process`, `require`, `setTimeout`, ...
* Native modules or third party modules can be required in each files. Even binary can be executed by the help of native module `child_process`
* Each files' global are **NOT** shared, except for some specific variables.

Other useful global variables are added into the sandbox.

#### `shared`
It is a global object shared among one **session**. 
In one session, `start.js`, `resume.js`, `after_resume.js`, `kernel.js`, `pause.js`, `stop.js` will share the same object. 
For example, we set `shared.num = 1` in `start.js`, and we can get the value in `stop.js`.

####`service_shared`
It is a global object shared among one **service**
In one service directory, `start.js`, `resume.js`, `after_resume.js`, `kernel.js`, `pause.js`, `stop.js`, `service_init.js`, `service_destroy.js` will share the same object.
Note that it can be shared between two different sessions which run same service.

####`hub_shared`
It is a global object shared among all service JS files in one **hub**.
It is used for implicit cooperation between different services.

####`CONFIG`
It is a global readonly object. All service JS files can access it.
Its value is the `config` in `service.json`.

####`IN`
It is a global readonly object only used in `kernel.js`.
The value is the session's inports value, e.g. `{in1: value1, in2: value2}`.

####`done(value)`and `fail(err)`
They are global functions used in `start.js`, `resume.js`,  `pause.js`, `stop.js`, `service_init.js`, `service_destroy.js`. 
All those files will cause the transition of service/session's status. 

* `done(value)` is called when the action is done successfully. The value will be sent to the framework for logging.
* `fail(err)` is called when the action is failed. `err` can be any kinds of error message, which will be sent to the framework and showed in the web page.
* If `done` or `fail` is called multiple times in one action,  only the first one will be processed, and the remainings are ignored.
* If any exceptions are thrown in above files, it will automatically call the `fail(exception)`.

####`sendOUT(out)`and `sendERR(err)`
They are global functions used in `after_resume.js`and `kernel.js`.
Only when the session is in `working` state, those two function are valid. Otherwise, they are ignored.

* `sendOUT(out)` will send the `out` into the outports of the session. `out` is the key-value mapping of the outports, e.g. `{o1: value1, o2: value2}`, and `o1`,`o2` is the name of the outports.
* `sendERR(err)`will send the `err` into the error port of the session. `err` can be any kinds of error message.
* If any exceptions happen, it will automatically call the `sendERR(exception)`.

###Default File Content
If any service JS files are missing, the system will create default content in memory.

* For `after_resume.js` and `kernel.js`, the default content is empty.
* For `start.js`, `resume.js`,  `pause.js`, `stop.js`, `service_init.js`, `service_destroy.js`, the default content is `done()`.


### JS Files  Execution Order
* When the workflow graph starts, all sessions execute `start.js` firstly. After all starts are done, they execute `resume.js`. After all resumes are done, all sessions execute `after_resume.js`.
* When the workflow graph pauses, all sessions execute `pause.js`.
* When the workflow graph resumes, all sessions execute `resume.js`. After all resumes are done, all sessions execute `after_resume.js`.
* When the workflow graph stops, If the graph's status is working, all sessions execute `paused.js` firstly, then after all pauses are done successfully, all sessions execute `stop.js`. If the graph's status is paused, all sessions execute `stop.js`.

* `kernel.js` will be executed once the session is triggered.

* When a session starts to run `start.js`, if the service is not initilized, it will execute `service_init.js` firstly.