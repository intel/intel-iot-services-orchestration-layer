class DemoComponent extends Widget {
  componentWillUpdate() {
    var data = this.get_data();
    if (_.isArray(data) && data.length > 0) {
      var msg = String(data[0].input);
      if (msg === this.$msg) {
        return;
      }
      this.$msg = msg;
      this.forceUpdate();
    }
  }

  render() {
    return super.render(
      <div className="match-parent text-center">
        {this.$msg || "This is a Demo."}
      </div>
    );
  }
}

$hope.register_widget("hope/ui/demo", DemoComponent);
