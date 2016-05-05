Moisture Sensor
======
## measureMoist

### Description

measure the moisture value of soil

### Config

`pin`: int. the aio pin which is attached by the sensor

### Input

`trigger`: any type. trigger signal, and whenever it comes, the sensor will measure and report the moisture value.

### Output

`value`: number. the value of the moisture

### Example

![](./pic/moisture_lcd.jpg)

It measure the moisture in every 1s, and show the value in the LCD