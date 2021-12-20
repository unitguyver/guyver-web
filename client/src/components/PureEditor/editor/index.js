import config from "./config";
import * as utils from "./utils";
import dom from "../lib/utils/dom";
import MouseHandler from "../lib/event/mouse/mouse_handler";
import EventEmitter from "../lib/event/EventEmitter";
import CommandManager from "../lib/commands/CommandManager";
import defaultCommands from "../lib/commands/default_commands";
import EditSession from "./session";
import useragent from "../lib/utils/useragent";
import Search from "./tools/Search";
import lang from "../lib/utils/lang";
import { TextInput } from "../lib/event/keyboard/textinput";
import KeyBinding from "../lib/event/keyboard/KeyBinding";
import FoldHandler from "../lib/event/mouse/fold_handler";
import * as extra from "../lib/multi_select/EditorUtils";
import multiSelect from "../lib/multi_select";

@multiSelect
@EventEmitter
class Editor {
  static $uid = 0;

  id = "editor" + (++Editor.$uid);
  $toDestroy = [];
  commands = new CommandManager(useragent.isMac ? "mac" : "win", defaultCommands);

  constructor(renderer, session, options) {

    for (let utilName in utils) {
      Editor.prototype[utilName] = utils[utilName];
    }

    this.container = renderer.getContainerElement();
    this.renderer = renderer;

    if (typeof document == "object") {
      this.textInput = new TextInput(renderer.getTextAreaContainer(), this);
      this.renderer.textarea = this.textInput.getElement();
      // TODO detect touch event support
      this.$mouseHandler = new MouseHandler(this);
      new FoldHandler(this);
    }

    this.keyBinding = new KeyBinding(this);

    this.$search = new Search().set({
      wrap: true
    });

    this.$historyTracker = this.$historyTracker.bind(this);
    this.commands.on("exec", this.$historyTracker);

    this.$initOperationListeners();

    this._$emitInputEvent = lang.delayedCall(function () {
      this._signal("input", {});
      if (this.session && this.session.bgTokenizer)
        this.session.bgTokenizer.scheduleStart();
    }.bind(this));

    this.on("change", function (_, _self) {
      _self._$emitInputEvent.schedule(31);
    });

    this.setSession(session || options && options.session || new EditSession(""));
    config.resetOptions(this);

    options && this.setOptions(options);
    config._signal("editor", this);
  }
}

