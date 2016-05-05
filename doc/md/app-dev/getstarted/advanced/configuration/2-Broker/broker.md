# Configuration of Broker

The communication between **Center** and **Hub** are through **Broker**. Therefore, each hub or center should specify details of the **Broker**.

There could be various kind of **Broker**. For example, using MQTT as the **Broker** or start a HTTP broker (by run `http_broker` provided by this project).

## Using HTTP Broker

| config field  |   optional  |   available values  |  description |
|:----------|:------|:----------------|:--------------------------------------|
| type          |    no       |    http     | specify that this center/hub uses HTTP broker|
| broker_url    |    no       | e.g. http://127.0.0.1:16666  | The URL of the HTTP broker|
| my_port     |    no      |  e.g. 19999               | The center/hub also need to open a TCP/IP port so that HTTP broker could talk with it. This specifies the port number |

## Using MQTT Broker

| config field  |   optional  |   available values  |  description |
|:----------|:------|:----------------|:--------------------------------------|
| type          |    no       |    mqtt     | specify that this center/hub uses MQTT broker|
| url    |    no       | e.g. mqtt://127.0.0.1  | The URL of the MQTT broker|
| only_support_mqtt_3_1     |    yes      |  true / false       | If the mqtt server is old version, i.e. doesn't support MQTT 3.1.1 or higher, this option need to be set to true to indicate that we should use an old version MQTT protocol |









