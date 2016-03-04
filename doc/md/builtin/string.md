String library
================
## concat

### Description

This service joins all the inport value and output the result string.

### Inport

`in1`: String.

`in2`: String.

### Outport

`out`: String. `out` = `in1` + `in2`

### Example

`in1`: "hello"

`in2`: "world"

`out` is "helloworld"


## search

### Description

This service finding a string(`str2`) in a string(`str1`), output true if the text is found, else output false.

### Inport

`str1`: String. The source string.

`str2`: String. The sub string.

### Outport

`out`: Boolean. If `str1` includes `str2` output true, else output false.

### Example

`str1`: helloworld

`str2`: low

`out` is true


`str1`: helloworld

`str2`: abc

`out`: false