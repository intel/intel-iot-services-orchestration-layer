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
var drivers = require("./drivers.json");
var driver_docs = require("./driver_docs.json");
var assert = require("assert");
var fse = require("fs.extra");
var _ = require("lodash");
var path = require("path");
assert.equal(drivers.length, driver_docs.length, "array length is not equal");

var log = console.log;

var rootpath = "./";

fse.mkdirsSync(rootpath);

var url_base = "https://cn.iot.seeed.cc/v1/node/";


for (var i = 0; i < drivers.length; i++) {
  process_thing(drivers[i], driver_docs[i]);
}

/**
 * process one grove thing
 * @param  {object} driver one item of the drivers.json
 * @param  {objecy} doc    one item of the driver_docs.json
 * @return {null}        
 */
function process_thing(driver, doc) {
  var thing_name = driver.ClassName;
  log("[process thing]:", thing_name);
  var thing_path = path.join(rootpath, thing_name);
  fse.mkdirsSync(thing_path);

  gen_thingjson(driver, doc, thing_path);

  _.forEach(driver.Reads, function(value, key) {
    var service_path = path.join(thing_path, key);
    fse.mkdirsSync(service_path)
    process_read_service(key, value, doc.Methods[key], service_path, thing_name);
  });

  _.forEach(driver.Writes, function(value, key) {
    var service_path = path.join(thing_path, key);
    fse.mkdirsSync(service_path)
    process_write_service(key, value, doc.Methods[key], service_path, thing_name);
  });

}

/**
 * generate the thing.json
 * @param  {object} driver     one whole device json
 * @param  {object} doc        one whole doc json for a device
 * @param  {path} thing_path the thing's target path
 * @return {null}            
 */
function gen_thingjson(driver, doc, thing_path) {
  var thingjson_path = path.join(thing_path, "thing.json");
  var json = {
    name: driver.ClassName,
    description: driver.GroveName
  }
  fse.outputJsonSync(thingjson_path, json);
}

/**
 * process read service of a grive thing
 * @param  {string} service_name service name (ClassName)
 * @param  {object} arg          the arg object including Returns and Arguments
 * @param  {object} doc          the doc of the service
 * @param  {string} service_path the service's target path
 * @return {null}              
 */
function process_read_service(service_name, arg, doc, service_path, thing_name) {
  log(" [process get service]:", service_name);
  gen_servicejson(service_name, arg, doc, service_path);
  gen_read_kerneljs(service_name, arg, service_path, thing_name);
}

function process_write_service(service_name, arg, doc, service_path, thing_name) {
  log(" [process post service]:", service_name);
  gen_servicejson(service_name, arg, doc, service_path);
  gen_write_kerneljs(service_name, arg, service_path, thing_name);
}
/**
 * generate the service.json for each service
 * @param  {string} service_name service name
 * @param  {object} arg          the arg object including Returns and Arguments
 * @param  {object} doc          the doc of the services
 * @param  {string} service_path service's target path
 * @return {null}              
 */
function gen_servicejson(service_name, arg, doc, service_path) {
  var servicejson_path = path.join(service_path, "service.json");
  var json = {};
  json.name = service_name;
  json.description = JSON.stringify(doc);
  var spec = {};
  spec.name = service_name + "_spec"
  spec.in = {};
  spec.in.ports = [];
  if(_.isEmpty(arg.Arguments)) {
    spec.in.ports.push({name:"trigger"});
  }
  else
  {
    arg.Arguments.forEach(function(item) {
      spec.in.ports.push({name: item[1]});
    });
  }

  spec.out = {};
  spec.out.ports = [];
  if(_.isEmpty(arg.Returns)) {
    assert(_.startsWith(service_name, "write_"));
    spec.out.ports.push({name:"status"});
  } else {
    assert(_.startsWith(service_name, "read_"));
    arg.Returns.forEach(function(item) {
      spec.out.ports.push({name: item[1]});
    });
  }
  
  spec.config = [{name:"access_token", required:true},{name:"port_name", required:true}];
  json.spec = spec;
  fse.outputJsonSync(servicejson_path, json);
}

function gen_read_kerneljs(service_name, arg, service_path, thing_name) {
  var kernel_path = path.join(service_path, "kernel.js");
  var content = 'var request = require("request");\n';
  content = content + 'var access_token = CONFIG.access_token;\n';
  content = content + 'var port_name = CONFIG.port_name;\n';
  content = content + 'console.log("' + service_name + '", IN, CONFIG);\n';

  var arg_list = '""';
  if(!_.isUndefined(arg.Arguments)) {
    arg.Arguments.forEach(function(item) {
      arg_list = arg_list + ' + "/" + ' + "IN." + item[1];
    })
  }
  content = content + 'var url = "https://cn.iot.seeed.cc/v1/node/' +
    thing_name +
    '" + ' + "port_name" +
    ' + "/' +
    service_name.slice(5) + '" + ' + arg_list +
    ' + "?access_token="' + " + access_token;\n";

  content = content + 
  'request.get(url, function(e, res, body) {\n' +
    'if(e) {\n' +
      'console.log("error:", e);\n' +
      'sendERR(e);\n' +
    '} else {\n' +
      'console.log("success:", body);\n' +
      'sendOUT(JSON.parse(body));\n' +
    '}' +
  '})';

  fse.outputFileSync(kernel_path, content);
}

function gen_write_kerneljs(service_name, arg, service_path, thing_name) {
  var kernel_path = path.join(service_path, "kernel.js");
  var content = 'var request = require("request");\n';
  content = content + 'var access_token = CONFIG.access_token;\n';
  content = content + 'var port_name = CONFIG.port_name;\n';
  content = content + 'console.log("' + service_name + '", IN, CONFIG);\n';

  var arg_list = '""';
  if(!_.isUndefined(arg.Arguments)) {
    arg.Arguments.forEach(function(item) {
      arg_list = arg_list + ' + "/" + ' + "IN." + item[1];
    })
  }
  content = content + 'var url = "https://cn.iot.seeed.cc/v1/node/' +
    thing_name +
    '" + ' + "port_name" +
    ' + "/' +
    service_name.slice(6) + '" + ' + arg_list +
    ' + "?access_token="' + " + access_token;\n";

  content = content + 
  'request.post(url, function(e, res, body) {\n' +
    'if(e) {\n' +
      'console.log("error:", e);\n' +
      'sendERR(e);\n' +
      'sendOUT({status:false});\n' +
    '} else {\n' +
      'console.log("success:", body);\n' +
      'sendOUT({status:true});\n' +
    '}' +
  '})';

  fse.outputFileSync(kernel_path, content);
}
