Math library
================
## add

### Description

`out` = `in1` + `in2`

### Inport

`in1`: Number.

`in2`: Number.

### Outport

`out`: Number. `out` = `in1` + `in2`

### Example

![](./pic/add.jpg)

`in1`:2.5

`in2`:-1

`out` is 1.5： 2.5 + (-1) = 1.5



## sub

### Description

`out` = `in1` - `in2`

### Inport

`in1`: Number. The minuend.

`in2`: Number. The subtrahend.

### Outport

`out`: Number. `out` = `in1` - `in2`

### Example

![](./pic/sub.jpg)

`in1`:-2

`in2`:1.5

`out` is -3.5： (-2) - 1.5 = (-3.5)


## mul

### Description

`out` = `in1` x `in2`

### Inport

`in1`: Number.

`in2`: Number.

### Outport

`out`: Number. `out` = `in1` x `in2`

### Example

![](./pic/mul.jpg)

`in1`:-2

`in2`:-1.1

`out` is 2.2： (-2) x (-1.1) = 2.2


## div

### Description

`out` = `in1` / `in2`

### Inport

`in1`: Number. The dividend.

`in2`: Number. The divisor.

### Outport

`out`: Number. `out` = `in1` / `in2`

### Example

![](./pic/div.jpg)

`in1`:1

`in2`:4

`out` is 0.25： 1 / 4 = 0.25


## map

### Description

This service re-maps a number from one range to another.
That is, a value of fromLow would get mapped to toLow, a value of fromHigh to toHigh, values in-between to values in-between, etc.

### Config

`fromLow`: Number. The lower limit of source range.

`fromHigh`: Number. The upper limit of source range.

`toLow`: Number. The lower limit of target range.

`toHigh`: Number. The upper limit of target range.

### Inport

`in`: Number. The input number.

### Outport

`out`: Number. The output value.


## round

### Description

This service rounds the value of `in`, and output the result to `out`.

### Inport

`in`: Number. The input number.

### Outport

`out`: Number. The output value.

### Example

`in`: 0.5

`out` is 1

`in`: 2.4

`out` is 2


## random

### Description

This service generates random number between `min` and `max`.

### Inport

`min`: Number. The lower limit of random number.

`max`: Number. The upper limit of random number.

`trigger`: Any. The event to trigger a generation, value of this inport will be discarded.

### Outport

`out`: Number. A random value.

### Example

![](./pic/random.jpg)

For this example, we will get a random number between \[-50, 50\] every second.
