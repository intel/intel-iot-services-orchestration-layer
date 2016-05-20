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
 * Grove Thing Module
 * handle grove/wio-link thing and service
 * @module entity/grove_thing
 */

var B = require("hope-base");
var _ = require("lodash");
var log = B.log.for_category("entity/grove_thing");
var check = B.check;
var T = require("./thing");
var Spec = require("./spec");
var request = require("request");
var url = require("url");
/**
 * the global var which contains the infos of drivers.json and driver_docs.json
 * grove_doc[classname].driver
 * grove_doc[classname].doc
 */
var grove_doc;


exports.load_grove_thing_via_login$ = function(grove_config, hub_id, em) {
  log("grove login:", grove_config);

  return new Promise(function(resolve, reject) {
    var login_url = url.resolve(grove_config.server, "/v1/user/login");
    var login_form = {
      email: grove_config.email,
      password: grove_config.password
    };
    request.post({url:login_url, json:true, form:login_form}, function(e, res, body) {
      if(e) {
        log.error("grove login fail", grove_config, e);
        reject(e);
      } else if (body.error) {
        log.error("grove login fail", grove_config, body.error);
        reject(body.error);
      } else {
        log("got user token", body);
        resolve(body.token);
      }
    });
  }).then(function(user_token) {
    return new Promise(function(resolve, reject) {
      var node_list_url = url.resolve(grove_config.server, "/v1/nodes/list") +
      "?access_token=" + user_token;
      request.get({url:node_list_url, json:true}, function(e, res, body) {
        if(e) {
          log.error("grove node list fail", grove_config, e);
          reject(e);
        } else if (body.error) {
          log.error("grove node list fail", grove_config, body.error);
          reject(body.error);
        } else {
          log("got node list", body);
          resolve(body.nodes);
        }
      });
    });
  }).then(function(node_list) {
    if (node_list.length == 0) {
      log.warn("no nodes belong to the user", grove_config);
      return;
    }
    var tasks = [];
    node_list.forEach(function(item) {
      if (item.online) {
        tasks.push(em.thing__add_grove_thing$(item.node_key, item.name, grove_config, hub_id));
      } else {
        log.warn("one node is offline:", item);
      }
    })
    return Promise.all(tasks);
  });

}


