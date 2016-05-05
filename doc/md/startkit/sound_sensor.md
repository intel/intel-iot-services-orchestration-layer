Sound Sensor
======
## measureSound

### Description

measure the ambient sound volume

### Config

`pin`: int. the aio pin which is attached by the sensor

### Input

`trigger`: any type. trigger signal, and whenever it comes, the sensor will measure and report the sound volume.


### Output

`value`: number. the volume of the sound

### Example

![](./pic/sound_lcd.jpg)

Measure the sound volume in every 1s, and show the result in the LCD
