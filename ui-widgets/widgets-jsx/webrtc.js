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
require("../webrtc-client-sdk/woogeen.sdk.js");
require("../webrtc-client-sdk/errors.js");
require("../webrtc-client-sdk/peer.js");

import {attachMediaStream} from "../webrtc-client-sdk/adapter.js";

export default class WebRTCWidget extends Widget {

  p2p = null;

  connect() {
    var w = this.props.widget;
    if (!w.config.peerServerIP) {
      return console.log("WebRTCWidget: Invalid configuration <peerServerIP>");
    }
    if (!w.config.cameraID) {
      return console.log("WebRTCWidget: Invalid configuration <cameraID>");
    }

    this.p2p.connect({
      host: "http://" + w.config.peerServerIP + ":8095",
      token: $hope.uniqueId()
    });
    this.p2p.invite(w.config.cameraID, () => {
      console.log('Invite success.');
      this.$on = true;
      this.forceUpdate();
      this.sendMessageWithTime();
    }, err => {
      console.log('Invite failed with message: ' + err.message);
    });
  }

  sendMessageWithTime() {
    var w = this.props.widget;
    this.p2p.send(new Date().getTime(), w.config.cameraID);
    setTimeout(this.sendMessageWithTime.bind(this), 5000);
  }

  disconnect() {
    if (this.p2p) {
      this.p2p.disconnect();
      this.$on = false;
      this.forceUpdate();
    }
  }

  componentDidMount() {
    super.componentDidMount();

    this.p2p = new Woogeen.PeerClient({
        iceServers : [ {
          urls : "stun:180.153.223.233"
        }, {
          urls : [
            "turn:180.153.223.233:4478?transport=udp",
            "turn:180.153.223.233:443?transport=udp",
            "turn:180.153.223.233:4478?transport=tcp",
            "turn:180.153.223.2330:443?transport=tcp"
          ],
          credential : "master",
          username : "woogeen"
        } ]
      });  // Initialize a Peer object

    this.p2p.on("stream-added", e => {
      var dom = this.refs.remoteVideo;
      if (this.p2p && e.stream.hasVideo()) {
        attachMediaStream(dom, e.stream.mediaStream);
        $(dom).show();
      }
    });

    this.p2p.on("stream-removed", e => {
      $(this.refs.remoteVideo).hide();
    });
  }

  componentWillUnmount() {
    this.disconnect();
    super.componentWillUnmount();
  }

  componentWillUpdate() {
    if (!this.DEBUG && this.$pstate !== this.$state) {
      this.$pstate = this.$state;

      var data = this.get_data();
      if (_.isArray(data) && data.length > 0 && ("control" in data[0])) {
        var nv = Boolean(data[0].control);
        if (nv !== this.$on) {
          if (nv) {
            this.connect();
          }
          else {
            this.disconnect();
          }
        }
      }
    }
  }

  _on_click_play(e) {
    e.stopPropagation();
    if (this.$on) {
      this.disconnect();
    }
    else if (!this.DEBUG) {
      this.connect();
    }
  }

  render() {
    return super.render(
      <div className="x-webrtc-container" style={{height: this.get_height()}}>
        <video ref="remoteVideo" autoPlay="autoplay" />
        <div onClick={this._on_click_play}
          className={"x-webrtc-play fa fa-5x" + (this.$on ? " fa-power-off" : " fa-play x-webrtc-blink")} />
      </div>
    );
  }
}


