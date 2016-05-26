# Introduction

There are 3 ways to add a new UI widget into Intel(R) IoT SOL:

  * Add a **builtin** widget
  * Install a **plugin** widget via the NPM
  * Add a **addons** widget

## Add a builtin widget

**For Development**

In this way, we should create our new widget under the *ui-widgets/widgets-jsx*, and then rebuild **ui-widgets**, **ui-dev** and **ui-user**.

For details, please visit [UI Widget](#getstarted/advanced/basics/4-UI_Widget).


## Install a plugin widget via the NPM

**For Development**

This is the easy way to reuse existing UI widgets that published on [NPM](http://www.npmjs.com).

Also, we need to rebuild **ui-widgets**, **ui-dev** and **ui-user** after installation.

For example, if we want to use *hope-widget-digital-clock* in our app, we just need to install it under **ui-widgets**:

```bash
  npm install --save hope-widget-digital-clock
  
  # rebuild widgets
  gulp build

  # rebuild ui-dev
  cd ../ui-dev
  gulp build

  # rebuild ui-user
  cd ../ui-user
  gulp build
```


## Add a addons widget

**For Release**

This is a fast way to add UI widget into IoT SOL, and `need not` to rebuild **ui-widgets**, **ui-dev** or **ui-user**.

For example, to add *demo* addons widget, we need to create a new directory *demo* under *ui-widgets/addons*, and then add two files under the new directory:

 * **widget.json**
 * **demo.jsx**

### widget.json

This file includes the spec of this widget.

```json
{
  "id":           "hope/ui/demo",
  "catalog":      "Output",
  "name":         "Demo",
  "description":  "Demo Component",
  "icon":         "cog",

  "use_ract":     true,
  "data_cache_size": 1,

  "config": [],

  "in": {
    "ports": [{
      "name": "input",
      "type": "string"
    }]
  },
  "out": {
    "ports": []
  }
}

```

### demo.jsx

```javascript
class DemoComponent extends Widget {
  componentWillUpdate() {
    var data = this.get_data();
    if (_.isArray(data) && data.length > 0) {
      var msg = String(data[0].input);
      if (msg === this.$msg) {
        return;
      }
      this.$msg = msg;
      this.forceUpdate();
    }
  }

  render() {
    return super.render(
      <div className="match-parent text-center">
        {this.$msg || "This is a Demo."}
      </div>
    );
  }
}

$hope.register_widget("hope/ui/demo", DemoComponent);

```


### Tips

In this way, addons that written in JSX need be transformed by [babel](http://babeljs.io),
so the page loading performance maybe lower than another ways above.

