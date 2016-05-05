# Case 1: Math

Builtin service `f` has config item `f(x)`. We should input the function body.

The final function is 

```
f(x) {
  the body you typed in the config
}
```

And the return value is the outport value.

We can implement a polynomial function, type `return x*x+2*x+3`

![](./doc/pic/example/user_defined/fx1.jpg)

If the input `x` is 4, it will sendout 27 (`4*4+2*4+3`).