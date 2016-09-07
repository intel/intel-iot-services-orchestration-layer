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
/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var fs = require('fs');
module.exports = function(RED) {
    "use strict";

    function TLSConfig(n) {
        RED.nodes.createNode(this,n);
        this.valid = true;
        var certPath = n.cert.trim();
        var keyPath = n.key.trim();
        var caPath = n.ca.trim();

        if ( (certPath.length > 0) !== (keyPath.length > 0)) {
            this.valid = false;
            this.error(RED._("tls.error.missing-file"));
            return;
        }
        this.verifyservercert = n.verifyservercert;

        try {
            if (certPath) {
                this.cert = fs.readFileSync(certPath);
            }
            if (keyPath) {
                this.key = fs.readFileSync(keyPath);
            }
            if (caPath) {
                this.ca = fs.readFileSync(caPath);
            }
        } catch(err) {
            this.valid = false;
            this.error(err.toString());
            return;
        }
    }
    RED.nodes.registerType("tls-config",TLSConfig);

    TLSConfig.prototype.addTLSOptions = function(opts) {
        if (this.valid) {
            if (this.key) {
                opts.key = this.key;
            }
            if (this.cert) {
                opts.cert = this.cert;
            }
            if (this.ca) {
                opts.ca = this.ca;
            }
            opts.rejectUnauthorized = this.verifyservercert;
        }
        return opts;
    }

}
