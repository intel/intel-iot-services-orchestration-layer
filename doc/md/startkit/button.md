Button
======
## detectPress

### Description

When triggered, detect whether the button is pressed. If so, output true, otherwise, false.

### Config

`pin`: int. The gpio pin which is attached by the button

### Input

`trigger`: any type. It is a trigger signal, and whenever it comes, the service will check whether pressed.

### Output

`bool`: boolean. true means it is pressed, otherwise, false.

### Example

![](./pic/button_buzz.jpg)

It will check whether button is pressed in every 1s, if it is pressed, the buzzer starts buzzing, otherwise, the buzzer stop buzzing.