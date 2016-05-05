Buzzer
======
## Switch

### Description

Turn on or off the buzzer, and output its status (true or false) 

### Config

`pin`: int. the gpio pin which is attached by the buzzer.

### Input

`on`: boolean. true means turn on the buzzer, false means turn off.

### Output

`status`: boolean. the running status of buzzer

### Example

![](./pic/button_buzz.jpg)

It will check whether button is pressed in every 1s, if it is pressed, the buzzer starts buzzing, otherwise, the buzzer stop buzzing.