# Edit Service's Specification

Edit the service's specification, including the inports/outports' config names and types, and their default values.

![](./doc/pic/example/add_service/edit_http_request_spec.gif){.viewer}


The service's specification in this example
```Javascript
{
  "in": {
    "ports": [
      {
        "name": "switch",
        "type": "boolean",
        "default": true
      }
    ]
  },
  "out": {
    "ports": [
      {
        "name": "out",
        "type": "string"
      }
    ]
  },
  "config": [
    {
      "name": "url",
      "type": "string",
      "required": true
    },
    {
      "name": "method",
      "type": "string",
      "default": "get"
    },
    {
      "name": "headers",
      "type": "string",
      "default": "{}",
      "use_editor": true
    },
    {
      "name": "body",
      "type": "string",
      "default": "{}",
      "use_editor": true
    },
    {
      "name": "proxy",
      "type": "string"
    },
    {
      "name": "timeout",
      "type": "number",
      "default": 50000
    }
  ],
  "name": "http_request"
}
```
