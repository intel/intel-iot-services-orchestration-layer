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
 * Copyright 2013, 2014 IBM Corp.
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

//Simple node to introduce a pause into a flow
module.exports = function(RED) {
    "use strict";

    var MILLIS_TO_NANOS = 1000000;
    var SECONDS_TO_NANOS = 1000000000;

    function DelayNode(n) {
        RED.nodes.createNode(this,n);

        this.pauseType = n.pauseType;
        this.timeoutUnits = n.timeoutUnits;
        this.randomUnits = n.randomUnits;
        this.rateUnits = n.rateUnits;

        if (n.timeoutUnits === "milliseconds") {
            this.timeout = n.timeout;
        } else if (n.timeoutUnits === "minutes") {
            this.timeout = n.timeout * (60 * 1000);
        } else if (n.timeoutUnits === "hours") {
            this.timeout = n.timeout * (60 * 60 * 1000);
        } else if (n.timeoutUnits === "days") {
            this.timeout = n.timeout * (24 * 60 * 60 * 1000);
        } else {   // Default to seconds
            this.timeout = n.timeout * 1000;
        }

        if (n.rateUnits === "minute") {
            this.rate = (60 * 1000)/n.rate;
        } else if (n.rateUnits === "hour") {
            this.rate = (60 * 60 * 1000)/n.rate;
        } else if (n.rateUnits === "day") {
            this.rate = (24 * 60 * 60 * 1000)/n.rate;
        } else {  // Default to seconds
            this.rate = 1000/n.rate;
        }

        if (n.randomUnits === "milliseconds") {
            this.randomFirst = n.randomFirst * 1;
            this.randomLast = n.randomLast * 1;
        } else if (n.randomUnits === "minutes") {
            this.randomFirst = n.randomFirst * (60 * 1000);
            this.randomLast = n.randomLast * (60 * 1000);
        } else if (n.randomUnits === "hours") {
            this.randomFirst = n.randomFirst * (60 * 60 * 1000);
            this.randomLast = n.randomLast * (60 * 60 * 1000);
        } else if (n.randomUnits === "days") {
            this.randomFirst = n.randomFirst * (24 * 60 * 60 * 1000);
            this.randomLast = n.randomLast * (24 * 60 * 60 * 1000);
        } else {  // Default to seconds
            this.randomFirst = n.randomFirst * 1000;
            this.randomLast = n.randomLast * 1000;
        }

        this.diff = this.randomLast - this.randomFirst;
        this.name = n.name;
        this.idList = [];
        this.buffer = [];
        this.intervalID = -1;
        this.randomID = -1;
        this.lastSent = null;
        this.drop = n.drop;
        var node = this;

        if (node.pauseType === "delay") {
            node.on("input", function(msg) {
                var id;
                id = setTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    if (node.idList.length === 0) { node.status({}); }
                    node.send(msg);
                }, node.timeout);
                node.idList.push(id);
                if ((node.timeout > 1000) && (node.idList.length !== 0)) {
                    node.status({fill:"blue",shape:"dot",text:" "});
                }
            });

            node.on("close", function() {
                for (var i=0; i<node.idList.length; i++ ) {
                    clearTimeout(node.idList[i]);
                }
                node.idList = [];
                node.status({});
            });

        } else if (node.pauseType === "rate") {
            var olddepth = 0;
            node.on("input", function(msg) {
                if (!node.drop) {
                    if ( node.intervalID !== -1) {
                        node.buffer.push(msg);
                        if (node.buffer.length > 0) {
                            node.status({text:node.buffer.length});
                        }
                        if ((node.buffer.length > 1000) && (olddepth < 1000)) {
                            olddepth = 1000;
                            node.warn(node.name + " " + RED._("delay.error.buffer"));
                        }
                        if ((node.buffer.length > 10000) && (olddepth < 10000)) {
                            olddepth = 10000;
                            node.warn(node.name + " " + RED._("delay.error.buffer1"));
                        }
                    } else {
                        node.send(msg);
                        node.intervalID = setInterval(function() {
                            if (node.buffer.length === 0) {
                                clearInterval(node.intervalID);
                                node.intervalID = -1;
                                node.status({});
                            }
                            if (node.buffer.length > 0) {
                                node.send(node.buffer.shift());
                                if (node.buffer.length < 1000) { olddepth = 0; }
                                node.status({text:node.buffer.length});
                            }
                        },node.rate);
                    }
                } else {
                    var timeSinceLast;
                    if (node.lastSent) {
                        timeSinceLast = process.hrtime(node.lastSent);
                    }
                    if (!node.lastSent) { // ensuring that we always send the first message
                        node.lastSent = process.hrtime();
                        node.send(msg);
                    } else if ( ( (timeSinceLast[0] * SECONDS_TO_NANOS) + timeSinceLast[1] ) > (node.rate * MILLIS_TO_NANOS) ) {
                        node.lastSent = process.hrtime();
                        node.send(msg);
                    }
                }
            });

            node.on("close", function() {
                clearInterval(node.intervalID);
                node.buffer = [];
                node.status({});
            });

        } else if ((node.pauseType === "queue") || (node.pauseType === "timed")) {
            node.intervalID = setInterval(function() {
                if (node.pauseType === "queue") {
                    if (node.buffer.length > 0) {
                        node.send(node.buffer.shift()); // send the first on the queue
                    }
                }
                else {
                    while (node.buffer.length > 0) {    // send the whole queue
                        node.send(node.buffer.shift());
                    }
                }
                node.status({text:node.buffer.length});
            },node.rate);

            node.on("input", function(msg) {
                if (!msg.hasOwnProperty("topic")) { msg.topic = "_none_"; }
                var hit = false;
                for (var b in node.buffer) { // check if already in queue
                    if (msg.topic === node.buffer[b].topic) {
                        node.buffer[b] = msg; // if so - replace existing entry
                        hit = true;
                    }
                }
                if (!hit) { node.buffer.push(msg); } // if not add to end of queue
                node.status({text:node.buffer.length});
            });

            node.on("close", function() {
                clearInterval(node.intervalID);
                node.buffer = [];
                node.status({});
            });

        } else if (node.pauseType === "random") {
            node.on("input", function(msg) {
                var wait = node.randomFirst + (node.diff * Math.random());
                var id = setTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    node.send(msg);
                }, wait);
                node.idList.push(id);
            });
            
            node.on("close", function() {
                for (var i=0; i<node.idList.length; i++ ) {
                    clearTimeout(node.idList[i]);
                }
                node.idList = [];
            });
        }
    }
    RED.nodes.registerType("delay",DelayNode);
}
