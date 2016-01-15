
Frontend API
================
## Introduction
REST API provides a powerful and simple Web services API for interacting with Intel(R) *IoT Services Orchestration Layer*.
The API consist of two groups:

- **DevFrontEnd**
- **UserFrontEnd**

Currently, all of API using the standard **POST** HTTP method.

| API | URL |
|---------|-----|
|`DevFrontEnd`|`http://<host>:8080/apis/dev`|
|`UserFrontEnd`|`http://<host>:3000/apis/user`|

### Example
Fetch the list of apps.

#### Request
Request URL:

`http://localhost:8080/apis/dev`

Requst body:
```json
{"api":"app.list","params":[]}
```

#### Response
```json
[{
  "name":"A4","id":"HOPE_APP_184c1560","description":"A4 XXX",
  "graphs":[{
    "id":"GRAPH_0014b930","name":"G1","description":""
    },{
    "id":"GRAPH_4058fec0","name":"ox","description":""
  }],
  "uis":[{
    "id":"UI_1bb298f0","name":"U1","description":""
  }],
},{
  "name":"A1","id":"HOPE_APP_27598be0","description":"",
  "graphs":[],"uis":[]
}]
```

## Category
### App
#### app.list
**Description**

    Get the list of app.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{"api":"app.list","params":[]}
```
**Response**
```json
[ Array of app_info ]
```

#### app.get
**Description**

    Get a list of app that given in array of app_id.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{"api":"app.get","params":[ Array of app_id ]}
```
**Response**
```json
[ Array of app_info ]
```

#### app.get_widget_data
**Description**

    Get widget data cached in server.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{
  "api":"app.get_widget_data",
  "params":[{
    "app":    app_id,
    "widget": widget_id,
 }]
}
```
**Response**
```json
[ Array of widget data ]
```

#### app.send_widget_data
**Description**

    Post the data to server, this data will be consumed by workflow engine.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{
  "api":"app.send_widget_data",
  "params":[{
    "app":    app_id,
    "widget": widget_id,
    "data": data
 }]
}
```
**Response**

N/A

#### app.create
**Description**

    Create and return an app.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"app.create",
  "params":[{
     "name": app_name,
     "description": app_desc
 }]
```
**Response**
```json
{ app_info }
```

#### app.update
**Description**

    Update the app information.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"app.update",
  "params":[{
     "app": app_id,
     "props": {...}
 }]
```
**Response**
```json
{command log}
```


#### app.remove
**Description**

    Delete one app on the server, this operation will also automatically delete all
    workflows and UI belong it.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"app.remove",
  "params":[{ "app": app_id }]
```
**Response**
```json
{command log}
```


#### app.create_graph
**Description**

    Create a new workflow.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"app.create_graph",
  "params":[{
     "app": app_id,
     "graph": graph_info
 }]
```
**Response**
```json
{command log}
```


#### app.create_ui
**Description**

    Create a new UI.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"app.create_ui",
  "params":[{
     "app": app_id,
     "ui": ui_info
 }]
