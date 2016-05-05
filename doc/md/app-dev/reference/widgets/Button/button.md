Button Widget
======
## Button

### Description

A button widget is a small and rectangular control element that can be clicked on and off. Button widget can be used in three cases:

+ *Message*: `Default` value, In this case, It will sendOUT a message (configurated by `message`) only when it be clicked.

+ *UI Switch*: The target UI will be display when this button be clicked.

+ *Two Events*: It will sendOUT a message with `true` when button pressed down, and sendOUT a message with `false` for button released or mouse moving out.


### Configuration

`name`: String type. The unique name of this widget.

`caption`: String type. The caption of button.

`style`: Option type. The style of button, includes background and UI effects.

`action`: Option type. The action for mouse/touch events.

`message`: Any type. The body of output message. This config applies only for *Message* action.

`Target UI`: String type. The target UI to display. This config applies only for *UI Switch* action.

### Input

N/A

### Output

`event`: Any type. The output message.

### Examples

![](./doc/pic/refer/button1.png){.viewer}

For this example, when *FAN ON* button be clicked, it will sendOUT({event: "turn_fan_on"})


![](./doc/pic/refer/button2.png){.viewer}

For this case, when *FAN ON* button be pressed down, it will sendOUT({event: `true`}),
sendOUT({event: `false`}) if button released or mouse moved out.

![](./doc/pic/refer/button3.png){.viewer}

For this case, the target UI `U1` will be load and display when button be clicked.
