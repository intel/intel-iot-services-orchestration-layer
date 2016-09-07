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


module.exports = {
  LOOK_FOR_CENTER:    "__HOPE__/LOOK_FOR_CENTER",     // ask centers to publish
  CLAIM_AS_CENTER:    "__HOPE__/CLAIM_AS_CENTER",     // publish as a center
  LOOK_FOR_HUB:       "__HOPE__/LOOK_FOR_HUB",        // ask hubs to publish
  CLAIM_AS_HUB:       "__HOPE__/CLAIM_AS_HUB",        // publish as a hub
  ANNOUNCE_ERROR:     "__HOPE__/ANNOUNCE_ERROR",
    

  CENTER_LEAVE:       "__HOPE__/CENTER_LEAVE",        // the center leaves
  HUB_LEAVE:          "__HOPE__/HUB_LEAVE",           // the hub leaves

  EM_CHANGED:         "__HOPE__/EM_CHANGED",          // report changes of the entities
  EM_FULLINFO:        "__HOPE__/EM_FULLINFO",
  NEED_EM_FULLINFO:   "__HOPE__/NEED_EM_FULLINFO", 
  HEARTBEAT:          "__HOPE__/HEARTBEAT"
};