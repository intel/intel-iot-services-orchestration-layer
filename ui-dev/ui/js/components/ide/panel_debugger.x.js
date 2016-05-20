/******************************************************************************
Copyright (c) 2015, Intel Corporation

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
import {Label} from "react-bootstrap";
import Tbb from "../common/toolbar_button.x";

function msgsts(m, act) {
  if (!act) {
    return "";
  }
  if (m === act) {
    return " active";
  }
  if (act.data.IN_id !== m.data.IN_id) {
    return " grey";
  }
  return " buddy";
}

export default class PanelDebugger extends ReactComponent {

  constructor(props) {
    super(props);

    this.state = {
      active: null,
      show_filter: false,
      filter: "",
      tag: null,
      is_regex: false
    };
  }

  _on_clear() {
    var view = this.props.view;
    view.clear_debug_traces();
  }

  _on_filter() {
    this.setState({
      show_filter: !this.state.show_filter
    });
  }

  _on_rx(e) {
    this.setState({
      is_regex: e.target.checked
    });
  }

  _on_change(e) {
    this.setState({
      filter: e.target.value
    });
  }

  has_filter() {
    return !!this.state.tag || !!this.state.filter;
  }

  select_tag(tag) {
    this.setState({
      tag: tag
    });
  }

  _on_debug_event() {
    var view = this.props.view;
    if (this.state.active && view.get_debug_traces().indexOf(this.state.active) < 0) {
      this.inactive(view);
    }
    this.forceUpdate();
  }

  componentDidMount() {
    var view = this.props.view;
    if (view) {
      view.on("debug", this._on_debug_event);
    }
  }

  componentWillReceiveProps(nextProps) {
    var view = this.props.view;
    if (view) {
      view.removeListener("debug", this._on_debug_event);
    }
    if (nextProps && nextProps.view) {
      nextProps.view.on("debug", this._on_debug_event);
    }
  }

  componentWillUnmount() {
    var view = this.props.view;
    if (view) {
      view.removeListener("debug", this._on_debug_event);
    }
  }

  click_msg(msg) {
    var view = this.props.view;

    if (!this.state.active || this.state.active !== msg) {
      this.active(view, msg);
    }
    else {
      this.inactive(view);
    }
  }

  active(view, msg) {
    this.setState({
      active: msg
    });

    $hope.trigger_action("graph/select/node", {
      graph_id: view.id,
      id: msg.node_id
    });
  }

  inactive(view) {
    this.setState({
      active: null
    });

    $hope.trigger_action("graph/unselect/all", {
      graph_id: view.id
    });
  }

  render() {
    var view = this.props.view;
    if (!view) {
      return null;
    }

    var rx;
    var output = [];
    _.forEach(view.get_debug_traces(), msg => {
      var node = view.get("node", msg.node_id);
      var name = (node && node.$get_name()) || "";
      var d = msg.data, t = d.type;
      var is_kernel = t === "kernel", is_send = t === "send";
      if (this.state.tag && t !== this.state.tag) {
        return;
      }
      if (this.state.filter) {
        if (this.state.is_regex) {
          rx = rx || new RegExp(this.state.filter, "i");
          if (!rx.test(name)) {
            return;
          }
        }
        else if (name.toLowerCase().indexOf(this.state.filter.toLowerCase()) < 0) {
          return;
        }
      }
      output.push(
        <div key={msg.seq} className={"hope-debugger-msg" + msgsts(msg, this.state.active)}
          onClick={this.click_msg.bind(this, msg)}>
          <div>
            <span>{(new Date(msg.time)).toLocaleTimeString()}</span>
            <Label className="hope-debugger-label" bsStyle={is_kernel ? "primary" : "success"}>{t}</Label>
            <span className="hope-debugger-msg-name">{name}</span>
          </div>
          <pre className="hope-debugger-msg-data">
            {$hope.to_string(is_kernel ? d.IN : is_send ? d.data : d)}
          </pre>
        </div>
      );
    });

    return (
      <div className="match-parent">
        <div className="hope-debugger-toolbar">
          <Tbb icon={"ban"}
              placement="bottom"
              tips={__("Click to clear the output")}
              onClick={this._on_clear} />
          <Tbb icon={"filter "
                + (this.state.show_filter ? "show-filter" : "hide-filter")
                + (this.has_filter() ? " filled-filter" : " empty-filter")}
              placement="bottom"
              tips={__("Filter")}
              onClick={this._on_filter} />
        </div>

        {this.state.show_filter &&
          <div className="hope-filter-panel">
            <div>
              <input className="hope-filter-text" type="text"
                  value={this.state.filter}
                  onChange={this._on_change} />
              <input type="checkbox"
                  value={this.state.is_regex}
                  onChange={this._on_rx} />{" " + __("Regex")}
            </div>
            <span className={"hope-filter-tag" + (this.state.tag ? "" : " active")}
              onClick={this.select_tag.bind(this, null)}>All</span>
            <span className={"hope-filter-tag" + (this.state.tag === "kernel" ? " active" : "")}
              onClick={this.select_tag.bind(this, "kernel")}>Kernel</span>
            <span className={"hope-filter-tag" + (this.state.tag === "send" ? " active" : "")}
              onClick={this.select_tag.bind(this, "send")}>Send</span>
          </div>
        }

        <div className={"hope-debugger-output" + (this.state.show_filter ? " offset-top" :"")}>
          {output}
        </div>
      </div>);
  }
}
