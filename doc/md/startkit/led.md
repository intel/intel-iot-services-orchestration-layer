LED
======
## switch

### Description

Turn on or off the LED, and output the status.

### Config

`pin`: int. the gpio pin which is attached by the LED

### Input

`on`: boolean. true means turn on, false means turn off.

### Output

`status`: boolean. the running status of the LED

### Example

![](./pic/button_led.jpg)

Check the button status in every 1s. If it is pressed, turn on the LED, otherwise, turn off.