```
**Response**
```json
{command log}
```


### Graph

**Applicability**

- *DevFrontEnd*

#### graph.get
**Description**

    Get a list of workflow that given in array of graph_id.

**Request**
```json
{"api":"graph.get","params":[ Array of graph_id ]}
```
**Response**
```json
[ Array of graph_info ]
```


#### graph.update
**Description**

    Update one graph.

**Request**
```json
{
  "api":"graph.update",
  "params":[ graph_info ]
```
**Response**
```json
{command log}
```

#### graph.remove
**Description**

    Delete workflows on the server.

**Request**
```json
{
  "api":"graph.remove",
  "params":[ Array of graph_id ]
```
**Response**
```json
{command log}
```

#### graph.start
**Description**

    Start workflows on the server.

**Request**
```json
{
  "api":"graph.start",
  "params":[ Array of graph_id ]
```
**Response**
```json
{}
```

#### graph.stop
**Description**

    Stop workflows on the server.

**Request**
```json
{
  "api":"graph.stop",
  "params":[ Array of graph_id ]
```
**Response**
```json
{}
```

#### graph.status
**Description**

    Get the status of workflows, valid status is "Non-exist", "Working", "Paused", "Stopped"
    or "Idle".

**Request**
```json
{
  "api":"graph.status",
  "params":[ Array of graph_id ]
```
**Response**
```json
[ Array of {
  "graph": graph_id,
  "status": status
}]
```

#### graph.trace
**Description**

    Get the tracing data of workflows.

**Request**
```json
{
  "api":"graph.trace",
  "params":[ Array of graph_id ]
```
**Response**
```json
[ Array of {
  "id": graph_id,
  "trace": [ Array of records ]
}]
```

### UI
#### ui.get
**Description**

    Get a list of UI that given in array of ui_id.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{"api":"ui.get","params":[ Array of ui_id ]}
```
**Response**
```json
[ Array of ui_info ]
```

#### ui.update
**Description**

    Update one UI.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"ui.update",
  "params":[ ui_info ]
```
**Response**
```json
{command log}
```


#### ui.remove
**Description**

    Delete workflows on the server.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"ui.remove",
  "params":[ Array of ui_id ]
```
**Response**
```json
{command log}
```


### Spec

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

#### spec_bundle.list
**Description**

    Get the list of all available spec bundle.

**Request**
```json
{"api":"spec_bundle.list","params":[]}
```
**Response**
```json
[ Array of spec_bundle_info ]
```

#### spec_bundle.get
**Description**

    Get the list of spec bundle that given in array of spec_bundle_id.

**Request**
```json
{"api":"spec_bundle.get","params":[ Array of spec_bundle_id ]}
```
**Response**
```json
[ Array of spec_bundle_info ]
```

#### spec_bundle.get_for_specs
**Description**

    Get the list of spec bundle that includes spec in array of spec_id.

**Request**
```json
{"api":"spec_bundle.get_for_specs","params":[ Array of spec_id ]}
```
**Response**
```json
[ Array of spec_bundle_info ]
```


### Hub
#### hub.list
**Description**

    Get the brief list of all available Hub.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{"api":"hub.list","params":[]}
```
**Response**
```json
[ Array of {
  "id": hub_id,
  "name": hub_name,
  "description": hub_desc
}]
```


#### hub.get
**Description**

    Get a list of Hub given in array of hub_id.

**Applicability**

- *DevFrontEnd*
- *UserFrontEnd*

**Request**
```json
{"api":"hub.get","params":[ Array of hub_id ]}
```
**Response**
```json
[ Array of hub_info]
```

#### hub.create_thing
**Description**

    Create a new thing on the Hub.

**Applicability**

- *DevFrontEnd*

**Request**
```json
{
  "api":"hub.create_thing",
  "params":[{
    "hub": hub_id,
    "thing": {
       "type": "hope_thing",
       "name": thing_name,
       "description": thing_desc
    }
   }]
}
```
**Response**
```json
{
  "id": thing_id,
  "name": thing_name,
  "type": "hope_thing"
}
```


### Thing
**Applicability**

- *DevFrontEnd*

#### thing.update
**Description**

    Update the thing information.

**Request**
```json
{
  "api":"thing.update",
  "params":[{
     "id": thing_id,
     ...
 }]
```
**Response**
```json
{}
```


#### thing.remove
**Description**

    Delete things on the server, this operation will also automatically delete all
    services belong it.

**Request**
```json
{
  "api":"thing.remove",
  "params":[[ thing_id ]]
```
**Response**

N/A


#### thing.create_service
**Description**

    Create a new service on the Thing.

**Request**
```json
{
  "api":"thing.create_service",
  "params":[{
    "thing": thing_id,
    "service": {
       "type": "hope_service",
       "spec": spec_id or spec,
       "name": service_name,
       "description": service_desc
    }
   }]
}
```
**Response**
```json
{
  "id": service_id,
  "name": service_name,
  "type": "hope_service"
}
```


### Service
**Applicability**

- *DevFrontEnd*

#### service.update
**Description**

    Update the service information.

**Request**
```json
{
  "api":"service.update",
  "params":[{
     "id": service_id,
     ...
 }]
```
**Response**
```json
{}
```


#### service.remove
**Description**

    Delete services on the server, this operation will also automatically delete all codes
    for it.

**Request**
```json
{
  "api":"service.remove",
  "params":[[ service_id ]]
```
**Response**

N/A


#### service.list_files
**Description**

    Get a list of file that service had and/or expected for.

**Request**
```json
{
  "api":"service.list_files",
  "params":[ service_id ]
```
**Response**
```json
{
  "expected": [ Array of filename ],
  "existing": [ Array of filename ]
}
```


#### service.read_file
**Description**

    Read a service file.

**Request**
```json
{
  "api":"service.read_file",
  "params":[{
    "service_id": service_id,
    "file_path": file_path
  }]
```
**Response**
```json
{
  "content": String of file content
}
```

#### service.write_file
**Description**

    Write a service file.

**Request**
```json
{
  "api":"service.write_file",
  "params":[{
    "service_id": service_id,
    "file_path": file_path,
    "content": String of file content
  }]
```
**Response**
```json
{
  service_brief_object
}
```

#### service.remove_file
**Description**

    Delete a service file.

**Request**
```json
{
  "api":"service.remove_file",
  "params":[{
    "service_id": service_id,
    "file_path": file_path
  }]
```
**Response**
```json
{
  service_brief_object
}
```