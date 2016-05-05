# Configuration of Log

Each log message has two properties, i.e. its level and its category.

The level defines how important it is, and could be debug, info, warn or error.

The category defines which component this log message is related. For example, message, center, hub, etc.

Whether a message would be printed out depends on the configuration of the log, in particular, whether the log is enabled, and its corresponding level is enabled, and its corresponding category is enabled.

The entire log configuration is optional. The log is disabled if log configuration is omitted in the configuration file.


| config field  |   optional  |   available values  |  description |
|:----------|:------|:----------------|:--------------------------------------|
| enabled  |  yes     |   true / false (default) | enable / disable log |
|verbose | yes | true / false (default) | show more details or not |
|show_error_of_any_category|yes|true / false (default) | show all error messages, even if its corresponding category is disabled|
|show_warn_of_any_category|yes|true / false (default) | show all warn messages, even if its corresponding category is disabled|
|levels|yes| a JSON object specifies debug, info, warn, category, see below example | enable / disable a level |
|categories| yes| a JSON object specifies categories | category name could contain wildcards (e.g. * or +)|

## Example
```javascript
"log": {
  "enabled": true,      // enable the log or not
  "verbose": true,      // show details or not
  "show_error_of_any_category": true, // show error log even if its category is disabled
  "show_warn_of_any_category": true,  // show warn log even if its category is disabled
  "levels": {           // which level of log would be printed out
    "debug": false,
    "info": true,
    "warn": true,
    "error": true
  },
  "categories": {       // show (or not show) log of specific category
    "*":      false,    // allow to use wildcard
    "message": false,
    "center": true,
    "entity": false,
    "hub": false,
    "heartbeat": false,
    "workflow": false,
    "sm" : false
  }
},
```