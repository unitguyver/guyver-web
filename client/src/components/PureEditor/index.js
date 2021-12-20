import config from "./editor/config";
import Editor from "./editor";
import EditSession from "./editor/session";
import Renderer from "./lib/virtual_renderer";
import dom from "./lib/utils/dom";
import UndoManager from "./utils/undomanager";
import event from "./lib/event/event";
import VimHandler from "./lib/event/keyboard/vim";
import "./worker";

class PureEditor extends Editor {
  config = config;
  version = config.version;

  constructor(el, options) {
    if (typeof el === "string") {
      const _id = el;
      el = document.getElementById(_id);
      if (!el) {
        throw new Error("ace.edit can't find div #" + _id);
      }
    }

    if (el && el.env && el.env.editor instanceof Editor) {
      return el.env.editor;
    }

    let value = "";
    let oldNode;
    if (el && /input|textarea/i.test(el.tagName)) {
      oldNode = el;
      value = oldNode.value;
      el = dom.createElement("pre");
      oldNode.parentNode.replaceChild(el, oldNode);
    } else if (el) {
      value = el.textContent;
      el.innerHTML = "";
    }

    const doc = new EditSession(value);
    doc.setUndoManager(new UndoManager());

    super(new Renderer(el), doc, options);

    let env = {
      document: doc,
      editor: this,
      onResize: this.resize.bind(this, null)
    };
    if (oldNode) {
      env.textarea = oldNode;
    }
    event.addListener(window, "resize", env.onResize);
    this.on("destroy", function () {
      event.removeListener(window, "resize", env.onResize);
      env.editor.container.env = null;
    });
    this.container.env = this.env = env;

    this.setKeyboardHandler(new VimHandler());
  };
}

export default PureEditor;