config.defineOptions(Editor.prototype, "editor", {
  selectionStyle: {
    set: function (style) {
      this.onSelectionChange();
      this._signal("changeSelectionStyle", { data: style });
    },
    initialValue: "line"
  },
  highlightActiveLine: {
    set: function () { this.$updateHighlightActiveLine(); },
    initialValue: true
  },
  highlightSelectedWord: {
    set: function (shouldHighlight) { this.$onSelectionChange(); },
    initialValue: true
  },
  readOnly: {
    set: function (readOnly) {
      this.textInput.setReadOnly(readOnly);
      this.$resetCursorStyle();
    },
    initialValue: false
  },
  copyWithEmptySelection: {
    set: function (value) {
      this.textInput.setCopyWithEmptySelection(value);
    },
    initialValue: false
  },
  cursorStyle: {
    set: function (val) { this.$resetCursorStyle(); },
    values: ["ace", "slim", "smooth", "wide"],
    initialValue: "ace"
  },
  mergeUndoDeltas: {
    values: [false, true, "always"],
    initialValue: true
  },
  behavioursEnabled: { initialValue: true },
  wrapBehavioursEnabled: { initialValue: true },
  enableAutoIndent: { initialValue: true },
  autoScrollEditorIntoView: {
    set: function (val) { this.setAutoScrollEditorIntoView(val); }
  },
  keyboardHandler: {
    set: function (val) { this.setKeyboardHandler(val); },
    get: function () { return this.$keybindingId; },
    handlesSet: true
  },
  value: {
    set: function (val) { this.session.setValue(val); },
    get: function () { return this.getValue(); },
    handlesSet: true,
    hidden: true
  },
  session: {
    set: function (val) { this.setSession(val); },
    get: function () { return this.session; },
    handlesSet: true,
    hidden: true
  },

  showLineNumbers: {
    set: function (show) {
      this.renderer.$gutterLayer.setShowLineNumbers(show);
      this.renderer.$loop.schedule(this.renderer.CHANGE_GUTTER);
      if (show && this.$relativeLineNumbers)
        relativeNumberRenderer.attach(this);
      else
        relativeNumberRenderer.detach(this);
    },
    initialValue: true
  },
  relativeLineNumbers: {
    set: function (value) {
      if (this.$showLineNumbers && value)
        relativeNumberRenderer.attach(this);
      else
        relativeNumberRenderer.detach(this);
    }
  },
  placeholder: {
    set: function (message) {
      if (!this.$updatePlaceholder) {
        this.$updatePlaceholder = function () {
          var value = this.session && (this.renderer.$composition || this.getValue());
          if (value && this.renderer.placeholderNode) {
            this.renderer.off("afterRender", this.$updatePlaceholder);
            dom.removeCssClass(this.container, "ace_hasPlaceholder");
            this.renderer.placeholderNode.remove();
            this.renderer.placeholderNode = null;
          } else if (!value && !this.renderer.placeholderNode) {
            this.renderer.on("afterRender", this.$updatePlaceholder);
            dom.addCssClass(this.container, "ace_hasPlaceholder");
            var el = dom.createElement("div");
            el.className = "ace_placeholder";
            el.textContent = this.$placeholder || "";
            this.renderer.placeholderNode = el;
            this.renderer.content.appendChild(this.renderer.placeholderNode);
          } else if (!value && this.renderer.placeholderNode) {
            this.renderer.placeholderNode.textContent = this.$placeholder || "";
          }
        }.bind(this);
        this.on("input", this.$updatePlaceholder);
      }
      this.$updatePlaceholder();
    }
  },

  hScrollBarAlwaysVisible: "renderer",
  vScrollBarAlwaysVisible: "renderer",
  highlightGutterLine: "renderer",
  animatedScroll: "renderer",
  showInvisibles: "renderer",
  showPrintMargin: "renderer",
  printMarginColumn: "renderer",
  printMargin: "renderer",
  fadeFoldWidgets: "renderer",
  showFoldWidgets: "renderer",
  displayIndentGuides: "renderer",
  showGutter: "renderer",
  fontSize: "renderer",
  fontFamily: "renderer",
  maxLines: "renderer",
  minLines: "renderer",
  scrollPastEnd: "renderer",
  fixedWidthGutter: "renderer",
  theme: "renderer",
  hasCssTransforms: "renderer",
  maxPixelHeight: "renderer",
  useTextareaForIME: "renderer",

  scrollSpeed: "$mouseHandler",
  dragDelay: "$mouseHandler",
  dragEnabled: "$mouseHandler",
  focusTimeout: "$mouseHandler",
  tooltipFollowsMouse: "$mouseHandler",

  firstLineNumber: "session",
  overwrite: "session",
  newLineMode: "session",
  useWorker: "session",
  useSoftTabs: "session",
  navigateWithinSoftTabs: "session",
  tabSize: "session",
  wrap: "session",
  indentedSoftWrap: "session",
  foldStyle: "session",
  mode: "session"
});


var relativeNumberRenderer = {
  getText: function (session, row) {
    return (Math.abs(session.selection.lead.row - row) || (row + 1 + (row < 9 ? "\xb7" : ""))) + "";
  },
  getWidth: function (session, lastLineNumber, config) {
    return Math.max(
      lastLineNumber.toString().length,
      (config.lastRow + 1).toString().length,
      2
    ) * config.characterWidth;
  },
  update: function (e, editor) {
    editor.renderer.$loop.schedule(editor.renderer.CHANGE_GUTTER);
  },
  attach: function (editor) {
    editor.renderer.$gutterLayer.$renderer = this;
    editor.on("changeSelection", this.update);
    this.update(null, editor);
  },
  detach: function (editor) {
    if (editor.renderer.$gutterLayer.$renderer == this)
      editor.renderer.$gutterLayer.$renderer = null;
    editor.off("changeSelection", this.update);
    this.update(null, editor);
  }
};

for (let extraKey in extra) {
  Editor.prototype[extraKey] = extra[extraKey];
}

export default Editor;
