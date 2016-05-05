# Add Spec

Add following codes into `ui-widgets/specs.js`:

```javascript
{
  id:           "hope/ui/radio",
  type:         "spec",
  is_ui:        true,
  catalog:      "basic",
  name:         "Radio",
  description:  "Radio Control",
  icon:         "dot-circle-o",

  use_ract:     true,
  data_cache_size: 1,

  config: [{
    name: "align",
    type: "option",
    default: "center",
    options: ["left", "center", "right"]
  }, {
    name: "buttons",
    type: "object",
    sub_type: "string",
    headers: ["Name", "Value"]
  }],

  in: {
    ports: []
  },
  out: {
    ports: [{
      name: "value",
      type: "string"
    }]
  }
}
```