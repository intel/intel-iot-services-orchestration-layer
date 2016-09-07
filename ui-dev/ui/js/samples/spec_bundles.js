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
// a bundle is a collection of specs
var bundle_1 = {
  id: "unique_bundle_id_1",
  name: "Home Bundle",
  description: "Useful Components to build smart home app",
  icon: "cog",
  specs: [
  {
    id: "spec_id_1",
    type: "spec",
    catalog: "/sensor/light",
    name: "Lightness",
    icon: "cog",
    description: "Report data from a light sensor",
    out: {
      ports: [{             // use an array as we need its order for rendering
        name: "dark",
        type: "boolean",      // type of payload in the message
        description: "emits true / false when it turns dark / bright"
      }]
    }
  },

  {
     id: "spec_id_2",
     type: "spec",
     catalog: "/light/LED",
     name: "On/Off LED",
     description: "Turn On/Off a LED",
     in: {
       ports: [{
         name: "on",
         type: "boolean",
         description: "true -> on, false -> off",
         default: false,               // default value of this port
         buffered: false,              // buffered or not?
         // Forbid user to change? Use disable here, so if this isn't defined
         // in spec, corresponding values are undefined which means "enabled"
         // by default
         customizations_disabled: {    
           buffered: false,
           no_trigger: false,
           be_grouped: false
         }
       }]
     }
   }

  ]
};


var bundle_2 = {
  id: "unique_bundle_id_2",
  name: "Network",
  description: "Useful components to build network app",
  specs: [
  {
    id: "spec_request_id",
    type: "spec",
    catalog: "/net/request",
    name: "Request",
    icon: "globe",
    description: "Request",
    out: {
      ports: [{             
        name: "ip",
        type: "string",    
        description: "ip of the request"
      }, {
        name: "data",
        type: "string",    
        description: "data of the request"
      }]
    }
  },

  {
    id: "spec_merge_id",
    type: "spec",
    catalog: "/flow/merge",
    name: "Merge",
    icon: "code-fork",
    description: "Combine multiple message into one",
    in: {
      // by default it is undefined thus disallowed
      "allow_to_add": true
    },
    out: {
      ports: [{
        name: "out",
        type: "object",    
        description: "output object"
      }]
    }

  },

  {
    id: "spec_ip_process_id",
    type: "spec",
    catalog: "/process/ip",
    name: "IP Processing",
    icon: "flag",
    description: "transform the IP",
    in: {
      ports: [{             
        name: "ip",
        type: "string"    
      }]
    },
    out: {
      ports: [{             
        name: "ip",
        type: "string"    
      }]
    }
  },

  {
    id: "spec_data_process_id",
    type: "spec",
    catalog: "/process/data",
    name: "data Processing",
    icon: "cube",
    description: "transform the data",
    in: {
      ports: [{             
        name: "data",
        type: "string"    
      }]
    },
    out: {
      ports: [{             
        name: "data",
        type: "string"
      }, {
        name: "error",
        type: "string"
      }]
    }
  },

  {
    id: "spec_response_id",
    type: "spec",
    catalog: "/net/response",
    name: "Response",
    icon: "bullhorn",
    description: "Request",
    in: {
      ports: [{             
        name: "ip",
        type: "string",    
        description: "ip of the target"
      }, {
        name: "data",
        type: "string",    
        description: "data of the request"
      }]
    }
  }

  ]
};


var bundles = [bundle_1, bundle_2];

module.exports = JSON.stringify(bundles);