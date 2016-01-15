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
/**
 * @class Gab
 * @classDesc Network module for WooGeen P2P video chat
 */
module.exports = function Gab(loginInfo){

  var serverAddress = loginInfo.host;
  var token = loginInfo.token;

  var clientType='Web';
  var clientVersion='2.0.1';

  var self=this;
  var wsServer=null;

  // Event handlers.
  /**
   * @property {function} onConnected
   * @memberOf Gab#
   */
  this.onConnected=null;
  /**
   * @property {function} onDisconnect
   * @memberOf Gab#
   */
  this.onDisconnected=null;
  /**
   * @property {function} onConnectFailed This function will be executed after connect to server failed. Parameter: errorCode for error code.
   * @memberOf Gab#
   */
  this.onConnectFailed=null;
  /**
   * @property {function} onChatInvitation Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatInvitation=null;
  /**
   * @property {function} onChatDenied Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatDenied=null;
  /**
   * @property {function} onChatStopped Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatStopped=null;
  /**
   * @property {function} onChatAccepted Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatAccepted=null;
  /**
   * @property {function} onChatError Parameter: errorCode.
   * @memberOf Gab#
   */
  this.onChatError=null;
  /**
   * @property {function} onChatSignal Parameter: senderId, signaling message.
   * @memberOf Gab#
   */
  this.onChatSignal=null;
  /**
   * @property {function} onStreamType Parameter: senderId, video type message.
   * @memberOf Gab#
   */
  this.onStreamType=null;
  /**
   * @property {function} onChatReady Parameter: a list of uid in current chat
   * @memberOf Gab#
   */
  this.onChatReady=null;
  /**
   * @property {function} onChatWait
   * @memberOf Gab#
   */
  this.onChatWait=null;

  /**
   * @property {function} onAuthenticated
   * @memberOf Gab#
   */
  this.onAuthenticated=null;

  /**
   * Connect to the signaling server
   * @memberOf Gab#
   * @param {string} uid Current user's ID.
   * @param {string} token Token for authentication.
   * @param {callback} successCallback Callback function to be executed after connect to server successfully.
   * @param {callback} failureCallback Callback function to be executed after connect to server failed.
   */
  var connect=function(serverAddress, token){
    var paramters=[];
    var queryString=null;
    paramters.push('clientType='+clientType);
    paramters.push('clientVersion='+clientVersion);
    if(token)
      paramters.push('token='+token);
    if(paramters)
      queryString=paramters.join('&');
    L.Logger.debug('Query string: '+queryString);
    wsServer=io(serverAddress,{query : queryString, 'reconnection': true, 'reconnectionAttempts':10, 'force new connection':true});


    wsServer.on('connect',function(){
      L.Logger.info('Connected to websocket server.');
      if(self.onConnected)
        self.onConnected();
    });

    wsServer.on('disconnect',function(){
      L.Logger.info('Disconnected from websocket server.');
      if(self.onDisconnected)
        self.onDisconnected();
    });

    wsServer.on('connect_failed',function(errorCode){
      L.Logger.error('Connect to websocket server failed, error:'+errorCode+'.');
      if(self.onConnectFailed)
        self.onConnectFailed(parseInt(errorCode));
    });

    wsServer.on('error', function(err){
      L.Logger.error('Socket.IO error:'+err);
      if(err=='2103'&&self.onConnectFailed)
        self.onConnectFailed(err);
    });

    wsServer.on('chat-invitation',function(data){
      L.Logger.info('Received a video invitation.');
      if(self.onChatInvitation)
        self.onChatInvitation(data.from);
    });

    wsServer.on('chat-denied',function(data){
      L.Logger.info('Remote user denied your invitation.');
      if(self.onChatDenied)
        self.onChatDenied(data.from);
    });

    wsServer.on('chat-closed',function(data){
      L.Logger.info('Remote user stopped video chat.');
      if(self.onChatStopped)
        self.onChatStopped(data.from);
    });

    wsServer.on('chat-accepted',function(data){
      L.Logger.info('Remote user agreed your invitation.');
      if(self.onChatAccepted)
        self.onChatAccepted(data.from);
    });

    wsServer.on('chat-error',function(data){
      L.Logger.info('Video error: '+data.code);
      if(self.onChatError)
        self.onChatError(data.code);
    });

    wsServer.on('chat-signal',function(data){
      L.Logger.debug('Received signal message');
      if(self.onChatSignal)
        self.onChatSignal(data.from, data.data);
    });

    wsServer.on('stream-type',function(data){
      L.Logger.debug('Received video type message');
      if(self.onStreamType)
        self.onStreamType(data.from, data.data);
    });

    wsServer.on('chat-stopped',function(data){
      L.Logger.debug('Remote user stopped video chat.');
      if(self.onChatStopped)
        self.onChatStopped(data.from);
    });

    wsServer.on('chat-negotiation-needed', function(data){
      L.Logger.debug('Remote user want renegotiation.');
      if(self.onNegotiationNeeded)
        self.onNegotiationNeeded(data.from);
    });

    wsServer.on('chat-negotiation-accepted', function(data){
      L.Logger.debug('Remote user accepted renegotiation.');
      if(self.onNegotiationAccepted)
        self.onNegotiationAccepted(data.from);
    });

    wsServer.on('chat-wait',function(){
      L.Logger.debug('Waiting for a peer.');
      if(self.onChatWait)
        self.onChatWait();
    });

    wsServer.on('chat-ready',function(data){
      L.Logger.debug('Received chat ready with '+data.peerId+' , room ID:' +data.roomId+', offer:'+data.offer);
      if(self.onChatReady)
        self.onChatReady(data.peerId, data.roomId, data.offer);
    });

    wsServer.on('server-authenticated',function(data){
      L.Logger.debug('Authentication passed. User ID: '+data.uid);
      if(self.onAuthenticated)
        self.onAuthenticated(data.uid);
    });

    wsServer.on('server-disconnect', function(){
      if(self.onForceDisconnect)
        self.onForceDisconnect();
      wsServer.io.reconnection(false);
    });
  };

  connect(serverAddress, token);

  var sendChatEvent = function(uid, eventName, successCallback, failureCallback){
    sendChatData(eventName, {to:uid}, successCallback, failureCallback);
  };

  var sendChatData = function(eventName, data, successCallback, failureCallback){
    wsServer.emit(eventName, data, function(err){
      if(err && failureCallback)
        failureCallback(err);
      else if(successCallback)
        successCallback();
    });
  };

  /**
   * Send a video invitation to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatInvitation= function(uid, successCallback, failureCallback){
    sendChatEvent(uid, 'chat-stopped', function(){
      sendChatEvent(uid, 'chat-invitation', successCallback, failureCallback);
    },failureCallback);
  };

  /**
   * Send video agreed message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatAccepted=function(uid, successCallback, failureCallback){
    sendChatEvent(uid, 'chat-accepted', successCallback, failureCallback);
  };

  /**
   * Send video denied message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatDenied=function(uid, successCallback, failureCallback){
    sendChatEvent(uid, 'chat-denied', successCallback, failureCallback);
  };

  /**
   * Send video stopped message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatStopped=function(uid, successCallback, failureCallback){
    sendChatEvent(uid, 'chat-stopped', successCallback, failureCallback);
  };

  /**
   * Send video type message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   * @param {string} stream to Remote user, it is like: {streamId:'label of stream', type:'audio'} or {streamId:'label of stream', type:'video'} or {streamId:'label of stream', type:'screen'}
   */
  this.sendStreamType=function(uid, stream, successCallback, failureCallback){
    sendChatData('stream-type',{to:uid, data:stream}, successCallback, failureCallback);
  };

  /**
   * Send negotiation needed message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendNegotiationNeeded=function(uid, successCallback, failureCallback){
    sendChatEvent(uid, 'chat-negotiation-needed', successCallback, failureCallback);
  };

  /**
   * Send negotiation accept message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendNegotiationAccepted=function(uid, successCallback, failureCallback){
    sendChatEvent(uid, 'chat-negotiation-accepted', successCallback, failureCallback);
  };

  /**
   * Send signal message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   * @param {string} message Signal message
   */
  this.sendSignalMessage=function(uid, message, successCallback, failureCallback){
    L.Logger.debug('C->S: '+JSON.stringify(message));
    sendChatData('chat-signal',{to:uid, data:message}, successCallback, failureCallback);
  };

  /**
   * Send room join message to server
   * @memberOf Gab#
   * @param {string} Room token.
   */
  this.sendJoinRoom=function(roomId, successCallback, failureCallback){
    sendChatData('chatroom-join',{roomId:roomId}, successCallback, failureCallback);
  };

  /**
   * Send leave room message to server
   * @memberOf Gab#
   */
  this.sendLeaveRoom=function(roomId, successCallback, failureCallback){
    sendChatData('chatroom-leave',{roomId:roomId}, successCallback, failureCallback);
  };

  /**
   * Finalize
   * @memberOf Gab#
   */
  this.finalize=function(){
    wsServer.close();
  };
}
