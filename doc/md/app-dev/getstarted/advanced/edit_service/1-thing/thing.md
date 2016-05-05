# Thing

**NOTE** You may have two ways to create/edit Thing or Service, as described just now at [here](#getstarted/advanced/edit_service). If you are using the first option, i.e. directly edit that in Web IDE, this section is just for your information. However, if you are using the second option, i.e. offline operating on directory and files, you need to carefully read this section.

## Introduction of Thing

**Thing** represents a thing which is connected with the **hub**.  It can provide several services for user/developers. For example, *LED* is a thing, and *turn on*, *turn off*, *dim* are services of the thing.

The connection between thing and hub can be wired, wireless, or builtin.

## Directory Layout

For a **hub**, all of its **Things** are stored in one directory and so called as `thingbundle`. The path of `thingbundle` is defined in the configuration file used to bootstrap this **hub**. See the item `thingbundle_path` in [Hub_Specific Configuration](#getstarted/advanced/configuration/5-Hub_Specific).

NOTE that for **Center**, it also comes with an embedded **hub** (so called builtin hub) which hosts a lot of **Services** shipped by default.

Each **Thing** itself is also a directory, which is contained by the thingbundle folder and must has the `thing.json`. 

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