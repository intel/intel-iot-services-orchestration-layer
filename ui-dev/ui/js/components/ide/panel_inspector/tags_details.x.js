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
import Dialog from "../dialog.x";

function draggable(ref, helper) {
  $(ref).draggable({
    cursor: "move",
    cursorAt: {top: 0, left: 0},
    helper: helper
  });
}

function droppable(ref, drop) {
  $(ref).droppable({
    accept: ".hope-graph-tag",
    drop: drop
  });
}

export default class TagsDetails extends ReactComponent {

  static propTypes = {
    id: React.PropTypes.string.isRequired
  };

  _on_add_tag() {
    var view = $hope.app.stores.graph.active_view;
    var tags = view.graph.tags;
    if (tags.length >= 20) {
      $hope.notify("error", __("Too many tags"));
      return;
    }

    view.create("tag", {
      name: String.fromCharCode(65 + tags.length) // A, B, C, ...
    });
    this.forceUpdate();
  }

  _create_drag_object(src, tag) {
    var view = $hope.app.stores.graph.active_view;
    var div = document.createElement("div");
    ReactDOM.render(<i className={"hope-graph-tag"} style={{background: view.get_tag_color(tag)}}>{tag.name}</i>, div);
    // binding information
    $(div).data("src", src);
    $(div).data("tag", tag);
    div.classList.add("z-index-top");
    return div;
  }

  _drop_add(iotype, event, ui) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var io = node[iotype];

    var data = $(ui.helper).data();
    $hope.check(data.tag, "tags_details.x", "on_drop didn't get tag");
    if (data.src !== "sys") {
      return;
    }

    if (!io.tags || io.tags.length === 0) {
      if (io.ports.length === 0) {
        $hope.notify("warning", __("Add tag without ports"));
        return;
      }
      io.tags = [{ref: data.tag.id, ports: []}];
      _.forOwn(io.ports, p => {
        io.tags[0].ports.push(p.name);
      });
    }
    else {
      if (io.tags[0].ref === data.tag.id) {
        return;
      }
      io.tags[0].ref = data.tag.id;
    }
    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _on_drop_del(event, ui) {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var data = $(ui.helper).data();
    $hope.check(data.tag, "tags_details.x", "on_drop didn't get tag");

    if (data.src === "sys") {
      var id = data.tag.id;
      if (view.is_tag_used(id)) {
        $hope.notify("error", __("Tag in use"));
      }
      else {
        view.remove("tag", id);
        this._shake_trash();
        this.forceUpdate();
      }
      return;
    }
    
    if (data.src === "in") {
      delete node.in.tags;
    }
    else if (data.src === "out") {
      delete node.out.tags;
    }
    this._shake_trash();
    this.forceUpdate();
    view.change("node", this.props.id, null);
  }

  _shake_trash() {
    var trash = this.refs.trash;
    trash.classList.add("shake-opacity");
    setTimeout( () => {
      trash.classList.remove("shake-opacity");
    }, 1000);
  }

  componentDidUpdate() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);

    _.forOwn(view.graph.tags, tag => {
      draggable(this.refs[tag.id], this._create_drag_object.bind(this, "sys", tag));
    });

    var intag = this.refs.intag;
    if (intag) {
      let tag = view.get("tag", node.in.tags[0].ref);
      draggable(intag, this._create_drag_object.bind(this, "in", tag));
    }

    var outtag = this.refs.outtag;
    if (outtag) {
      let tag = view.get("tag", node.out.tags[0].ref);
      draggable(outtag, this._create_drag_object.bind(this, "out", tag));
    }
  }

  componentDidMount() {
    droppable(this.refs.input, this._drop_add.bind(this, "in"));
    droppable(this.refs.output, this._drop_add.bind(this, "out"));
    droppable(this.refs.trash, this._on_drop_del);
    this.componentDidUpdate();
  }

  _on_show_tagin() {
    Dialog.show_svg_animation_dialog("Tag Decorator (in)",
      require("./help_svg/tagin_decorator.x"));
  }

  _on_show_tagout() {
    Dialog.show_svg_animation_dialog("Tag Decorator (out)",
      require("./help_svg/tagout_decorator.x"));
  }

  render() {
    var view = $hope.app.stores.graph.active_view;
    var node = view.get("node", this.props.id);
    var sys_tags = _.map(view.graph.tags, tag => {
      return (<i ref={tag.id} className={"hope-graph-tag"}
          style={{background: view.get_tag_color(tag)}}>{tag.name}</i>);
    });

    var in_tags, out_tags;
    if (node.in.tags && node.in.tags.length > 0) {
      let tag = view.get("tag", node.in.tags[0].ref);
      in_tags = <i ref="intag" className={"hope-graph-tag"}
          style={{background: view.get_tag_color(tag)}}>{tag.name}</i>;
    }
    if (node.out.tags && node.out.tags.length > 0) {
      let tag = view.get("tag", node.out.tags[0].ref);
      out_tags = <i ref="outtag" className={"hope-graph-tag"}
          style={{background: view.get_tag_color(tag)}}>{tag.name}</i>;
    }

    return (
      <div>
        <div>{__("Drag to add tags")}</div>
        <div className="hope-tag-group">
          { sys_tags }
          <i onClick={this._on_add_tag} className="hope-graph-tag">+</i>
        </div>
        <div>
          <span><strong>{__("Input") + " "}</strong></span>
          <span className="fa fa-question-circle hope-hover-icon-btn"
             onClick={this._on_show_tagin} />
        </div>
        <div ref="input" className="hope-tag-box">
          { in_tags }
        </div>
        <div>
          <span><strong>{__("Output") + " "}</strong></span>
          <span className="fa fa-question-circle hope-hover-icon-btn"
             onClick={this._on_show_tagout} />
        </div>
        <div ref="output" className="hope-tag-box">
          { out_tags }
        </div>
        <div>{__("Drop here to delete")}</div>
        <div className="text-center">
          <span ref="trash" className="fa fa-trash fa-3x"/>
        </div>
      </div>
    );
  }
}
