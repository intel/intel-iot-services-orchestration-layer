Thermometer
======
## measureTemp

### Description

measure and report the temperature value (centi-degree)

### Config

`pin`: int. the aio pin which is attached by the sensor

### Input

`trigger`: any type. trigger signal, and whenever it comes, the sensor will measure and report the temperature.

### Output

`value`: number. the temperature (centi-degree)

### 样例

![](./pic/temp_lcd.jpg)

Measures the tempratur in every 1s, and then show the result in LCD.