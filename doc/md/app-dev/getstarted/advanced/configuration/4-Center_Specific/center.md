# Configuration of Center

Center has two web servers provided, one to offer the HTML5 IDE for app developers and the other provides the HTML5 user interface for end users, and we need to set the ports to be used by these web servers.

In addition, there are multiple paths could be configured, e.g. where the applications are stored, where the user profile is stored etc.

**Center** tracks the online/offline status of **Hub** by using heartbeat. So there is a heartbeat server on **Center** and need to be configured as well.


| config field  |   optional  |   available values  |  description |
|:----------|:------|:----------------|:--------------------------------------|
| web_for_developer  |  yes     |   a JSON object with port field to set | defines the web server for app developer |
| web_for_end_users  |  yes     |   a JSON object with port field to set | defines the web server for end users |
| app_bundle_path  |  yes     |  by defult it is "./appbundle" | where to store the applications (workflows, UI etc.) |
| user_json_path  |  yes     |  by defult it is "./user.json" | where to store the usesr profiles |
| authenticate | yes | true / false (default) | whether we enabled user system or not |
| heartbeat_server|yes| a JSON object with check_interval and drop_threshold fileds| check_interval defines by every how many milliseconds the server would check the heartbeat status of all Hubs, and drop_threshold means that a Hub would be considered as offline if Center doesn't receive its heartbeat message for such long milliseconds|


## Example
```javascript
// Optional - Configuration about the port for the HTML5 UI present to developers
//            by default it is opened at port 8080
"web_for_developer": {
  "port": 8080
},

// Optional - Configuration about the port for the HTML5 UI present to end users
//            i.e. the UI created by developers
//            by default it is opened at port 3000
"web_for_end_users": {
  "port": 3000 
},


// Optional - Where to store the applications (workflows, UIs etc.)
// By default, it is ./appbundle
"app_bundle_path": "./appbundle",

// Optional - Where to store the user profiles, it's ./user.json by default
"user_json_path": "./user.json",
// Optional - Whether a user need login before use the system
"authenticate": false,

// Optional - Defines frequencies of Heartbeat server in this center
"heartbeat_sever": {
  "check_interval": 30000,    // milliseconds to check whether a hub is dropped or not
  "drop_threshold": 120000    // set a hub as disconnected if it hasn't send
                              // heartbeat to this server for this amount of milliseconds
}
```