exports.add_grove_thing$ = function(thing_id, thing_name, grove_config, hub_id, em, changed_list) {
  log("add grove thing", thing_id);

  var grove_bundle_path = grove_config.grovebundle_path;
  var base_url = grove_config.server;


  var specbundle_obj = {
    id: "specbundle_" + thing_id,
    name: "specbundle_" + thing_id,
    specs: [] //spec object
  };

  var grovething_obj = {
    id: "grovething_" + thing_id,
    name: "WioLink_" + thing_name,
    description : "id is " + thing_id,
    hub: hub_id,
    is_connect : true,
    services : [], //service object
    type: "grove_thing",
    is_builtin: false
  };
  /**
   * prepare the full grove_thing and full grove_spec_bundle.
   * here "full" means the object contains the whole object of its children
   * thing contains service object and specbundle contains spec object
   * @param  {Array} service_list the list of the existing services after parsing the wellknown
   */
  function prepare_full_thing_and_spebundle(service_list) {
    service_list.forEach(function(item) {
      var service;
      if (item.service_path) {
        var json_path = B.path.join(item.service_path, "service.json");
        service = B.fs.read_json(json_path);
      } else {
        service = item.servicejson;
      }
      B.check(!_.isUndefined(service), "entity/grove_thing", "service json should not be undefined", item);
      var spec = service.spec;
      spec.id = "spec_" + item.class_name + item.service_name;
      spec.specbundle = specbundle_obj.id;
      if (item.service_path) {
        spec.config[0].default = thing_id;
        spec.config[1].default = item.port_name;
      }
      specbundle_obj.specs.push(spec);
      log("prepare spec:", spec);

      service.spec = spec.id;
      service.type = "grove_service";
      service.id = "groveservice_" + item.class_name + item.port_name + item.service_name + thing_id;
      if (item.service_path) {
        service.path = item.service_path;
        service.type = "grove_semiauto_service";
      } else {
        service.type = "grove_auto_service";
        B.check(!_.isUndefined(item.kerneljs), "entity/grove_thing", "grove_auto_service must contain kerneljs", item);
        service.js = {
          kernel: item.kerneljs
        };
      }
      service.is_connect = true;
      service.own_spec = true;
      service.thing = grovething_obj.id;
      grovething_obj.services.push(service);
      log("prepare service:", service);
    });

    log("the prepared specbundle:", specbundle_obj);
    log("the prepared grovething:", grovething_obj);

  }
  
  /**
   * parse the one item of the wellknown api
   * @param  {string} apiname such as "GET /v1/node/GroveRotaryAngleA0/angle -> int angle"
   * @return {object}         object:
   *                           {
   *                             class_name: GroveRotaryAngle
   *                             service_name: read_angle, the prefix is decided by get or post  
   *                             port_name: A0 
   *                             service_path: the service template folder
   *                           }
   *                           if the return is null, this items is not service, we should ignore it 
   *                           in the following process.
   */
  function parse_apiname(apiname) {
    var splits = apiname.split(" ");
    var prefix;
    var method_type; // for generate_grove_service_now 
    if (splits[0] === "GET") {
      prefix = "read_";
      method_type = "Reads";
    }
    else if (splits[0] === "POST") {
      prefix = "write_";
      method_type = "Writes";
    }
    else {
      //find HASEVENT API, ignore it
      return null;
    }

    var service_name = prefix + splits[1].split("/")[4];
    var fullname = splits[1].split("/")[3];
    var port_name;
    var class_name;

    if (_.endsWith(fullname, "D0")) {
      port_name = "D0";
      class_name = fullname.slice(0, -2);
    } else if (_.endsWith(fullname, 'D1')) {
      port_name = "D1";
      class_name = fullname.slice(0, -2);     
    } else if (_.endsWith(fullname, 'D2')) {
      port_name = "D2";
      class_name = fullname.slice(0, -2);     
    } else if (_.endsWith(fullname, 'A0')) {
      port_name = "A0";
      class_name = fullname.slice(0, -2);     
    } else if (_.endsWith(fullname, 'I2C0')) {
      port_name = "I2C0";
      class_name = fullname.slice(0, -4);     
    } else if (_.endsWith(fullname, 'UART0')) {
      port_name = "UART0";
      class_name = fullname.slice(0, -5);     
    } else {
      check("false", "entity/grove_thing", "unkown class_name and port_name", fullname);
    }
    var service_path = B.path.join(grove_bundle_path, class_name, service_name);
    var service_ret;
    //if the service template doesnt exsit, create the service right now, set prop:kerneljs servicejson
    if (!is_service_path(service_path)) {
      log("the service folder doesn't exsit, create now", service_name);
      service_ret = generate_grove_service_now( grove_bundle_path, 
                                                class_name, 
                                                service_name, 
                                                method_type, 
                                                port_name, 
                                                thing_id, 
                                                thing_name, 
                                                base_url);
    } else {
      service_ret = {
        class_name: class_name,
        service_name : service_name,
        service_path : service_path,
        port_name : port_name
      };
    }
    log("parse the wellknown api done:", apiname, service_ret);
    return service_ret;
  } // end of function parse_apiname(apiname)

  return new Promise(function(resolve, reject) {
    var wk_url = url.resolve(base_url, "/v1/node/.well-known") + "?access_token=" + thing_id;
    request({url:wk_url,json:true}, function(e, res, body) {
      if (e) {
        log.error("request wellknown fail", e);
        reject(e);
      } else if (body.error) {
        log.error("request wellknown fail", body.error);
        reject(body.error);
      } else {
        log("request wellknown api done", body);
        resolve(body.well_known);
      }
    });
  }).then(function(resources) {
   /*return Promise.resolve(1).then(function(){
    var resources = 
    ["GET /v1/node/GroveRotaryAngleA0/angle -> int angle",
    "POST /v1/node/GroveLedWs2812D2/clear/{uint8_t total_led_cnt}/{char *rgb_hex_string}",
    "POST /v1/node/GroveLedWs2812D2/segment/{uint8_t start}/{char *rgb_hex_string}",
    "POST /v1/node/GroveLedWs2812D2/start_rainbow_flow/{uint8_t length}/{uint8_t brightness}/{uint8_t speed}",
    "POST /v1/node/GroveLedWs2812D2/stop_rainbow_flow"];*/
    var service_list = [];
    resources.forEach(function(item) {
      var ret = parse_apiname(item);
      if (_.isNull(ret)) {
        log("IGNORE the event api", item);
      }
      else {
        service_list.push(ret);
      }
    });
    prepare_full_thing_and_spebundle(service_list);
    var tasks = [];
    tasks.push(T.add_thing_with_services$(grovething_obj, em, changed_list));
    tasks.push(Spec.add_specbundle_with_specs$(specbundle_obj, em, changed_list));
    return Promise.all(tasks);
  });
};

