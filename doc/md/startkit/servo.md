Servo
======
## rotate

### Description

let servo to rotate some certain angle (0-180).

### Config

`pin`: int. the PWM pin which is attached by the servo

### Input

`angle`: int. the rotate angle (0-180)

### Output

`status`: boolean. if succeeds, output true.

### Example

![](./pic/knob_servo.jpg)

Measure the knob value in every 1s, set the rotate angle as (knob_value/10)