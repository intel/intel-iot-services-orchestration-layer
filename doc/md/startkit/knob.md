Knob
======
## readValue

### Description

measure the value of the knob (0-1024)

### Config

`pin`: int. the aio pin which the sensor attached

### Input

`trigger`: any type. trigger signal, and whenever it comes, the sensor will measure and report the knob value.

### Output

`value`: number. the value of the knob (0-1024)

### Example

![](./pic/knob_buzz.jpg)

It reads knob value in every 1s, if the value is above 500, then turn on the buzzer.