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
var Woogeen = window.Woogeen || {};

Woogeen.Error = {
  // 1000-1999 for media stream errors
  STREAM_LOCAL_ACCESS_DENIED:{code: 1101, message:'Cannot access to camera or micphone.'},

  // 2100-2999 for P2P errors
  // 2100-2199 for connection errors
  // 2100-2109 for server errors
  P2P_CONN_SERVER_UNKNOWN: {code: 2100, message:'Server unknown error.'},
  P2P_CONN_SERVER_UNAVAILABLE: {code: 2101, message:'Server is unavaliable.'},
  P2P_CONN_SERVER_BUSY: {code: 2102, message:'Server is too busy.'},
  P2P_CONN_SERVER_NOT_SUPPORTED: {code: 2103, message:'Method has not been supported by server'},

  // 2110-2119 for client errors
  P2P_CONN_CLIENT_UNKNOWN: {code: 2110, message:'Client unknown error.'},
  P2P_CONN_CLIENT_NOT_INITIALIZED: {code: 2111, message:'Connection is not initialized.'},

  // 2120-2129 for authentication errors
  P2P_CONN_AUTH_UNKNOWN: {code: 2120, message:'Authentication unknown error.'},
  P2P_CONN_AUTH_FAILED: {code: 2121, message:'Wrong username or token.'},

  // 2200-2299 for message transport errors
  P2P_MESSAGING_TARGET_UNREACHABLE: {code: 2201, message:'Remote user cannot be reached.'},

  // 2301-2399 for chat room errors
  P2P_CHATROOM_ATTENDEE_EXCEED:{code: 2301, message:"Exceed room's limitation"},
  P2P_CHATROOM_PEER_NOT_FOUND:{code:2302, message:"Peer not found. Only one client in the room."},

  // 2401-2499 for client errors
  P2P_CLIENT_UNKNOWN: {code: 2400, message:'Unknown errors.'},
  P2P_CLIENT_UNSUPPORTED_METHOD:{code: 2401, message:'This method is unsupported in current browser.'},
  P2P_CLIENT_ILLEGAL_ARGUMENT:{code: 2402, message: 'Illegal argument.'},
  P2P_CLIENT_INVALID_STATE:{code: 2403, message: 'Invalid peer state.'},

  getErrorByCode: function(errorCode){
    var codeErrorMap={
      1101: Woogeen.Error.STREAM_LOCAL_ACCESS_DENIED,
      2100: Woogeen.Error.P2P_CONN_SERVER_UNKNOWN,
      2101: Woogeen.Error.P2P_CONN_SERVER_UNAVAILABLE,
      2102: Woogeen.Error.P2P_CONN_SERVER_BUSY,
      2103: Woogeen.Error.P2P_CONN_SERVER_NOT_SUPPORTED,
      2110: Woogeen.Error.P2P_CONN_CLIENT_UNKNOWN,
      2111: Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED,
      2120: Woogeen.Error.P2P_CONN_AUTH_UNKNOWN,
      2121: Woogeen.Error.P2P_CONN_AUTH_FAILED,
      2201: Woogeen.Error.P2P_MESSAGING_TARGET_UNREACHABLE,
      2301: Woogeen.Error.P2P_CHATROOM_ATTENDEE_EXCEED,
      2302: Woogeen.Error.P2P_CHATROOM_PEER_NOT_FOUND,
      2400: Woogeen.Error.P2P_CLIENT_UNKNOWN,
      2401: Woogeen.Error.P2P_CLIENT_UNSUPPORTED_METHOD,
      2402: Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT,
      2403: Woogeen.Error.P2P_CLIENT_INVALID_STATE
    };
    return codeErrorMap[errorCode];
  }
};
