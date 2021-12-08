import config from "../config";
import EventEmitter from "../../lib/event/EventEmitter";
import Document from "../../utils/Document";
import Selection from "../tools/Selection";
import Folding from "./Folding";
import BracketMatch from "./BracketMatch";
import BidiHandler from "../tools/BidiHandler";
import * as utils from "./utils";

@Folding
@BracketMatch
@EventEmitter
class EditSession {
  static $uid = 0;

  $breakpoints = [];
  $decorations = [];
  $frontMarkers = {};
  $backMarkers = {};
  $markerId = 1;
  $undoSelect = true;
  $foldData = [];
  id = "session" + (++EditSession.$uid);

  constructor(text, mode) {

    for (let utilName in utils) {
      EditSession.prototype[utilName] = utils[utilName];
    }

    this.$foldData.toString = function () {
      return this.join("\n");
    };
    this.on("changeFold", this.onChangeFold.bind(this));
    this.$onChange = this.onChange.bind(this);

    if (typeof text != "object" || !text.getLine)
      text = new Document(text);

    this.setDocument(text);
    this.selection = new Selection(this);
    this.$bidiHandler = new BidiHandler(this);

    config.resetOptions(this);
    this.setMode(mode);
    config._signal("session", this);
  }
}

config.defineOptions(EditSession.prototype, "session", {
  wrap: {
    set: function (value) {
      if (!value || value == "off")
        value = false;
      else if (value == "free")
        value = true;
      else if (value == "printMargin")
        value = -1;
      else if (typeof value == "string")
        value = parseInt(value, 10) || false;

      if (this.$wrap == value)
        return;
      this.$wrap = value;
      if (!value) {
        this.setUseWrapMode(false);
      } else {
        var col = typeof value == "number" ? value : null;
        this.setWrapLimitRange(col, col);
        this.setUseWrapMode(true);
      }
    },
    get: function () {
      if (this.getUseWrapMode()) {
        if (this.$wrap == -1)
          return "printMargin";
        if (!this.getWrapLimitRange().min)
          return "free";
        return this.$wrap;
      }
      return "off";
    },
    handlesSet: true
  },
  wrapMethod: {
    // code|text|auto
    set: function (val) {
      val = val == "auto"
        ? this.$mode.type != "text"
        : val != "text";
      if (val != this.$wrapAsCode) {
        this.$wrapAsCode = val;
        if (this.$useWrapMode) {
          this.$useWrapMode = false;
          this.setUseWrapMode(true);
        }
      }
    },
    initialValue: "auto"
  },
  indentedSoftWrap: {
    set: function () {
      if (this.$useWrapMode) {
        this.$useWrapMode = false;
        this.setUseWrapMode(true);
      }
    },
    initialValue: true
  },
  firstLineNumber: {
    set: function () { this._signal("changeBreakpoint"); },
    initialValue: 1
  },
  useWorker: {
    set: function (useWorker) {
      this.$useWorker = useWorker;

      this.$stopWorker();
      if (useWorker)
        this.$startWorker();
    },
    initialValue: true
  },
  useSoftTabs: { initialValue: true },
  tabSize: {
    set: function (tabSize) {
      tabSize = parseInt(tabSize);
      if (tabSize > 0 && this.$tabSize !== tabSize) {
        this.$modified = true;
        this.$rowLengthCache = [];
        this.$tabSize = tabSize;
        this._signal("changeTabSize");
      }
    },
    initialValue: 4,
    handlesSet: true
  },
  navigateWithinSoftTabs: { initialValue: false },
  foldStyle: {
    set: function (val) { this.setFoldStyle(val); },
    handlesSet: true
  },
  overwrite: {
    set: function (val) { this._signal("changeOverwrite"); },
    initialValue: false
  },
  newLineMode: {
    set: function (val) { this.doc.setNewLineMode(val); },
    get: function () { return this.doc.getNewLineMode(); },
    handlesSet: true
  },
  mode: {
    set: function (val) { this.setMode(val); },
    get: function () { return this.$modeId; },
    handlesSet: true
  }
});

export default EditSession;