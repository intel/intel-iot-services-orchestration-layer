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
export default class LinterMessage extends ReactComponent {

  static propTypes = {
    msg: React.PropTypes.object
  };

  render() {
    var m = this.props.msg;
    var t;

    switch(m.type) {
      case "REQUIRED_CONFIG":
        t = <span>{__("Config required") + ": "}<strong>{m.name}</strong></span>;
        break;

      case "SPEC_NOT_FOUND":
        t = <span>{__("Lost Spec") + ": "}<strong>{m.id}</strong></span>;
        break;

      case "WIDGET_NOT_FOUND":
        t = <span>{__("Lost Widget") + ": "}<strong>{m.id}</strong></span>;
        break;

      case "HUB_NOT_FOUND":
        t = <span>{__("Lost Hub") + ": "}<strong>{m.id}</strong></span>;
        break;

      case "THING_NOT_FOUND":
        t = <span>{__("Lost Thing") + ": "}<strong>{m.id}</strong></span>;
        break;

      case "SERVICE_NOT_FOUND":
        t = <span>{__("Lost Service") + ": "}<strong>{m.id}</strong></span>;
        break;

      default:
        t = "unimpl. <" + JSON.stringify(m) + ">";
    }
    return <div className="hope-linter-error">{t}</div>
  }
}
