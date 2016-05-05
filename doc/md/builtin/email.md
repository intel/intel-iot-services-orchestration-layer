email
================
## sendmail

### Description

Send a message to the recipient via an email service provider.

This service is implemented by [nodemailer](https://github.com/nodemailer/nodemailer)

At this stage, only supports plain-text body, and don't support the network proxy.

### Config

`service`: String. your email service provider, such as Gmail,QQ,126,163,Hotmail,iCloud, see [nodemailer-wellknown](https://github.com/nodemailer/nodemailer-wellknown/blob/master/services.json) for details.

`account`: String. the registered username of your email, probably it is your email address.

`passwd`: String. the password for the username (password for mail client, might be different from login's)

`receiver`: String. the email address of recipient.

### Inport

`text`: String. the content of email.

`subject`: String. the subject of email.

### Outport

`status`: Boolean. output *true* if send email successfully, otherwise output *false*.

### Example

![](./pic/email.jpg)

In this case, user(hope@126.com) may send an email to hope@intel.com, which subject as “this is a title” and text as “this is a text”.
