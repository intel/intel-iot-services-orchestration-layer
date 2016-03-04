Fire Sensor
======
## measureFire

### Description

measure the fire value

### Config

`pin`: int. the aio pin which the sensor attached

### Input

`trigger`: any type. trigger signal, and whenever it comes, the sensor will measure and report the fire value.

### Output

`value`: number. the fire value

### Example

![](./pic/fire_buzz.jpg)

It measure the fire in every 1s, if the value is above 100, then turn on the buzzer.