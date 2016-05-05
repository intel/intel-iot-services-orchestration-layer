# Basic Items of Configuration

The configuration file is basically a JSON file, while we allow comments inside it.

| config field  |   optional  |   available values  |  description |
|:----------|:------|:----------|:--------------------------------------|
| type          |    no       |    center / hub     | set to center if it is a cetner, or hub if it is a hub|
| name          |    yes      |                     | give a meaningful name for this center or hub. It's just a name easy-to-read so no need to be universally unique|
| id            |    yes      |                     | this should be universally unique as it refers to this center or hub. If omitted, system would try to generate one for it |



