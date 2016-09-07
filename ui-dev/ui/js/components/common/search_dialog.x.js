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
import Dialog from "./dialog.x";
import SearchBox from "./search_box.x";
var {ListGroup, Overlay, Popover, MenuItem} = require("react-bootstrap");

//////////////////////////////////////////////////////////////////
// hub,service,thing,widget,search dialog
//////////////////////////////////////////////////////////////////
var dlg_mount_node = document.getElementById("hope-modal-dialog");

var Auto_Complete_Item = React.createClass({
  changeText() {
    this.props.changeText(this.props.name);
  },
  render() {
    return (
      <span className="list-group-item" onClick={this.changeText}>
        <h5 className="list-group-item-heading">{this.props.name}</h5>
        <p className="list-group-item-text">{this.props.description.length>70?this.props.description.substring(0,70)+"...":this.props.description}</p>
      </span>
    )
  }
});

var Auto_Complete_Result = React.createClass({
  renderData() {
    return this.props.data.map((item) => {
      return (
        <Auto_Complete_Item key={item.name} name={item['name']}
                            description={item['description']} changeText={this.props.changeText}>
        </Auto_Complete_Item>
      )
    });
  },
  render() {
    return (
      <div className="hope-search-result row">
          <ListGroup>
            {this.renderData()}
          </ListGroup>
      </div>
    );
  }
});

var Install_Package_Item = React.createClass({
  getInitialState() {
    return {
      version: this.props.version,
      candidates: [],
      show: false
    };
  },

  _on_install() {
    this.props.install_thing(this.props.name, this.props.version === this.state.version ? null : this.state.version);
  },

  _on_query_versions() {
    this.setState({show: true });

    if (this.$pending || this.state.candidates.length > 0) {
      return;
    }
    this.$pending = true;

    $hope.app.server.package.version$(this.props.name).then(data => {
      this.setState({
        candidates: data
      });
      this.forceUpdate();
    }).catch(function(err) {
      console.log("package search err due to", err);
      $hope.notify("error", __("Failed to search!"), err);
    });
  },

  choice(ca) {
    this.setState({
      version: ca,
      show: false
    });
  },

  render() {
    var ov;
    if (this.state.candidates.length > 0) {
      ov = <Popover id="s" >
        {_.map(this.state.candidates,
          ca => <MenuItem key={ca} onSelect={this.choice.bind(this, ca)}>{"v" + ca}</MenuItem>
        )}
      </Popover>;
    }
    else {
      ov = <Popover id="s" >
        <div className="hope-npm-install-spinner">
          <i className="fa fa-spinner fa-pulse fa-2x"></i>
        </div>
      </Popover>;
    }
    return (
      <span className="list-group-item">
        <div className="list-group-item-heading">
          <span className="hope-package-install-result-package">{this.props.name}</span>
          <span className="hope-package-install-result-author">{this.props.author}</span>
          <i className="fa fa-download hope-package-install-result-download fa-2x" onClick={this._on_install}></i>
        </div>
        <div className="list-group-item-text">{this.props.description}</div>

        <span className="hope-package-install-result-version" ref="ver"
              onClick={this._on_query_versions}>{"v" + (this.state.version)}</span>

        <Overlay show={this.state.show}
          target={() => this.refs.ver}
          placement="bottom"
          rootClose={true} onHide={()=> this.setState({show: false})}
          containerPadding={20}>
          {ov}
        </Overlay>
      </span>
    )
  }
});

var Install_Package_Result = React.createClass({
  renderData() {
    return this.props.data.map((item) => {
      return (
        <Install_Package_Item
            key={item.name}
            name={item['name']}
            install_thing={this.props.install_thing}
            description={item['description']}
            author={item['author']}
            version={item.version} />
      )
    });
  },
  render() {
    return (
      <div className="hope-package-install-result row">
        <ListGroup>
          {this.renderData()}
        </ListGroup>
      </div>
    )
  }
});


var Search_Dialog = React.createClass({
  _on_search(text) {
    var self = this;
    self.setState({
      key: text,
      auto_complete_show: true,
      search_result_show: false
    });
    if (text.length > 0) {
      isol_search.auto_complete(text).then(function(data) {
        if (text === self.state.key) {
          self.setState({
            auto_data: data
          });
        }
      }).catch(function(err) {
        console.log("package search err due to", err);
      });

    }
  },
  search(text) {
    if (!text) {
      text = this.state.key;
    }
    if(!this.state.is_get_result&&text.length>0){
      this.setState({
        auto_complete_show:false,
        search_result_show:true,
        refresh:true,
        is_get_result: true
      });
      this.getResult(text);
    }
  },
  changeText(text) {
    this.setState({
      key: text
    });
  },
  getInitialState() {
    return {
      key: "",
      auto_data: [],
      search_data: [],
      current_page:1,
      refresh: false,
      auto_complete_show: true,
      search_result_show: false,
      is_get_result: false
    };
  },
  getResult(name) {
    var self = this;
    $hope.app.server.package.search$(name, this.state.current_page).then(function(data) {
      self.setState({
        search_data:data.data,
        refresh:false,
        auto_complete_show:false,
        search_result_show:true,
        is_get_result:false
      });
    }).catch(function(err) {
      console.log("package search err due to", err);
      $hope.notify("error", __("Failed to search!"), err);
      self.setState({
        refresh:false,
        auto_complete_show:true,
        search_result_show:false,
        is_get_result:false
      });
    });
  },

  render() {
    return (
      <Dialog title={this.props.title} no_footer={true} modal={{backdrop: "static"}}
              onOK={this.search} NoCloseByEnterKey={true}>
        <div>
          <SearchBox
            onSubmit={this.search}
            onChange={this._on_search}
            initialSearchString = {this.state.key}
          />
          {this.state.auto_complete_show === true &&
            <Auto_Complete_Result data={this.state.auto_data} changeText={this.changeText} />
          }
          {this.state.search_result_show === true && this.state.refresh === true &&
              <div className="hope-npm-install-spinner">
                <i className="fa fa-spinner fa-pulse fa-2x"></i>
              </div>
          }
          {this.state.search_result_show === true && this.state.refresh === false &&
            <Install_Package_Result data={this.state.search_data} install_thing={this.props.install_thing}/>
          }

        </div>
      </Dialog>
    );
  }
});
Search_Dialog.show = function(title, install_thing) {
  ReactDOM.render(
    <Search_Dialog title={title}  install_thing={install_thing}>
    </Search_Dialog>, dlg_mount_node);
};

module.exports.Search_Dialog = Search_Dialog;
