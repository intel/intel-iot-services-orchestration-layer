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
import {Label} from "react-bootstrap";
import Tbb from "../common/toolbar_button.x";
import DlgError from "./dlg_error_details.x";

export default class PanelError extends ReactComponent {

  constructor(props) {
    super(props);

    this.state = {
      show_filter: false,
      filter: "",
      is_regex: false,
      active: null
    };
  }

  _on_save() {
    var filename = "error-list.json";
    var data = $hope.app.stores.error.get_errors();
    var blob = new Blob([JSON.stringify(data, null, "\t")], {"type": "application/octet-stream"});
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, filename);
    }
    else {
      var a = this.refs.a;
      a.href = window.URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    }
  }

  _on_clear() {
    $hope.app.stores.error.clear_errors();
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
    return !!this.state.filter;
  }

  _on_error_event() {
    this.forceUpdate();
  }

  _on_click_error(err) {
    this.setState({
      active: err
    });
  }

  componentDidMount() {
    $hope.app.stores.error.on("errors", this._on_error_event);
  }

  componentWillUnmount() {
    $hope.app.stores.error.removeListener("errors", this._on_error_event);
  }

  render() {
    var rx;
    var output = [];
    _.forEach($hope.app.stores.error.get_errors(), err => {
      var str = err.message;
      if (this.state.filter) {
        if (this.state.is_regex) {
          rx = rx || new RegExp(this.state.filter, "i");
          if (!rx.test(str)) {
            return;
          }
        }
        else if (str.indexOf(this.state.filter) < 0) {
          return;
        }
      }
      output.push(
        <div key={err.seq} className={"hope-error-msg"}>
          <div style={{padding: "4px"}}>
            <span>{(new Date(err.time)).toLocaleTimeString()}</span>
            <Label className="hope-error-label" bsStyle={"danger"}>{err.subsystem}</Label>
            <Label className="hope-error-label right" onClick={this._on_click_error.bind(this, err)}>{__("Details")}</Label>
          </div>
          <pre className="hope-error-msg-data">
            {str}
          </pre>
        </div>
      );
    });

    return (
      <div className="match-parent">
        <div className="hope-debugger-toolbar">
          {window.Blob &&
            <Tbb icon={"save"}
              placement="bottom"
              tips={__("Click to save the output")}
              onClick={this._on_save} />
          }
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

        <a ref="a" target="_self" style={{display: "none"}}/>

        {this.state.show_filter &&
          <div className="hope-filter-panel" style={{height: "auto"}}>
            <div>
              <input className="hope-filter-text" type="text"
                  value={this.state.filter}
                  onChange={this._on_change} />
              <input type="checkbox"
                  checked={this.state.is_regex}
                  onChange={this._on_rx} />{" " + __("Regex")}
            </div>
          </div>
        }

        <div className={"hope-debugger-output" + (this.state.show_filter ? " offset-top" :"")}>
          {output}
        </div>

        {this.state.active &&
          <DlgError err={this.state.active} show={true} onHide={this._on_click_error.bind(this, null)} />
        }
      </div>);
  }
}
