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
import {Modal, Button, Row, Col} from "react-bootstrap";

export default class DlgError extends ReactComponent {

  state = {
    show_stack: false
  };

  _on_show_stack() {
    this.setState({
      show_stack: true
    });
  }

  render() {
    var err = this.props.err;
    return (
      <Modal {...this.props} animation={true} dialogClassName="error-info-dialog">
        <Modal.Header closeButton>
          <Modal.Title>{__("Error Infomation")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col xs={2} className="item-name">{__("Subsystem")}</Col>
            <Col xs={4}>{err.subsystem}</Col>
            <Col xs={2} className="item-name">{__("Category")}</Col>
            <Col xs={4}>{err.category}</Col>
          </Row>
          <Row className="margin-top">
            <Col xs={2} className="item-name">{__("Message")}</Col>
            <Col xs={10}><pre>{err.message}</pre></Col>
          </Row>
          <Row>
            <Col xs={2} className="item-name">{__("Stack")}</Col>
            <Col xs={10}>
              {this.state.show_stack ?
                <pre>{err.stack.join("\n")}</pre> :
                <Button bsStyle="primary" onClick={this._on_show_stack}>{__("Show stack")}</Button>
              }
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    );
  }
}

