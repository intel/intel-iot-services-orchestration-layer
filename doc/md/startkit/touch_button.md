Touch Button
======
## detectTouch

### Description

hen triggered, detect whether the button is touched. If so, output true, otherwise, false.

### Config

`pin`: int. The gpio pin which is attached by the button

### Input

`trigger`: any type. It is a trigger signal, and whenever it comes, the service will check whether touched.

### Output

`bool`: boolean. true means it is touched, otherwise, false.

### 样例

![](./pic/touch_buzz.jpg)

It will check whether button is touched in every 1s, if it is touched, the buzzer starts buzzing, otherwise, the buzzer stop buzzing.