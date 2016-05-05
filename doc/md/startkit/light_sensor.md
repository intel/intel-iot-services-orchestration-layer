Light Sensor
======
## measureLight

### Description

measure the ambient light value

### Config

`pin`: int. the aio pin which is attached by the sensor

### Input

`trigger`: any type. trigger signal, and whenever it comes, the sensor will measure and report the light value.

### Output

`value`: number. the value of the light

### Example

![](./pic/light_led.jpg)

It measure the light in every 1s, if the value is below 100, turn on the light, otherwise, turn off.