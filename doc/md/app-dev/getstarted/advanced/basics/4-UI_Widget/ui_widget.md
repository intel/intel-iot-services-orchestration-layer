## Introduction of Widget

The **Widget** is the basic element that consists the UI of end users, its code base is shared by both *ui-dev* and *ui-user* projects.

Every UI divides up the screen as a grid with N rows and 12 columns, the width of each column is about 8.333% width of the browser, and
the height of row is fixed to 60px (configurable). The number of rows (N) is dependent on the height of the browser.

Each initial instance of widgets occupies 1x1 size on the grid, developers can resize it by drag and drop.

## Widget class
All widgets should be derivatived from the *Widget* class, this base class encapsulates the infrastructure such as UI layout,
data communication and event dispatching. You can find the builtin widgets under *ui-widget/widgets-jsx/*, and put your code there,
so that we can processes it by unified building scripts.

For example, we create a sample widget as follows:

```javascript
export default class TextWidget extends Widget {
    // All widget must overwrite this method
    render() {
        var text = this.get_data().map((t, i) => <div>{t.text}</div>);
        return super.render(
            <div>{text}</div>
        );
    }
}
```

### Methods

####get_data()
This method get all the data cached from inports, returns an array of plain objects whose keys are inports' name.

**Note**: The size of the array is a configurable item(`data_cache_size`) in *spec*.


####get_height()
This method returns the `height` of the instance in **px**.


####get_width()
This method returns the `width` of the instance in **px**.


####set_css(id, css)
This method inserts a *style* element into current HTML document
```HTML
<style id="id">
  css
</style>
```


####send_data(out)
This method sends the `out` into the outports, `out` is the key-value mapping of the outports, e.g. {`o1`: val1, `o2`: val2;},

**Note**: the `o1`, `o2` is the name of outports


####switch_ui(id)
This method is used to switchs the UIs of the App.


####\_on_settings_changed(prev, next)
This is a callback function, implement it if you want to handle the event of `settings changed` which emited by property panel (inspector).


##spec
*spec* is a textual description for **Widget**, such as how many `inports`, `outports` and `configurations`, and details.

Every widget should be described in `ui-widgets/specs.js`.

For example, following is the builtin spec of *Text* widget:

```javascript
{
  id:           "hope/ui/text",
  catalog:      "basic",
  name:         "Text",
  description:  "Show Text",
  icon:         "text-width",
  use_ract:     true,
  data_cache_size: 5,       // how many data items would be cached to show the widget    
                            // 0 for using default, -1 means unliminted
  config: [{
    name: "align",
    type: "option",
    default: "left",
    options: ["left", "center", "right"]
  }, {
    name: "font_size",
    display: "Font Size",   // displaying label in property panel
    type: "string"
  }],
  in: {
    ports: [{
      name: "text",
      type: "string"
    }]
  },
  out: {
    ports: []
  }
}
```

###Configurations
For a widget, all property of configuration is divided into two parts, the **config** group always is visible, and
the **extra** group is hidden by default.

Supported data types of configuration item:

####boolean
`Boolean` property, corresponding to a `switch` button in the property panel.

####number
`Number` property, corresponding to an `editbox` in the property panel.

####int
`Integer` property, corresponding to an `editbox` in the property panel.

####string
`String` property, corresponding to an `editbox` in the property panel.

####option
`Option` property, corresponding to a `combox` in the property panel.
Options are provided by `options` property, following three cases are supported:

* `array` of keys, such as the `align` in spec of `hope/ui/text` widget.
* `array` of plain object, e.g. 
```javascript
{
  name: "editor_type",
  type: "option",
  options: [{
    name: "Single Line",
    value: "sle"
  }, {
    name: "Multiple Line",
    value: "mle"
  }]
}
```
* `string`: only `__HOPE_APP_UI_LIST__` supported now, which will be replaced by a list of UIs in the App.

####glyphicon
A font icon, developers can easily pick one in the property panel, system now provides up to 576 icons.

####color
'Color' property, corresponding to an circle `button` in the property panel, click the button will open a color dialog.

##Code integration
For a new widget, besides adding its `spec` in `ui-widgets/specs.js`, we also need to export it from `ui-widgets/index.js`.

Specifically, we should add one key-value pair in `widgets` object of `index.js`, and use the unique `id` of widget as key,
and use the constructor of widget as value.

For example, the `text` widget is exported as following:

```javascript
exports.widgets = {
  "hope/ui/text": require("./generated/text");
  ...
}
```