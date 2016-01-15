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
var Gab = require("./gab.websocket.js");
var __adapter__ = require("./adapter.js");
var RTCPeerConnection = __adapter__.RTCPeerConnection;
var RTCSessionDescription = __adapter__.RTCSessionDescription;
var RTCIceCandidate = __adapter__.RTCIceCandidate;

/* Depend on woogeen.js, gab-websocket.js, WooGeen.Error.js*/
var Woogeen = window.Woogeen;
/**
 * @class Woogeen.Peer
 * @classDesc WooGeen P2P video chat
 */
Woogeen.PeerClient=function (pcConfig) {
  var that = Woogeen.EventDispatcher({});

  var PeerState={
    READY:1,  // Ready to chat.
    MATCHED:2,  // Another client joined the same room.
    OFFERED:3,  // Sent invitation to remote user.
    PENDING:4,  // Received an invitation.
    CONNECTING:5,  // Exchange SDP and prepare for video chat.
    CONNECTED:6,  // Chat.
    ERROR:9  // Haven't been used yet.
  };

  var DataChannelLabel={
    MESSAGE:'message',
    FILE:'file'
  };

  /**
   * Test if an object is an array.
   */
  var isArray=function(obj){
    return (Object.prototype.toString.call(obj) === '[object Array]');
  };

  var pcDisconnectTimeout=15000;  // Close peerconnection after disconnect 15s.

  var connectSuccessCallback;  // Callback for connect success.
  var connectFailureCallback;  // Callback for connect failure.

  var gab=null;
  var peers={};  // A map, key is target's UID, and value is an object with status and connection.
  var streams={}; //A map, key is the stream's label, and the value is : audio, video or screen.
  var chats={};  // Same as room.
  var myId=null;
  var roomStreams={};
  var isConnectedToSignalingChannel=false;
  var streamPeers={};  // Key is stream id, value is an array of peer id.

  var pcConstraints={ 'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};
  //var pcConstraints=null;
  //var dataConstraints = {'ordered': true,
  //                     'maxRetransmitTime': 3000,  // in milliseconds
  //                     'protocol': 'SCTP'
  //                    };
  var dataConstraints=null;
  var sdpConstraints={'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true }};
  var config = null;

  // Format for iceServers follows W3C standard, we parse it for different browsers.
  // TODO: Support Chrome only.
  var parseIceServers=function(iceServers){
    var servers=[];
    for(var i=0;i<iceServers.length;i++){
      var iceServer=iceServers[i];
      if(isArray(iceServer.urls)){  // If "urls" is an array.
        for(var j=0;j<iceServer.urls.length;j++){
          servers.push({url:iceServer.urls[j],username:iceServer.username,credential:iceServer.credential});
        }
      }
      else{  // If "urls" is a string.
        servers.push({url:iceServer.urls,username:iceServer.username,credential:iceServer.credential});
      }
    }
    return servers;
  };

  // Set configuration for PeerConnection
  if(pcConfig){
    config={};
    if(pcConfig.iceServers)
      config.iceServers=parseIceServers(pcConfig.iceServers);
  }

  // Return room if decode success, null if fail.
  var tryDecodeRoom=function(roomToken){
    var room=null;
    try{
      room=decodeRoom(roomToken);
    }
    catch(e){
    }
    if(room&&room.host&&room.id)  // Test if it is a valid room object.
      return room;
    else
      return null;
  };

  var getPeerInRoom=function(roomId){
    if(chats[roomId])
      return chats[roomId].peer;
  };

  /*
   * Return negative value if id1<id2, positive value if id1>id2
   */
  var compareID=function(id1, id2){
    return id1.localeCompare(id2);
  };

  // If targetId is peerId, then return targetId.
  // If targetId is roomToken, then return the peer's ID in the room. Return null if there is no remote client in the room.
  var getPeerId=function(targetId){
    var room=tryDecodeRoom(targetId);
    if(!room)
      return targetId;
    else{
      var peer=getPeerInRoom(room.id);
      if(peer)
        return peer.id;
      else
        return null;
    }
  };

  // Do stop chat locally.
  var stopChatLocally=function(peer,originatorId){
    if(peer.state==PeerState.CONNECTED||peer.state==PeerState.CONNECTING){
      if(peer.sendDataChannel)
        peer.sendDataChannel.close();
      if(peer.receiveDataChannel)
        peer.receiveDataChannel.close();
      if(peer.connection&&peer.connection.iceConnectionState!=='closed')
        peer.connection.close();
      if(peer.state!==PeerState.READY){
        peer.state=PeerState.READY;
        that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-stopped',peerId:peer.id, senderId: originatorId}));
      }
    }
  };

  /* Event handlers name convention:
   *
   * **Handler for network events.
   * on** for PeerConnection events.
   */

  var connectedHandler=function(){
    isConnectedToSignalingChannel=true;
  };

  var connectFailedHandler=function(){
    if(connectFailureCallback)
      connectFailureCallback();
    connectSuccessCallback = undefined;
    connectFailureCallback = undefined;
  };

  var disconnectedHandler=function(){
    isConnectedToSignalingChannel=false;
    that.dispatchEvent(new Woogeen.ClientEvent({type: 'server-disconnected'}));
  };

  var chatInvitationHandler=function(senderId){
    // !peers[senderId] means this peer haven't been interacted before, so we
    // can treat it as READY.
    var peer=peers[senderId];
    if(!peer){
      // Initialize a peer in peers array for new interacted peer
      createPeer(senderId);
      peer=peers[senderId];
    }
    if(peer.state===PeerState.READY || peer.state===PeerState.PENDING){
      peers[senderId].state=PeerState.PENDING;
      that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-invited', senderId: senderId}));
    }
    // If both sides send invitation, the client with smaller ID send accept.
    else if(peer.state===PeerState.OFFERED&&(compareID(myId,senderId)<0)){
      peer.state=PeerState.PENDING;
      accept(senderId, function(){
        that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-accepted', senderId: senderId}));
      });
    }
  };

  var chatDeniedHandler=function(senderId){
    var peer=peers[senderId];
    if(peer&&peer.connection){
      // Close PeerConnection if it has been established for this sender.
      if(peer.sendDataChannel)
         peer.sendDataChannel.close();
      if(peer.receiveDataChannel)
         peer.receiveDataChannel.close();
      peer.connection.close();
      // Delete this peer's information from peers list since the
      // chat is stopped.
      delete peers[senderId];
    }
    that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-denied', senderId: senderId}));
  };

  var chatAcceptedHandler=function(senderId){
    L.Logger.debug('Received chat accepted.');
    var peer=peers[senderId];
    if(peer){
      peer.state=PeerState.MATCHED;
      createPeerConnection(peer);
      peer.state=PeerState.CONNECTING;
      createAndSendOffer(peer);
      that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-accepted', senderId: senderId}));
    }
  };

  // Chat stop is very similar with chat denied
  var chatStoppedHandler=function(senderId){
    var peer=peers[senderId];
    if(peer&&peer.connection){
      stopChatLocally(peer,senderId);
      delete peers[senderId];
    }
  };

  var chatSignalHandler=function(senderId, message){
    var peer=peers[senderId];
    if(peer&&peer.state===PeerState.CONNECTING)
      if(!peer.connection)
        createPeerConnection(peer);
      SignalingMessageHandler(peer,message);
  };

  var streamTypeHandler=function(senderId, message){
    streams[message.streamId] = message.type;
    L.Logger.debug('remote stream label:'+ message.streamId + ',type:'+streams[message.streamId]);
  };

  var authenticatedHandler=function(uid){
    myId=uid;
    if(connectSuccessCallback)
      connectSuccessCallback(uid);
    connectSuccessCallback = undefined;
    connectFailureCallback = undefined;
  };

  var forceDisconnectHandler=function(){
    stop();
  }

  var onNegotiationneeded=function(peer){
    L.Logger.debug('On negotiation needed.');
    if(!peer.isNegotiationNeeded){
      peer.isNegotiationNeeded=true;
      if(peer.connection.signalingState==='stable' && gab)
        gab.sendNegotiationNeeded(peer.id);
    }
  };

  var onLocalIceCandidate=function(peer,event) {
    if (event.candidate && gab) {
      gab.sendSignalMessage(peer.id, {
        type : 'candidates',
        candidate : event.candidate.candidate,
        sdpMid : event.candidate.sdpMid,
        sdpMLineIndex : event.candidate.sdpMLineIndex
      });
    }
  };

  var onRemoteIceCandidate=function(peer,event){
    if(peer)
      L.Logger.debug('On remote ice candidate from peer '+peer.id);
    if(peer&&(peer.state===PeerState.OFFERED||peer.state===PeerState.CONNECTING||peer.state===PeerState.CONNECTED)){
      var candidate = new RTCIceCandidate({
        candidate : event.message.candidate,
        sdpMid : event.message.sdpMid,
        sdpMLineIndex : event.message.sdpMLineIndex
      });
      if(peer.connection){
        L.Logger.debug('Add remote ice candidates.');
        peer.connection.addIceCandidate(candidate,onAddIceCandidateSuccess,onAddIceCandidateFailure);
      }
      else{
        L.Logger.debug('Cache remote ice candidates.');
        if(!peer.remoteIceCandidates)
          peer.remoteIceCandidates=[];
        peer.remoteIceCandidates.push(candidate);
      }
    }
  };

  var onOffer=function(peer,event){
    if(!peer){
      L.Logger.debug('"peer" cannot be null or undefined');
      return;
    }

    switch(peer.state){
      case PeerState.OFFERED:
      case PeerState.MATCHED:
        peer.state=PeerState.CONNECTING;
        createPeerConnection(peer);
      case PeerState.CONNECTING:
      case PeerState.CONNECTED:
        L.Logger.debug('About to set remote description. Signaling state: '+peer.connection.signalingState);
        peer.connection.setRemoteDescription(new RTCSessionDescription(event.message),function(){
          createAndSendAnswer(peer);
          drainIceCandidates(peer);
        },function(errorMessage){
          L.Logger.debug('Set remote description failed. Message: '+JSON.stringify(errorMessage));
        });
        break;
      default:
        L.Logger.debug('Unexpected peer state: '+peer.state);
    }
  };

  var onAnswer=function(peer,event){
    if (peer&&(peer.state===PeerState.CONNECTING||peer.state===PeerState.CONNECTED)){
      L.Logger.debug('About to set remote description. Signaling state: '+peer.connection.signalingState);
      peer.connection.setRemoteDescription(new RTCSessionDescription(event.message),function(){
        L.Logger.debug('Set remote descripiton successfully.');
        drainIceCandidates(peer);
        drainPendingMessages(peer);
      },function(errorMessage){
        L.Logger.debug('Set remote description failed. Message: ' + errorMessage);
      });
    }
  };

  var createRemoteStream=function(mediaStream,peer){
    var type=streams[mediaStream.id];
    if(navigator.mozGetUserMedia)  // MediaStream in FireFox doesn't have label property, so all streams are treated as video.
      type='video';
    if(!type){
      return null;
    }else{
      var streamSpec = {video:{}, audio:true};
      if(type == 'screen')
        streamSpec.video.device='screen';
      else
        streamSpec.video.device='camera';
      var stream= new Woogeen.RemoteStream(streamSpec);
      stream.mediaStream=mediaStream;
      stream.from=peer.id;
      return stream;
    }
  };

  var onRemoteStreamAdded=function(peer,event){
    L.Logger.debug('Remote stream added.');
    var stream=createRemoteStream(event.stream,peer);
    if(stream){
      var streamEvent = new Woogeen.StreamEvent({type:'stream-added', senderId:peer.id, stream:stream});
      that.dispatchEvent(streamEvent);
    }
  };

  var onRemoteStreamRemoved=function(peer,event){
    L.Logger.debug('Remote stream removed.');
    var stream=createRemoteStream(event.stream,peer);
    if(stream){
      var streamEvent = new Woogeen.StreamEvent({type:'stream-removed', stream:stream});
      that.dispatchEvent(streamEvent);
    }
  };

  var SignalingMessageHandler = function(peer,message) {
    L.Logger.debug('S->C: ' + JSON.stringify(message));
    if (message.type === 'offer') {
      onOffer(peer,{message:message});
    } else if (message.type === 'answer') {
      onAnswer(peer,{message:message});
    } else if (message.type === 'candidates') {
      onRemoteIceCandidate(peer,{message:message});
    }
  };

  var onIceConnectionStateChange=function(peer,event){
    if(peer){
      L.Logger.debug('Ice connection state changed. State: '+peer.connection.iceConnectionState);
      if(peer.connection.iceConnectionState==='closed'&&peer.state===PeerState.CONNECTED){
        stopChatLocally(peer, peer.id);
        if(gab)
          gab.sendChatStopped(peer.id);
        delete peers[peer.id];
      }
      if(peer.connection.iceConnectionState==='connected' || peer.connection.iceConnectionState==='completed'){
        peer.lastDisconnect=(new Date('2099/12/31')).getTime();
        if(peer.state!==PeerState.CONNECTED){
          peer.state=PeerState.CONNECTED;
          that.dispatchEvent(new Woogeen.ChatEvent({type:'chat-started', peerId:peer.id}));
        }
      }
      if(peer.connection.iceConnectionState==='checking'){
        peer.lastDisconnect=(new Date('2099/12/31')).getTime();
      }
      if(peer.connection.iceConnectionState==='disconnected'){

        peer.lastDisconnect=(new Date()).getTime();
        setTimeout(function(){
          if((new Date()).getTime()-peer.lastDisconnect>=pcDisconnectTimeout)
            stopChatLocally(peer, peer.id);
        }, pcDisconnectTimeout);

      }
    }
  };

  var onAddIceCandidateSuccess=function(){
    L.Logger.debug('Add ice candidate success.');
  };

  var onAddIceCandidateFailure=function(error){
    L.Logger.debug('Add ice candidate failed. Error: '+error);
  };

  var onSignalingStateChange=function(peer){
    L.Logger.debug('Signaling state changed: '+peer.connection.signalingState);
    if(peer.connection.signalingState==='closed'){
      stopChatLocally(peer, peer.id);
      delete peers[peer.id];
    }
    else if(peer.connection.signalingState==='stable'&&peer.isRemoteNegotiationNeeded&&!navigator.mozGetUserMedia&&gab){
      // Signaling state changed to 'stable' so it's ready to accept renegotiation.
      // Doesn't accept renegotiation if local is FireFox.
      L.Logger.debug('Send negotiation accept from '+myId+' because signaling state changed.');
      gab.sendNegotiationAccepted(peer.id);
      peer.isRemoteNegotiationNeeded=false;
    }
    else if(peer.connection.signalingState==='stable'&&peer.isNegotiationNeeded&&gab){
      gab.sendNegotiationNeeded(peer.id);
    }
    else if(peer.connection.signalingState==='stable'){
      drainPendingStreams(peer);
    }
  };

  // Return true if create PeerConnection successfully.
  var createPeerConnection=function(peer){
    if(!peer||peer.connection)
      return true;
    try {
      peer.connection = new RTCPeerConnection(config, pcConstraints);
      peer.connection.onicecandidate = function(event){onLocalIceCandidate(peer,event);};
      peer.connection.onaddstream=function(event){onRemoteStreamAdded(peer,event);};
      peer.connection.onremovestream=function(event){onRemoteStreamRemoved(peer,event);};
      peer.connection.oniceconnectionstatechange=function(event){onIceConnectionStateChange(peer,event);};
      peer.connection.onnegotiationneeded=function(){onNegotiationneeded(peer);};
      peer.connection.onsignalingstatechange=function(){onSignalingStateChange(peer);};
      //DataChannel
      peer.connection.ondatachannel=function(event){
        L.Logger.debug(myId+': On data channel');
        // Save remote created data channel.
        if(!peer.dataChannels[event.channel.label]){
          peer.dataChannels[event.channel.label]=event.channel;
          L.Logger.debug('Save remote created data channel.');
        }
        bindEventsToDataChannel(event.channel,peer);
      };
    } catch (e) {
      L.Logger.debug('Failed to create PeerConnection, exception: ' + e.message);
      return false;
    }
    return true;
  };

  var bindEventsToDataChannel=function(channel,peer){
    channel.onmessage = function(event){onDataChannelMessage(peer,event)};
    channel.onopen = function(event){onDataChannelOpen(peer,event)};
    channel.onclose = function(event){onDataChannelClose(peer,event)};
    channel.onerror = function(error){
      L.Logger.debug("Data Channel Error:", error);
    };
  };

  var createDataChannel=function(targetId,label){
    if(!label){
      label=DataChannelLabel.MESSAGE;
    }
    doCreateDataChannel(getPeerId(targetId),label);
  };

  var doCreateDataChannel=function(peerId,label){
    var peer=peers[peerId];
    // If a data channel with specified label already existed, then send data by it.
    if(peer&&!peer.dataChannels[label]){
      L.Logger.debug('Do create data channel.');
      try{
        var dc = peer.connection.createDataChannel(label, dataConstraints);
        bindEventsToDataChannel(dc,peer);
        peer.dataChannels[DataChannelLabel.MESSAGE]=dc;
      } catch (e) {
        L.Logger.error('Failed to create SendDataChannel, exception: ' + e.message);
      }
    }
  };

  // Do renegotiate when remote client allowed
  var doRenegotiate=function(peer){
    L.Logger.debug('Do renegotiation.');
    createAndSendOffer(peer);
  };

  var switchStream=function(stream1, stream2, peerId, successCallback, failureCallback){
    var peer=peers[peerId];
    if (stream1!==null) {
       peer.connection.removeStream(stream1.stream);
    }
    sendStreamType(stream2,peer);
    peer.connection.addStream(stream2.stream);
    if(successCallback)
      successCallback();
  };

  var createPeer=function(peerId){
    if(!peers[peerId])
      peers[peerId]={state:PeerState.READY, id:peerId, pendingStreams:[], pendingUnpublishStreams:[], remoteIceCandidates:[], dataChannels:{}, pendingMessages:[]};
    return peers[peerId];
  };

  var decodeRoom=function(roomToken){
    room=JSON.parse(roomToken);
    return room;
  };

  var negotiationNeededHandler=function(peerId){
    var peer=peers[peerId];
    L.Logger.debug(myId+': Remote side needs negotiation.');
    if(peer){
      // If current client is caller and want to send offer, then wait for another client's acceptance.
      if(peer.isNegotiationNeeded&&(compareID(myId,peerId)>0)){
        L.Logger.debug('This side already needs negotiation.');
        peer.isRemoteNegotiationNeeded=true;
        return;
      }
      else if(!navigator.mozGetUserMedia&&peer.connection.signalingState==='stable'&&gab){  // Doesn't accept renegotiation if local is FireFox
        L.Logger.debug('Send negotiation accept from '+myId+ ' because remote side need negotiation.');
        gab.sendNegotiationAccepted(peerId);
        peer.isRemoteNegotiationNeeded=false;
      }
      else{
        L.Logger.warning('Other reason blocks negotiation.');
        peer.isRemoteNegotiationNeeded=true;
      }
    }
  };

  var negotiationAcceptedHandler=function(peerId){
    var peer=peers[peerId];
    if(peer){
      doRenegotiate(peer);
    }
  };

  /**
   * Connect to signaling server
   * @memberOf Woogeen.Peer#
   * @param {string} loginInfo Authentication information. Preperties may be different for different signaling channel.
   */
  var connect=function(loginInfo, successCallback, failureCallback){
    gab=new Gab(loginInfo);
    gab.onConnected=connectedHandler;
    gab.onDisconnected=disconnectedHandler;
    gab.onConnectFailed=connectFailedHandler;
    gab.onChatStopped=chatStoppedHandler;
    gab.onChatAccepted=chatAcceptedHandler;
    gab.onChatDenied=chatDeniedHandler;
    gab.onChatInvitation=chatInvitationHandler;
    gab.onChatSignal=chatSignalHandler;
    gab.onStreamType=streamTypeHandler;
    gab.onNegotiationNeeded=negotiationNeededHandler;
    gab.onNegotiationAccepted=negotiationAcceptedHandler;
    gab.onAuthenticated=authenticatedHandler;
    gab.onForceDisconnect=forceDisconnectHandler;
    connectSuccessCallback=successCallback;
    connectFailureCallback=failureCallback;
  };

  /**
   * Disconnect from server
   * @memberOf Woogeen.Peer#
   */
  var disconnect=function(successCallback, failureCallback){
    if(!isConnectedToSignalingChannel){
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
      return;
    }
    stop();
    if(gab)
      gab.finalize();
    gab=null;
    if(successCallback)
      successCallback();
  };


  /**
   * Send a video chat invitation to remote user
   * @memberOf Woogeen.Peer#
   * @param {string} peerId Remote user's ID.
   */
  var invite = function(peerId, successCallback, failureCallback) {
    if(!gab){
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
      return;
    }
    if(peerId===myId){
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      return;
    }
    if(!peers[peerId])
      createPeer(peerId);
    var peer=peers[peerId];
    if(peer.state===PeerState.READY||peer.state===PeerState.OFFERED){
      L.Logger.debug('Send invitation to '+peerId);
      peer.state=PeerState.OFFERED;
      gab.sendChatInvitation(peerId, function(){
        if(successCallback)
          successCallback();
      }, function(err){
        peer.state=PeerState.READY;
        if(failureCallback)
          failureCallback(Woogeen.Error.getErrorByCode(err));
      });
    }
    else{
      L.Logger.debug('Invalid state. Will not send invitation.');
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
    }
  };

  var inviteWithStream=function(peerId, stream, successCallback, failureCallback){
    invite(peerId, function(){
      publish(stream,peerId);
    }, failureCallback);
  };

  /**
   * Send an acceptance to a remote user
   * @memberOf Woogeen.Peer#
   * @param {string} peerId Remote user's ID.
   */
  var accept=function(peerId, successCallback, failureCallback){
    if(!gab){
      failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
    }
    if(!peers[peerId])
      createPeer(peerId);
    var peer=peers[peerId];
    if(peer.state===PeerState.PENDING){
      peer.state=PeerState.MATCHED;
      gab.sendChatAccepted(peerId, successCallback, function(errCode){
        peer.state=PeerState.PENDING;
        failureCallback(Woogeen.Error.getErrorByCode(errCode));
      });
    }
    else{
      L.Logger.debug('Invalid state. Will not send acceptance.');
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
    }
  };

  var acceptWithStream=function(peerId, stream, successCallback, failureCallback){
    accept(peerId, function(){
      publish(stream, peerId);
    }, failureCallback);
  };

  var createAndSendOffer=function(peer){
    if(!peer.connection){
      L.Logger.error('Peer connection have not been created.');
      return;
    }
    if(peer.connection.signalingState!=='stable'){
      peer.isNegotiationNeeded=true;
      return;
    }
    drainPendingStreams(peer);
    // Create data channel before first offer to avoid remote video disappear when renegotiation.
    if(peer.pendingMessages.length&&!peer.dataChannels[DataChannelLabel.MESSAGE])
      doCreateDataChannel(peer.id);
    // If the client is FireFox and publish without stream.
    if(navigator.mozGetUserMedia&&!peer.pendingStreams.length&&!peer.connection.getLocalStreams().length){
      createDataChannel(peer.id);
    }
    peer.connection.createOffer(function(desc) {
      desc.sdp = replaceSdp(desc.sdp);
      peer.connection.setLocalDescription(desc,function(){
        L.Logger.debug('Set local descripiton successfully.');
        peer.isNegotiationNeeded=false;
        if(gab)
          gab.sendSignalMessage(peer.id, desc);
      },function(errorMessage){
        L.Logger.debug('Set local description failed. Message: '+JSON.stringify(errorMessage));
      });
    },function(error){
      L.Logger.debug('Create offer failed. Error info: '+JSON.stringify(error));
    }, sdpConstraints);
  };

  var drainIceCandidates=function(peer){
    if (peer&&peer.connection&&peer.remoteIceCandidates&&peer.remoteIceCandidates.length!==0) {
      for(var i=0;i<peer.remoteIceCandidates.length;i++){
        L.Logger.debug("remoteIce, length:" + remoteIceCandidates.length + ", current:" +i);
        if(peer.state===PeerState.CONNECTED||peer.state===PeerState.CONNECTING)
          peer.connection.addIceCandidate(remoteIceCandidates[i],onAddIceCandidateSuccess,onAddIceCandidateFailure);
      }
      peer.remoteIceCandidates=[];
    }
  };

  var drainPendingStreams=function(peer){
    L.Logger.debug('Draining pending streams.');
    if(peer.connection){
      L.Logger.debug('Peer connection is ready for draining pending streams.');
      for(var i=0;i<peer.pendingStreams.length;i++){
        var stream=peer.pendingStreams[i];
        bindStreamAndPeer(stream, peer);
        if(!stream.onClose)
          stream.onClose=function(){onLocalStreamEnded(stream);};
        sendStreamType(stream,peer);
        L.Logger.debug('Sent stream type.');
        peer.connection.addStream(stream.mediaStream);
        L.Logger.debug('Added stream to peer connection.');
      }
      peer.pendingStreams=[];
      for(var i=0;i<peer.pendingUnpublishStreams.length;i++){
        peer.connection.removeStream(peer.pendingUnpublishStreams[i].mediaStream);
        L.Logger.debug('Remove stream.');
      }
      peer.pendingUnpublishStreams=[];
    }
  };

  var drainPendingMessages=function(peer){
    L.Logger.debug('Draining pendding messages.');
    var dc=peer.dataChannels[DataChannelLabel.MESSAGE];
    if(dc&&dc.readyState==='open'){
      for(var i=0;i<peer.pendingMessages.length;i++){
        dc.send(peer.pendingMessages[i]);
      }
      peer.pendingMessages=[];
    }
  };

  var bindStreamAndPeer=function(stream,peer){
    var streamId=stream.id();
    if(!streamPeers[streamId])
      streamPeers[streamId]=[];
    streamPeers[streamId].push(peer.id);
  };

  var createAndSendAnswer=function(peer){
    if(!peer.connection){
      L.Logger.error('Peer connection have not been created.');
      return;
    }
    drainPendingStreams(peer);
    peer.connection.createAnswer(function(desc) {
      desc.sdp = replaceSdp(desc.sdp);
      peer.connection.setLocalDescription(desc,function(){
        L.Logger.debug("Set local description successfully.");
        if(gab)
          gab.sendSignalMessage(peer.id, desc);
        L.Logger.debug('Sent answer.');
      },function(errorMessage){
        L.Logger.error("Error occurred while setting local description. Error message:" + errorMessage);
      });
    },function(error){
      L.Logger.error('Create answer failed. Message: '+error);
    });
  };

  /**
   * Add a stream or streams to a room
   * @param {array} streams A Woogeen.Stream or an array of Woogeen.Stream.
   * @param {string} roomId Room ID.
   */
  var addStreamToRoom=function(streams, roomId){
    if(!streams||!roomId)
      return;
    if(!roomStreams[roomId])
      roomStreams[roomId]=[];
    var streamsInRoom=roomStreams[roomId];
    if(isArray(streams))
      streamsInRoom=streamsInRoom.concat(streams);
    else
      streamsInRoom.push(streams);
  };

  /**
   * Delete a stream froom a room
   * @param {Woogeen.Stream} stream An instance of Woogeen.Stream
   * @param {string} roomId Room ID
   */
  var deleteStreamFromRoom=function(stream,roomId){
    if(!stream||!roomId)
      return;
    if(!roomStreams[roomId])
      return;
    var savedStreams=roomStreams[roomId];
    for(var i=0;i<savedStreams.length;i++){
      if(stream.getID()===savedStreams[i].getID()){
        savedStreams.splice(i,1);
        break;
      }
    }
  };

  /**
   * Publish streams to remote client
   * @param {stream} stream Local stream. A instance of Woogeen.Stream.
   * @param {string} targetId Remote peer's ID or roomToken.
   */
  var publish=function(streams, targetId, successCallback, failureCallback){
    if(!streams||!targetId){
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      return;
    }
    doPublish(streams,targetId, successCallback, failureCallback);
  };

  /**
   * Publish stream to peer
   * @memberOf Woogeen.Peer#
   * @param {stream} stream Local stream. A instance of Woogeen.Stream.
   * @param {string} targetId Remote peer's ID or roomToken.
   */
  var doPublish=function(streams, targetId, successCallback, failureCallback){
    L.Logger.debug('Publish to: '+targetId);
    // Add stream to roomStreams if the stream is published to a room
    var room=tryDecodeRoom(targetId);
    if(room){
      addStreamToRoom(streams,room.id);
    }

    var peerId=getPeerId(targetId);
    if(!peerId){
      if(room&&successCallback)
        successCallback();
      else if(!room&&failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      return;
    }

    if(!peers[peerId])
      createPeer(peerId);
    var peer=peers[peerId];
    // Check peer state
    switch (peer.state){
      case PeerState.OFFERED:
      case PeerState.MATCHED:
      case PeerState.CONNECTING:
      case PeerState.CONNECTED:
        break;
      default:
        L.Logger.warning('Cannot publish stream in this state: '+peer.state);
        if(failureCallback)
          failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
        return;
    }
    // Publish stream or streams
    if(isArray(streams))
      peer.pendingStreams=peer.pendingStreams.concat(streams);
    else if(streams){
      peer.pendingStreams.push(streams);
    }
    switch (peer.state){
      case PeerState.CONNECTING:
      case PeerState.CONNECTED:
        if(peer.pendingStreams.length>0){
          drainPendingStreams(peer);
        }
        break;
      default:
        L.Logger.debug('Unexpected peer state: '+peer.state);
        if(failureCallback)
          failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
        return;
    }
    if(successCallback)
      successCallback();
  };

  /**
   * unpublish stream to peer
   * @memberOf Woogeen.Peer#
   * @param {stream} stream Local stream. A instance of Woogeen.Stream.
   * @param {string} targetId Remote peer's ID.
   */
  var unpublish=function(stream, targetId, successCallback, failureCallback){
    L.Logger.debug('Unpublish stream.');
    if(!stream){
      L.Logger.warning('Invalid argument stream');
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      return;
    }

    var room=tryDecodeRoom(targetId);
    if(room){
      deleteStreamFromRoom(stream,room.id);
    }

    var peerId=getPeerId(targetId);
    if(!peerId){
      if(room&&successCallback){  // Joined room and waiting for another one.
        successCallback();
      }
      else if(!room&&failureCallback){
        L.Logger.warning('Invalid argument targetId');
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }

    if(!peers[peerId]){
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      return;
    }
    var peer=peers[peerId];
    peer.pendingUnpublishStreams.push(stream);
    if (peer.state === PeerState.CONNECTED)
      drainPendingStreams(peer);
    if(successCallback)
      successCallback();
  };

  /**
    * Send video type to remote clientInformation
    * @memberOf Woogeen.Peer#
    * @private
    * @param {stream} stream Local stream. A instance of Woogeen.Stream.
    */
  var sendStreamType=function(stream,peer){
    if(stream!==null) {
      var type='audio';
      if(stream.isScreen()) {
        type='screen';
        stream.hide=function(){  // bind hide() because hide() is invoked before dispose mediaStream.
          L.Logger.debug('Unpublish screen sharing.');
          unpublish(stream,peer.id);
        };
      }else if(stream.hasVideo()) {
        type='video';
      }
      if(gab)
        gab.sendStreamType(peer.id, {streamId:stream.mediaStream.id, type:type});
    }

    // If local is FireFox and remote is Chrome, streams will be labeled as 'default' in remote side.
    if(navigator.mozGetUserMedia&&gab)
      gab.sendStreamType(peer.id, {streamId:'default', type:'video'});
  };

  /**
   * Deny video invitation
   * @memberOf Woogeen.Peer#
   * @param {string} uid Remote user's ID
   * @param {callback} failureCallback Parameter: error.
   */
  var deny=function(peerId, successCallback, failureCallback){
    if(peers[peerId]&&peers[peerId].state===PeerState.PENDING){
      if(!gab){
        failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
        return;
      }
      gab.sendChatDenied(peerId, successCallback, function(errCode){
        if(failureCallback){
          failureCallback(Woogeen.Error.getErrorByCode(errCode));
        }
      });
      delete peers[peerId];
    }
  };

  /**
   * Stop video chat
   * @memberOf Woogeen.Peer#
   * @param {string} uid Remote user's ID
   * @remark Stop all chats if peerId is undefined.
   */
  var stop=function(peerId, successCallback, failureCallback){
    if(!gab){
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
      return;
    }
    if(peerId){  // Stop chat with peerId
      var peer=peers[peerId];
      if(!peer)
        return;
      gab.sendChatStopped(peer.id);
      stopChatLocally(peer, myId);
      delete peers[peerId];
    }else{  // Stop all chats
      for(var peerIndex in peers){
        var peer=peers[peerIndex];
        gab.sendChatStopped(peer.id);
        stopChatLocally(peer,myId);
        delete peers[peer.id];
      }
    }
    if(successCallback)
      successCallback();
  };

  var stopChat=function(chatId, successCallback, failureCallback){
    var chat=chats[chatId];
    if(chat){
      var peer=chat.peer;
      stop(peer.id);
      if(!gab){
        if(failureCallback)
          failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
        return;
      }
      gab.sendLeaveRoom(chatId);
      delete chats[chatId];
    }
    if(successCallback)
      successCallback();
  };

  var send=function(message,targetId, successCallback, failureCallback){
    if(message.length>65535){
      L.Logger.warning("Message too long. Max size: 65535.");
      if(failureCallback)
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      return;
    }
    doSendData(message,getPeerId(targetId), successCallback, failureCallback);
  };

  //Data channel send data
  var doSendData=function(message,peerId, successCallback, failureCallback){
    var peer=peers[peerId];
    if(!peer){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }
    // If data channel is ready, send it. Otherwise, cache it in message queue.
    var dc=peer.dataChannels[DataChannelLabel.MESSAGE];
    if(dc&&dc.readyState==='open'){
      dc.send(message);
    }else{
      peer.pendingMessages.push(message);
      createDataChannel(peerId);
    }
    if(successCallback)
      successCallback();
  }

  //DataChannel handler.
  var onDataChannelMessage=function(peer,event){
     var dataEvent = new Woogeen.DataEvent({type:'data-received', senderId:peer.id, data:event.data});
     that.dispatchEvent(dataEvent);
  };

  var onDataChannelOpen=function(peer,event){
     L.Logger.debug("Data Channel is opened");
     if(event.target.label==DataChannelLabel.MESSAGE){
       L.Logger.debug('Data channel for messages is opened.');
       drainPendingMessages(peer);
     }
  };

  var onDataChannelClose=function(peerId){
    L.Logger.debug("Data Channel is closed");
  };

  var onLocalStreamEnded=function(stream){
    var peerIds=streamPeers[stream.getID()];
    if(peerIds){
      for(var i=0;i<peerIds.length;i++){
        unpublish(stream, peerIds[i]);
      }
    }
  };

  //codec preference setting.
  var replaceSdp = function(sdp) {
    sdp = removeRTX(sdp);  // Resolve sdp issue for Chrome 37
    return sdp;
  };

  // Remove 96 video codec from sdp when chatting between chrome 37 and <37.
  var removeRTX = function(sdp){
    var mLineReg = /video \d*? RTP\/SAVPF( \d*?)* 96/ig;
    var mLineElement = sdp.match(mLineReg);
    if(mLineElement && mLineElement.length) {
      mLineElement[0] = mLineElement[0].replace(' 96','');
      sdp = sdp.replace(mLineReg,mLineElement[0]);
      sdp = sdp.replace(/a=rtpmap:96 rtx\/90000\r\n/ig,'');
      sdp = sdp.replace(/a=fmtp:96 apt=100\r\n/ig,'');
     }
    return sdp;
  };

  /**
   * Get PeerConnection for a specified remote client.
   * @param targetId peerId or roomToken.
   */
  var getPeerConnection = function(targetId){
    var peerId=getPeerId(targetId);
    var peer=peers[peerId];
    if(!peer)
      return null;
    return peer.connection;
  };

  that.connect=connect;
  that.disconnect=disconnect;
  that.invite=invite;
  that.inviteWithStream=inviteWithStream;
  that.publish=publish;
  that.unpublish=unpublish;
  that.deny=deny;
  that.accept=accept;
  that.acceptWithStream=acceptWithStream;
  that.stop=stop;
  that.send=send;
  that.switchStream=switchStream;

  // Below are functions for testing.
  that._test_getPeerConnection=getPeerConnection;
  // Above are functions for testing.

  return that;
};
