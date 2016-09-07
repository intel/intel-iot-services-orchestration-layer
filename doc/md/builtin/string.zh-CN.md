字符串
================
## 拼接

### 描述

将两个字符串拼接为一个字符串 `out` = `in1` + `in2`

### 输入

`in1`: 字符串

`in2`: 字符串

### 输出

`out`: 字符串 `out` = `in1` + `in2`

### 样例

`in1`为"hello",`in2`为"world",那么`out`就是"helloworld"

## 搜索子串

### 描述

判断`str2`是否是`str1`的子串，即`str1`是否包含`str2`。如果是，返回true，反之false

### 输入

`str1`: 字符串 源字符串

`str2`: 字符串 子串

### 输出

`out`: 布尔值 如果`str2`是`str1`的子串，返回true

### 样例

`str1`是helloworld， `str2`是low，则out为true。因为“low”包含在“helloworld”中

`str1`是helloworld， `str2`是abc，则out为false。因为“abc”不包含在“helloworld”中

## json

### 描述

提供将字符串转换为json格式。

### 配置

‘method’：字符串，如果‘method’值为‘parse’，将会输出json格式，否则输出原字符串。

### 输入

‘Inout’：字符串，将被解析的字符串。

### 输出

‘out’：对象，解析结果。
