# Configuration of Hub 


| config field  |   optional  |   available values  |  description |
|:----------|:------|:----------------|:--------------------------------------|
| init_script  |  yes     | path to a JavaScript file | The script to run when Hub starts |
| init_script  |  yes     | path to a JavaScript file | The script to run before the Hub ends |
| thingbundle_path  |  yes     | path to a directory, by default it is "./thing_bundle" | Specifies the location where the Thing and Services are stored |
|heartbeat| yes| a JSON object with interval field | the interval defines by every how many milliseconds a heartbeat message would be sent out from this Hub to Center|

## Example
```javascript
// Optional - A script to run when the HUB starts
"init_script": "./init.js",

// Optional - A script to run when the HUB ends 
"destroy_script": "./destroy.js"

// Optional - Where to store the Things and Services
//            by default it is ./thing_bundle
"thingbundle_path": "./thing_bundle",

// Optional - Defines frequencies to report the heartbeat to center
"heartbeat": {
  "interval": 20000   // heartbeat by every this amount of milliseconds
}

```