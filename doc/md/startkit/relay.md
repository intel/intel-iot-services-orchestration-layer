Relay
======
## Switch

### Description

Turn on or off the Relay, and output the status.

### Config

`pin`: int. the gpio pin which is attached by the relay

### Input

`on`: boolean. true means turn on, false means turn off.

### Output

`status`: boolean. the running status of the relay

### Example

![](./pic/button_relay.jpg)

Check the button status in every 1s. If it is pressed, turn on the relay, otherwise, turn off.