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

function load_asset$(url) {
  if (_.endsWith(url, ".css")) {
    var ele = document.createElement("link");
    ele.type = "text/css";
    ele.rel  = "stylesheet";
    ele.href = url;
  }
  else {
    var ele = document.createElement("script");
    ele.type = "text/javascript";
    ele.src = url;
  }

  var d = $Q.defer();
  ele.async = false;
  ele.defer = false;
  ele.onload  = ele.onreadystatechange = () => {
    ele.onload = ele.onreadystatechange = ele.onerror = null;
    d.resolve();
  };
  ele.onerror = () => {
    ele.onload = ele.onreadystatechange = ele.onerror = null;
    d.reject();
  };

  var head = document.getElementsByTagName("head")[0];
  head.insertBefore(ele, head.lastChild);
  return d.promise;
}

exports.init$ = function() {
  var bundles = $hope.app.stores.spec.get_ui_bundles();
  var scripts = [];

  _.forEach(bundles, bundle => {
    _.forEach(bundle.specs, spec => {
      if (_.isArray(spec.scripts) && spec.scripts.length > 0) {
        scripts = scripts.concat(spec.scripts);
      }
    });
  });

  if (scripts.length === 0) {
    return $Q.resolve();
  }

  var tasks = [];
  var has_jsx;

  _.forEach(scripts, s => {
    if (_.endsWith(s, ".jsx")) {
      if (!has_jsx) {
        has_jsx = true;
        tasks.push(load_asset$("/babel-browser.js"));
      }
    }
    else {
      tasks.push(load_asset$("/addons/" + s));
    }
  });

  if (!has_jsx) {
    return $Q.all(tasks);
  }

  // Make Widget as global
  require("../components/ui_ide/grid_stack.x");

  return $Q.all(tasks).then(()=> {
    var q = [];
    _.forEach(scripts, function(s) {
      if (_.endsWith(s, ".jsx")) {
        var d = $Q.defer();
        try {
          babel.load("/addons/" + s, ()=> {
            d.resolve();
          });
        }
        catch(e) {
          $hope.notify("error", __("Failed to load due to "), s, e);
          d.reject(e);
        }
        q.push(d.promise);
      }
    });
    return $Q.all(q);
  });
}