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
import EventEmitter from "events";

class ComposerStore extends EventEmitter {
  constructor() {
    super();

    this.left_toolbar = {};

    this.node = {};

    this.file_tabs = {};

    this.editor = {};

    this.layout();

    $hope.register_action_handler({
      "composer/list/files":  this.list_files.bind(this),
      "composer/save/spec":  this.save_spec.bind(this),
      "composer/read/file": this.read_file.bind(this),
      "composer/write/file": this.write_file.bind(this),
      "composer/remove/file": this.remove_file.bind(this)
    });
  }

  list_files(req) {
    $hope.check(req && req.service_id, "ComposerStore", "list_files: invalid arguments");
    $hope.app.server.service.list_files$(req.service_id).then(data => {
      this.emit("composer", {event: "listed/files", data: data});
    }).catch(err => {
      $hope.notify("error", "Failed to list_files$ for ", req.service_id, 
        "with error:", err);
    }).done();
  }

  save_spec(req) {
    $hope.check(req && req.service_id && req.spec, "ComposerStore", "save_spec: invalid arguments");
    var svc = {
      id: req.service_id,
      spec: req.spec
    };
    $hope.app.server.service.update$(svc).then(() => {
      this.emit("composer", {event: "saved/spec", id: req.service_id});
    }).catch(err => {
      $hope.notify("error", "Failed to save_spec$ for ", req.service_id, 
        "with error:", err);
    }).done();
  }

  read_file(req) {
    $hope.check(req && req.service_id && req.file_path, "ComposerStore", "read_file: invalid arguments");
    $hope.app.server.service.read_file$(req.service_id, req.file_path).then(data => {
      this.emit("composer", {event: "readed/file", name: req.file_path, content: data.content});
    }).catch(() => {
      this.emit("composer", {event: "readed/file", name: req.file_path, content: ""});
    }).done();
  }

  write_file(req) {
    $hope.check(req && req.service_id && req.file_path, "ComposerStore", "write_file: invalid arguments");
    $hope.app.server.service.write_file$(req.service_id, req.file_path, req.content).then(() => {
      this.emit("composer", {event: "written/file", name: req.file_path});
    }).catch(err => {
      $hope.notify("error", "Failed to save_files$ for ", req.service_id, 
        "with error:", err);
    }).done();
  }

  remove_file(req) {
    $hope.check(req && req.service_id && req.file_path, "ComposerStore", "remove_file: invalid arguments");
    $hope.app.server.service.remove_file$(req.service_id, req.file_path).then(() => {
      this.emit("composer", {event: "removed/file", name: req.file_path});
    }).catch(err => {
      $hope.notify("error", "Failed to remove_files$ for ", req.service_id, 
        "with error:", err);
    }).done();
  }

  layout() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w === this.prev_width && h === this.prev_height) {
      return;
    }
    this.prev_width = w;
    this.prev_height = h;

    // TODO: 
    var navbar_height = 60;

    _.merge(this.left_toolbar, {
      top: navbar_height,
      left: 0,
      width: 60,
      height: h - navbar_height
    });

    _.merge(this.node, {
      top:      navbar_height,
      left:     this.left_toolbar.width,
      width:    250,
      height:   h - navbar_height
    });


    _.merge(this.file_tabs, {
      top:      navbar_height, 
      left:     this.left_toolbar.width + this.node.width,
      width:    w - this.left_toolbar.width - this.node.width,
      height:   24
    });

    _.merge(this.editor, {
      top: navbar_height + this.file_tabs.height,
      left: this.left_toolbar.width + this.node.width,
      width: w - this.left_toolbar.width - this.node.width,
      height: h - navbar_height - this.file_tabs.height
    });
  }
}


export default new ComposerStore();