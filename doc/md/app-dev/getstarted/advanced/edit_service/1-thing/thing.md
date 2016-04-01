# Thing

## Introduction of Thing

**Thing** represents a thing which is connected with the **hub**.  It can provide several services for user/developers. For example, *LED* is a thing, and *turn on*, *turn off*, *dim* are services of the thing.

The connection between thing and hub can be wired, wireless, or builtin.

## Directory Layout

Each **Thing** is a directory, which is contained by the thingbundle folder and must has the `thing.json`. 

For example, the thingbundle path is `bundle/`, and its tree graph is as follows:

    bundle
    |-- display
    |   `-- led
    |       `-- thing.json
    |-- sensor
    |   |-- sensor0
    |   |   `-- readme
    |   |-- sensor1
    |   |   `-- thing.json
    |   `-- sensor2
    |       `-- thing.json
    `-- doc
Then *led*, *sensor1* and *sensor2* are things, while *sensor0*, *display*, *sensor* and *doc* are **NOT** things because they don't contain `thing.json` directly.

## `thing.json`

`thing.json` is the description JSON file of the thing. It has the following properties.

* `id`: String. The unique id of the thing. Default: one created by the path and hub id.
* `name`: String. The thing name, which will be showed in the web IDE. Default: the name of the thing folder.
* `description`: String. The description of the thing.
* `is_builtin`: Boolean. If true, the thing and all its services cannot be changed and removed. Default: false.