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
var hub_a = {
  id: "unique_hub_id_1",
  name: "Edison Board A",
  description: "A board to host home Things",
  things: [
  {
    id: "unique_thing_id_1",
    name: "Light Sensor 1",
    description: "A Light Sensor from Company X, model is XX123",
    services: [{
      id: "service_id_1",
      spec: "spec_id_1"
    }]
  },
  {
    id: "unique_thing_id_2",
    name: "LED 1",
    description: "A LED from Company YY",
    services: [{
      id: "service_id_2",
      spec: "spec_id_2",
      name: "changed_LED"
    }]
  }
  ],
  styles: {
    hub: {
      icon: "cpu",
      color: 1
    },
    things: {
      unique_thing_id_1: {
        icon: "sensor",
        color: 2
      }
    }
  }
};


var hub_b = {
  id: "unique_hub_id_2",
  name: "Edison Board B",
  description: "A board to host network Things",
  things: [
  {
    id: "unique_thing_id_3",
    name: "network",
    description: "A virtual thing to handle network operations",
    services: [{
      id: "service_id_3",
      spec: "spec_request_id"
    }, {
      id: "service_id_4",
      spec: "spec_response_id"
    }]
  },
  {
    id: "unique_thing_id_4",
    name: "system",
    description: "A virtual thing for general system operations",
    services: [{
      id: "service_id_5",
      spec: "spec_merge_id"
    }]
  },
  {
    id: "unique_thing_id_5",
    name: "processing",
    description: "A virtual thing to various data processing",
    services: [{
      id: "service_id_6",
      spec: "spec_ip_process_id"
    }, {
      id: "service_id_7",
      spec: "spec_data_process_id"
    }]
  }
  ]
};


var hubs = [hub_a, hub_b];

module.exports = JSON.stringify(hubs);