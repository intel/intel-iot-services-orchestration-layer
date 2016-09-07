file
================
## file_read

### Description

This service provides ability to read file content. If the file does not exist, it will output nothing.

At this page, only supports absolute file path.

### Config

`path`: String. The file path that you want to read.

### Inport

`switch`: Boolean. The switching signal of read file. If it's true, this service will file content according to the config `path`.

### Outport

`out`: String. The file content.

### Example

![](./pic/file_read.png)


## file_write

### Description

This service provides ability to write content to file. You can simply override the specific file or just append data to it.
If the file does not exist, it will create an empty file and write data to it.When you set the config `path`, you must ensure the the directory exist.

At this page, only supports absolute file path.

### Config

`path`: String. The file path that you want to write.

`mod`: String. The operation mode. If the value equals `append`, this service will append data to specific file, otherwise it will override it.

### Inport

`input`: String. The content that will be write to file.

### Outport

`out`: Boolean. Output *true* if send write file successfully, otherwise output *false*.

### Example

![](./pic/file_write.png)

