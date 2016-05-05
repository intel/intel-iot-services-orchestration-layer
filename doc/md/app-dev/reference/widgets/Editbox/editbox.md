EditBox Widget
======
## Editbox

### Description

An editable text control, Editbox widget is used to accept textual input from the user, and output message with user's input.

### Configuration

`name`: String type. The unique name of this widget.

`type`: String type. The type of editor, only single-line editor implemented now.

`Glyphicon`: Glyphicon type. The icon of commit button.

`placeholder`: String type. The hint message when editor is empty.

`Auto submit`: Boolean type. If it's true, user's input will be sendOUT for each changes. Else only sendOUT when Enter-key was pressed or Glyphicon was clicked.

### Input

`preset`: String type. The content of editor will be replace with this text that input from workflow.

### Output

`text`: String type. The output message contains the content of editor.

### Example

![](./doc/pic/refer/editbox1.png){.viewer}

For this case, output message will be send if Enter-Key pressed or Glyphicon was clicked.

![](./doc/pic/refer/editbox2.png){.viewer}

For this case, output message will be send for each changes of text.