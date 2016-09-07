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
var request = require("request");
var crypto = require("crypto");
var querystring = require('querystring');
Date.prototype.Format = function (fmt) {
	var o = {
		"M+": this.getMonth() + 1,
		"d+": this.getDate(),
		"h+": this.getHours(),
		"m+": this.getMinutes(),
		"s+": this.getSeconds(),
		"q+": Math.floor((this.getMonth() + 3) / 3),
		"S": this.getMilliseconds()
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
		if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
};

function get_sign(secret, param) {
	var sorted_array = [];
	for(i in param) {
		sorted_array.push(i);
	}
	sorted_array.sort();
	var temp = "";
	sorted_array.forEach(function(index) {
		temp = temp + index + param[index];
	});
	return crypto.createHash("md5").update((secret + temp + secret)).digest("hex").toUpperCase();
}
service_shared.sms = function(app_key, sms_free_sign_name, sms_param, rec_num, sms_template_code, secret, proxy, handler) {
	var url = "http://gw.api.taobao.com/router/rest?";
	if(typeof  sms_param === "string") {
		sms_param = JSON.parse(sms_param);
	}
	for(var item in sms_param) {
		sms_param[item] = sms_param[item].toString();
	}
	if(typeof sms_param === "object") {
		sms_param = JSON.stringify(sms_param);
	}

	var data = {
		method:"alibaba.aliqin.fc.sms.num.send",
		app_key:app_key,
		timestamp:new Date().Format("yyyy-MM-dd hh:mm:ss"),
		format:"json",
		v:"2.0",
		sign_method:"md5",
		sms_type:"normal",
		sms_free_sign_name:sms_free_sign_name,
		sms_param:sms_param,
		rec_num:rec_num,
		sms_template_code:sms_template_code
	};
	data.sign = get_sign(secret, data);
	var option = {
		url:url + querystring.stringify(data).toString('utf-8'),
		method:"post"
	};
	if(proxy) {
		option.proxy = proxy;
	}
	// handler(null, null);
	request(option, handler);
};

done();