General IO Operation
=====

## digitalWrite

### Description

write true or false to gpio pin

### Config

`pin`: int. the GPIO pin

### Input

`on`: boolean. the value of the GPIO

### Output

`status`: boolean. the GPIO's status: true or false

### Example

## digitalRead

### Description

read digital pin's value

### Config

`pin`: int. the GPIO pin

### Input

`trigger`: Any. Whenever it comes, read gpio's value.

### Output

`bool`: boolean. the value of the gpio.

### Example

## analogRead

### Description

read analog pin's value

### Config

`pin`: int. the AIO pin

### Input

`trigger`: Any. Whenever it comes, read the analog io value.

### Output

`value`: number. the analog value.

### Example