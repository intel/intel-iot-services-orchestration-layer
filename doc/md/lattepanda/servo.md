Servo
=====

## set

### Description

Let servo to rotate to some certain degree

### Config

`pin`: int. the PWM pin which is attached by the servo

### Input

`angle`: int. the rotate angle (0-180)

### Output

`status`: boolean. if succeeds, output true.

### Example

## stop

### Description

Let servo stop sweeping

### Config

`pin`: int. the PWM pin which is attached by the servo

### Input

`trigger`: Any. Whenever it comes, stop the servo.

### Output

`status`: boolean. if succeeds, output true.

### Example

## sweep

### Description

Let servo start sweeping

### Config

`pin`: int. the PWM pin which is attached by the servo

### Input

`trigger`: Any. Whenever it comes, sweep the servo.

### Output

`status`: boolean. if succeeds, output true.

### Example