function is_service_path(service_path) {
  return B.fs.dir_exists(service_path) && 
  B.fs.file_exists(B.path.join(service_path, "service.json"));
}

function generate_grove_service_now (rootpath, class_name, service_name,
  method_type, port_name, thing_id, thing_name, base_url) {
  log("generate_grove_service_now", rootpath, class_name, service_name, method_type, port_name, thing_id);
  if (_.isUndefined(grove_doc)) {
    _create_grove_doc(rootpath);
  }

  var ret = {};
  var arg = grove_doc[class_name].driver[method_type][service_name];
  var base_url_v1_node = url.resolve(base_url, "/v1/node/");

  //service.json
  var servicejson = {};
  servicejson.name = service_name;
  servicejson.description = "@" + class_name + "_" + port_name + "_" + thing_name + "\n" + JSON.stringify(grove_doc[class_name].doc.Methods[service_name]);
  var spec = {};
  spec.name = service_name + "_spec";
  spec.in = {};
  spec.in.ports = [];
  if (_.isEmpty(arg.Arguments)) {
    spec.in.ports.push({name:"trigger"});
  }
  else {
    arg.Arguments.forEach(function(item) {
      spec.in.ports.push({name: item[1]});
    });
  }
  spec.out = {};
  spec.out.ports = [];
  if (_.isEmpty(arg.Returns)) {
    B.check(_.startsWith(service_name, "write_"), "entity/grove_thing", "write method shouldn't have return value", service_name, arg);
    spec.out.ports.push({name:"status"});
  } else {
    B.check(_.startsWith(service_name, "read_"), "entity/grove_thing", "read method should have return value", service_name, arg);
    arg.Returns.forEach(function(item) {
      spec.out.ports.push({name: item[1]});
    });
  }
  servicejson.spec = spec;

  //kernel.js
  var kerneljs = "";
  if (method_type === "Reads") {
    kerneljs = _gen_read_kerneljs();
  }
  else {
    kerneljs = _gen_write_kerneljs();
  }

  ret = {
    kerneljs:kerneljs,
    servicejson:servicejson,
    class_name:class_name,
    service_name:service_name,
    port_name:port_name
  };
  return ret;

  function _gen_read_kerneljs() {
    var content = 'var request = require("request");\n';
    content = content + 'var access_token = "' + thing_id + '";\n';
    content = content + 'var port_name = "' + port_name + '";\n';
    content = content + 'console.log("' + service_name + '", IN);\n';

    var arg_list = '""';
    if (!_.isUndefined(arg.Arguments)) {
      arg.Arguments.forEach(function(item) {
        arg_list = arg_list + ' + "/" + ' + "IN." + item[1];
      });
    }
    content = content + 'var url = "' + base_url_v1_node +
      class_name +
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
    return content;    
  }

  function _gen_write_kerneljs() {
    var content = 'var request = require("request");\n';
    content = content + 'var access_token = "' + thing_id + '";\n';
    content = content + 'var port_name = "' + port_name + '";\n';
    content = content + 'console.log("' + service_name + '", IN);\n';

    var arg_list = '""';
    if (!_.isUndefined(arg.Arguments)) {
      arg.Arguments.forEach(function(item) {
        arg_list = arg_list + ' + "/" + ' + "IN." + item[1];
      });
    }
    content = content + 'var url = "' + base_url_v1_node +
      class_name +
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
    return content;
  }




}

/**
 * transform the drivers.json and driver_docs.json into a new object whose key is classname.
 * we use its side effect to change the global var: grove_doc
 * @param  {String} rootpath the path which contains the drivers.json and driver_docs.json
 */
function _create_grove_doc (rootpath) {
  var driver_path = B.path.join(rootpath, "drivers.json");
  var drivers = require(driver_path);
  var driver_docs_path = B.path.join(rootpath, "driver_docs.json");
  var driver_docs = require(driver_docs_path);
  B.check(drivers.length == driver_docs.length, "entity/grove_thing", "array length is not equal");
  grove_doc = {};
  for (var i = 0; i < drivers.length; i++) {
    grove_doc[drivers[i].ClassName] = {
      driver:drivers[i],
      doc:driver_docs[i]
    };
  }
}