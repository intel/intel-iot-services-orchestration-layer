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
import {Modal, Button, Input} from "react-bootstrap";


export default class DlgCreate extends ReactComponent {

  static propTypes = {
    onClickCreate: React.PropTypes.func
  };

  state = {
    name: "",
    description: ""
  };

  _on_create(e) {
    e.preventDefault();
    e.stopPropagation();
    if (_.isFunction(this.props.onClickCreate)) {
      this.props.onClickCreate({
        name: this.state.name,
        description: this.state.description
      });
    }
    this.props.onRequestHide();
  }

  _on_name_change(e) {
    this.setState({
      name: e.target.value
    });
  }

  _on_description_change(e) {
    this.setState({
      description: e.target.value
    });
  }


  render() {
    return (
      <Modal {...this.props} animation={true}>
        <div className="modal-body">
        <form onSubmit={this._on_create}>
          <Input value={this.state.name} 
                 type="text"
                 label="Name" 
                 onChange={this._on_name_change}
                 placeholder="Enter Name"/>
          <Input value={this.state.description} 
                 type="text"
                 label="Description" 
                 onChange={this._on_description_change}
                 placeholder="Enter Description"/>
        </form>
        </div>
        <div className="modal-footer">
          <Button bsStyle="primary" onClick={this._on_create}>Create</Button>
          <Button bsStyle="default" onClick={this.props.onRequestHide}>Cancel</Button>
        </div>
      </Modal>
    );
  }
}

