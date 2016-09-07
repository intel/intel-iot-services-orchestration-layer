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
var {Modal, Input, Button} = require("react-bootstrap");

var dlg_mount_node = document.getElementById("hope-modal-dialog");

var PublishServiceDlg = React.createClass({

  getInitialState() {
    return {
      name: "",
      version: "1.0.0",
      desc: "",
      keywords: "iotsol",
      author: "",
      publishing: false
    };
  },

  _on_change_xx(name, e) {
    this.setState({
      [name]: e.target.value
    });
  },

  _on_publish() {
    var service = this.props.service;

    try {
      if (this.state.name.trim() == "")
        throw new Error("Name");
      if (this.state.version.trim() == "")
        throw new Error("Version");
      if (this.state.desc.trim() == "")
        throw new Error("Description");
      if (this.state.author.trim() == "")
        throw new Error("Author");
    }
    catch (e) {
      return $hope.notify("error", __("Invalid input") + ": " + __(e.message));
    }

    if (!this.$package) {
      this.$package = {};
    }

    this.$package.name = this.state.name;
    this.$package.version = this.state.version;
    this.$package.description = this.state.desc;
    this.$package.keywords = this.state.keywords.split(" ");
    this.$package.author = this.state.author;

    this.setState({
      publishing: true
    });

    $hope.app.server.service.publish$(service.id, this.$package).then(res => {
      this.setState({
        publishing: false
      });
      if (res[0] === "OK") {
        $hope.notify("success", __("Service successfully published!"));
      }
      else {
        $hope.notify("error", __("Failed to publish service, Error Code") + ": " + res.code);
      }
    }).catch(err => {
      this.setState({
        publishing: false
      });
      $hope.notify("error", "Failed to publish$ for ", service.id, "with error:", err);
    }).done();
  },

  _close() {
    this.refs.dlg._onHide();
    process.nextTick(() => {
      ReactDOM.unmountComponentAtNode(dlg_mount_node);
    });
  },

  _read_package_json(service) {
    $hope.app.server.service.read_file$(service.id, "package.json").then(data => {
      var json = JSON.parse(data.content);
      var kw = json.keywords;

      if (_.isArray(kw)) {
        kw = kw.join(" ");
      }

      this.$package = json;

      this.setState({
        name: json.name || "",
        version: json.version || "1.0.0",
        desc: json.description || "",
        keywords: kw || "iotsol",
        author: json.author || ""
      })
    }).catch(err => {
      $hope.notify("error", "Failed to read_file$ for ", service.id, "with error:", err);
    }).done();
  },

  componentDidMount() {
    var service = this.props.service;
    $hope.app.server.service.list_files$(service.id).then(data => {
      if (_.indexOf (data.exsiting, "package.json") >= 0) {
        this._read_package_json(service);
      }
    }).catch(err => {
      $hope.notify("error", "Failed to list_files$ for ", service.id, "with error:", err);
    }).done();
  },

  render() {
    var service = this.props.service;
    return (
      <Modal ref="dlg" show={true} onHide={this._close} {...this.props.modal}>
        <Modal.Header closeButton>
          <Modal.Title>{service.$name() + " - " + __("Publish")}</Modal.Title>
        </Modal.Header>
        <Modal.Body bsClass={"modal"}>
          <Input type="text"
             label={__("Name")}
             value={this.state.name}
             onChange={this._on_change_xx.bind(this, "name")}
             placeholder={__("Package Name")}/>
          <Input type="text"
             label={__("Version")}
             value={this.state.version}
             onChange={this._on_change_xx.bind(this, "version")}
             placeholder={__("Package version")}/>
          <Input type="text"
             label={__("Description")}
             value={this.state.desc}
             onChange={this._on_change_xx.bind(this, "desc")}
             placeholder={__("Package Description")}/>
          <Input type="text"
             label={__("Keywords")}
             value={this.state.keywords}
             onChange={this._on_change_xx.bind(this, "keywords")}
             placeholder={__("Package keywords")}/>
          <Input type="text"
             label={__("Author")}
             value={this.state.author}
             onChange={this._on_change_xx.bind(this, "author")}
             placeholder={__("Package Author")}/>
        </Modal.Body>
        <Modal.Footer>
          <Button key="c" bsStyle="primary" disabled={this.state.publishing} onClick={this._on_publish}>
            {this.state.publishing ?
              <i className="fa fa-spinner fa-pulse fa-2x" /> :
              __("Publish")
            }
            </Button>
          <Button key="x" onClick={this._close}>{__("Close")}</Button>
        </Modal.Footer>
      </Modal>
    );
  }
});

module.exports = {
  publish_service: function(service) {
    ReactDOM.render(<PublishServiceDlg service={service} />, dlg_mount_node);
  }
};