Counter
================
## count

### Description

This service provides count-up kind counter, the initial value is 0.

### Inport

`trigger`: Any. Event to increase the counter.

`reset`: Boolean. True value to reset the counter.

### Outport

`out`: Any. The current value of counter.


## countdown

### Description

This service provides count-down kind counter, the initial value is 0.

### Inport

`trigger`: Any. Event to decrease the counter.

`reset`: Boolean. True value to reset the counter with value of `orig`. 

`orig`: Integer. The original value of counter.

### Outport

`hit`: Boolean. When and only when the value of counter decreas to 0, `hit` output true.

