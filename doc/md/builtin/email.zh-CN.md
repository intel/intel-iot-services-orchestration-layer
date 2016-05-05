邮件服务
================
## 发邮件

### 描述

通过某个邮件服务商，向某个收件人发送邮件

内部通过[nodemailer](https://github.com/nodemailer/nodemailer)模块实现

现阶段只支持纯文本内容，并不支持网络代理

### 配置

`service`: 字符串 必填项 你的邮件服务商,比如Gmail,QQ,126,163,Hotmail,iCloud等,详见[nodemailer-wellknown](https://github.com/nodemailer/nodemailer-wellknown/blob/master/services.json)

`account`: 字符串 必填项 你的邮箱地址

`passwd`: 字符串 必填项 你的邮箱密码(客户端密码,可能与登录密码不同)

`receiver`: 字符串 必填项 收件人地址

### 输入

`text`: 字符串 邮件内容

`subject`: 字符串 邮件标题

### 输出

`status`: 布尔值 如果发送成功,输出true,反之输出false

### 样例

![](./pic/email.zh-CN.jpg)

图中用户(hope@126.com)向 hope@intel.com 发了邮件。邮件标题为“this is a title”，内容为“this is a text”的邮件