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
class Tabs extends ReactComponent {

  constructor(props) {
    super();

    this.state = {
      current: props.current || 0
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      current: nextProps.current || 0
    });
  }

  set_active(idx, event) {
    event.preventDefault();
    if (this.state.current !== idx && _.isFunction(this.props.onActive)) {
      this.props.onActive(idx);
    }
    this.setState({current: idx});
  }

  render() {
    var tabs = _.filter(_.isArray(this.props.children) ? this.props.children : [this.props.children], x => x.type === Tab);

    var items = _.map(tabs, (item, idx) => {
      var title = item.props.title;
      return (
        <li key={title} className={"hope-tabs-item" + (this.state.current === idx ? " active" : "")}>
          <a onClick={this.set_active.bind(this, idx)}>{title}</a>
        </li>
        );
    }, this);

    return (
      <div>
        <nav className="hope-tabs-navigation">
          <ul className="hope-tabs-item-list">
            {items}
          </ul>
        </nav>
        <article className="hope-tabs-body">
          {tabs[this.state.current]}
        </article>
      </div>
    );
  }
}

class Tab extends ReactComponent {

  render() {
    return <div>{this.props.children}</div>;
  }
}

export default {Tabs, Tab};
