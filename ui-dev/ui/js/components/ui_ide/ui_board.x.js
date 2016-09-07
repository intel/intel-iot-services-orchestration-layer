/******************************************************************************
Copyright (c) 2016, Intel Corporation

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Intel Corporation nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*****************************************************************************/
import Grid from "./grid_stack.x";


export default class UIBoard extends ReactComponent {
  static propTypes = {
    view: React.PropTypes.object.isRequired,
    width: React.PropTypes.number.isRequired
  };


  _on_change(widgets) {
    setTimeout(()=> {
      $hope.trigger_action("ui/change_widgets", {
        ui_id: this.props.view.id,
        widgets: widgets
      });
    }, 0);
  }

  _on_drop(event, ui) {
    var rect = ReactDOM.findDOMNode(this).getBoundingClientRect();
    var x = (event.x || event.clientX || 0) - rect.left;
    var y = (event.y || event.clientY || 0) - rect.top;

    var data = $(ui.helper).data();
    // the first 20 in y is for padding of hope-ui-container
    // the 2nd 20 is grid-stack's issue, it forgot that for n rows,
    // only need to calculate (n-1) vertical-margin, it still uses n
    var cell = this.refs.grid.grid.get_cell_from_pixel({
      left: x,
      top: y + 20 + 20
    });

    var view = this.props.view;
    $hope.trigger_action("ui/add_widget", {
      ui_id: view.id,
      widget: {
        spec: data.hopeSpecId,
        x: cell.x,
        y: cell.y,
        width: 1,
        height: 1
      }
    });
  }

  _on_click(e) {
    e.stopPropagation();
    $hope.trigger_action("ui/unselect/all", {ui_id: this.props.view.id});
  }

  // We cannot set the droppable to the Grid, unfortunately.
  // Gridstack adjust its height automatically so at the beginning its height
  // is always 0 so no way to accept any drop
  // we have to do so in its container
  componentDidMount() {
    $(ReactDOM.findDOMNode(this)).droppable({
      accept: ".widget-accept",
      drop: this._on_drop
    });      
  }

  render() {
    var view = this.props.view;
    var ui = view.get_ui();

    return (
      <div className="hope-ui-container" onClick={this._on_click}>
        <Grid ref="grid"
              float={true}
              animate={true}
              onChange={this._on_change}
              widgets={ui.widgets}
              view={view}
              width={this.props.width - 40} />
      </div>
    );
  }
}
