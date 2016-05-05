# Radio jsx

Create jsx file for source code, and save as `ui-widgets/widgets-jsx/radio.js`.

```javascript
function click(val, e) {
  e.stopPropagation();
  this.$preset = val;
  this.forceUpdate();
  this.send_data({
    value: val
  });
}

export default class RadioWidget extends Widget {
  _on_settings_changed() {
    this.forceUpdate();
  }

  render() {
    var w = this.props.widget;
    var align = "hv-center";
    var buttons = [];
    _.forEach(w.config.buttons, b => {
      var name = b.name;
      var val = b.value || name;
      if (name) {
        buttons.push(<div key={name} onClick={click.bind(this, val)}>
          <input name={w.name} type="radio" value={val} checked={this.$preset === val} />
          {" " + name}
        </div>);
      }
    });
    switch(w.config.align) {
      case "left":    align = "left-center";  break;
      case "right":   align = "right-center"; break;
      case "center":  align = "hv-center";    break;
    }
    return super.render(
      <div className={"match-parent " + align} style={{padding: "6px"}}>
        <div style={{textAlign: "left"}}>
          <form>{buttons}</form>
        </div>
      </div>
    );
  }
}

```
