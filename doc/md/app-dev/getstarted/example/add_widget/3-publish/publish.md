##Publish to NPM
In most cases, we want to publish the widget on internet. now we are using [NPM](http://www.npmjs.com) to host our widget plugins.

Conventionally, We highly recommend that the name of npm package of widget should begin with "iotsol-widget-",
it's a simple way for code integration.

```bash
 $ npm publish
```


##Install Widget by NPM

For example, if want to use `XYZ`, we just need execute following commands in `ui-widgets/` directory:
```bash
 $ npm install iotsol-widget-XYZ --save
 $ gulp build
```
