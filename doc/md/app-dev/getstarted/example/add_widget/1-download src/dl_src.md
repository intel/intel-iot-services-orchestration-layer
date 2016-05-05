Download the source code [liquidFillGauge.js](http://bl.ocks.org/brattonc/5e5ce9beee483220e2f6#liquidFillGauge.js)
and save it to `ui-widgets/hope-widget-liquid-fill-gauge/third_party/` with a little changes like follows:

```javascript
var d3 = require("d3");
exports.liquidFillGaugeDefaultSettings = function(){
    return {
        ...
}
exports.loadLiquidFillGauge = function(elementId, value, config) {
    if(config == null) config = liquidFillGaugeDefaultSettings();
    ...
```
