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
import {Modal, Input, Button} from "react-bootstrap";

const WF = "Workflow";
const UI = "User UI";

export default class DlgCreate extends ReactComponent {

  static propTypes = {
    onClickCreate: React.PropTypes.func
  };

  constructor(props) {
    super(props);
  
    this.state = {
      type: null
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      type: nextProps.default_type || null
    });
  }

  _on_selected(id, e) {
    e.preventDefault();
    e.stopPropagation();

    this.setState({
      type: id
    });
  }

  _on_submit(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.state.type && _.isFunction(this.props.onClickCreate)) {
      this.props.onClickCreate({
        name: this.refs.name.getValue(),
        description: this.refs.desc.getValue()
      }, this.state.type);
    }
    this.props.onHide();
  }

  render() {
    var t = this.state.type;
    return (
      <Modal {...this.props} animation={true}>
        <Modal.Header closeButton>
          <Modal.Title>{__("New ") + (t !== null ? __(t) : "")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div><strong>{__("Type")}</strong></div>
          <div className="btn-group margin-tb" role="group">
            <button type="button"
                className={"btn btn-" + (t === WF ? "primary" : "default")}
                onClick={this._on_selected.bind(this, WF)}>
              <i className="fa fa-cubes"/>{" " + __(WF)}
            </button>
            <button type="button"
                className={"btn btn-" + (t === UI ? "primary" : "default")}
                onClick={this._on_selected.bind(this, UI)}>
              <i className="fa fa-user"/>{" " + __(UI)}
            </button>
          </div>
          <Input type="text" ref="name"
                 label={__("Name")}
                 placeholder={__("Enter Name")}/>
          <Input type="text" ref="desc"
                 label={__("Description")}
                 placeholder={__("Enter Description")}/>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="default"
            onClick={this.props.onHide}>{__("Cancel")}</Button>
          <Button bsStyle="primary"
            disabled={t === null}
            onClick={this._on_submit}>{__("OK")}</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

