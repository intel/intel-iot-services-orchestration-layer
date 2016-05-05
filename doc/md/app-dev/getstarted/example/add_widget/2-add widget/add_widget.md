Create a new React class to wrap this widget, and save the js file as `ui-widgets/hope-widget-liquid-fill-gauge/src/lfg.js`:

```javascript
import {liquidFillGaugeDefaultSettings, loadLiquidFillGauge} from "../third_party/liquidFillGauge.js";
export default class LFGWidget extends Widget {
  _on_settings_changed() {
    this.init_gauge();
  }
  init_gauge() {
    var w = this.props.widget;
    var size = this.get_height() - 5;
    var svg = "<svg id='" + w.id + "' width='" + size + "' height='" + size + "'>";
    var config = liquidFillGaugeDefaultSettings();
    _.merge(config, w.config);
    $(this.refs.container).empty().append(svg);
    this.gauge_object = loadLiquidFillGauge(w.id, 0, config);
  }
  componentDidMount() {
    super.componentDidMount();
    this.set_css("lfg-css", ".liquidFillGaugeText { font-family: Helvetica; font-weight: bold; }");
    this.init_gauge();
  }
  componentDidUpdate() {
    var data = this.get_data();
    if (_.isArray(data) && data.length > 0) {
      var val = parseFloat(data[0].value);
      this.gauge_object.update(val);
    }
  }
  render() {
    return super.render(<div ref="container" />);
  }
}
```

### package.json
```json
{
  "name": "hope-widget-lfg",
  "version": "1.0.0",
  "description": "liquid Fill Gauge",
  "main": "index.js",
  "scripts": {
    "build": "babel src --out-dir lib",
    "prepublish": "npm run build"
  },
  "dependencies": {},
  "devDependencies": {},
  "keywords": ["guage"],
  "author": "Kanghua Yu",
  "license": "MIT"
}
```


### index.js
```javascript
exports.specs = [{
  id:           "hope/ui/lfg-gauge",
  catalog:      "basic",
  name:         "liquid Fill Gauge",
  description:  "liquid Fill Gauge",
  icon:         "dashboard",
  use_ract:     true,
  data_cache_size: 1,
  config: [{
    name: "waveColor",      // same name in liquidFillGaugeDefaultSettings
    type: "string",         // TODO: add more configuration like this
    default: "#178BCA"
  }],
  in: {
    ports: [{
      name: "value",
      type: "number"
    }]
  },
  out: {
    ports: []
  }
}];
if (process.browser) {
  exports.widgets = {
    "hope/ui/lfg-gauge": require("./lib/lfg");
    ...
  }
}
```
## Directory Layout

    hope-widget-lfg
    |-- package.json
    |-- index.js
    |-- third_party
    |       `-- liquidFillGauge.js
    `-- src
        `-- lfg.js
