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
import {Button} from "react-bootstrap";
import Frame from "../../common/frame.x";

export default class GraphDetails extends ReactComponent {

  _on_rebind() {
    $hope.trigger_action("ide/show/rebind", {}, {});
  }

  render() {
    var view = $hope.app.stores.graph.active_view;

    return (
      <div style={{
          height: this.props.height + "px",
          overflowY: "auto",
          padding: "4px 4px"}}>
        <Frame title={__("Workflow")} expanded={true}>
          <div style={{height: 100, color: "#f0ad4e", padding: "12px"}}>
            {__("Select any Node or Edge to view its information")}
          </div>
        </Frame>

        {view && view.need_rebinding() &&
          <Frame title={__("Binding")} expanded={true}>
            <div style={{color: "#f00", padding: "12px"}}>
              {__("For this workflow, we have some services that unable to resolve.")}
            </div>
            <div className="text-center">
              <Button bsStyle="primary"
                onClick={this._on_rebind}>{__("Rebinding")}</Button>
            </div>
          </Frame>
        }
      </div>
    );
  }
}
