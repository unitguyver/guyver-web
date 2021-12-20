import event from "../../../../../event";
import EventEmitter from "../../../../../EventEmitter";
import Pos from "../../Pos";
import TextMode from "../../../../../../../mode/rules/text";
import Keys from "../../../../../../utils/Keys";

const keys = new Keys();
const TextModeTokenRe = TextMode.prototype.tokenRe;

@EventEmitter
export default class Mirror {
  static on = event.addListener;
  static off = event.removeListener;
  static Pos = Pos;
  static commands = {
    redo: function (cm) {
      cm.ace.redo();
    },
    undo: function (cm) {
      cm.ace.undo();
    },
    newlineAndIndent: function (cm) {
      cm.ace.insert("\n");
    }
  };

  constructor() {

  };

  static defineExtension = function (name, fn) {
    Mirror.prototype[name] = fn;
  };

  static defineOption = function (name, val, setter) {
    //
  };

  static keyName = function (e) {
    let key = (keys[e.keyCode] || e.key || "");
    if (key.length == 1) {
      key = key.toUpperCase()
    }

    return event.getModifierString(e).replace(/(^|-)\w/g, function (m) {
      return m.toUpperCase();
    }) + key;
  };

  static addClass = function () {
    //
  };

  static rmClass = function () {
    //
  };

  static e_stop = Mirror.e_preventDefault = event.stopEvent;

  static lookupKey = function lookupKey(key, map, handle) {
    if (!map) {
      map = "default";
    };
    if (typeof map == "string") {
      map = Mirror.keyMap[map];
    }

    const found = typeof map == "function" ? map(key) : map[key];
    if (found === false) {
      return "nothing"
    } else if (found === "...") {
      return "multi";
    } else if (found != null && handle(found)) {
      return "handled";
    }

    if (map.fallthrough) {
      if (!Array.isArray(map.fallthrough))
        return lookupKey(key, map.fallthrough, handle);
      for (var i = 0; i < map.fallthrough.length; i++) {
        var result = lookupKey(key, map.fallthrough[i], handle);
        if (result) return result;
      }
    }
  };

  static findMatchingTag = function (cm, head) {
    //
  };

  static signal = function (o, name, e) {
    return o._signal(name, e)
  };

  static isWordChar = function (ch) {
    if (ch < "\x7f") {
      return /^\w$/.test(ch);
    }
    TextModeTokenRe.lastIndex = 0;
    return TextModeTokenRe.test(ch);
  };

  onChange = function (delta) {
    var change = { text: delta.action[0] == 'i' ? delta.lines : [] };
    var curOp = this.curOp = this.curOp || {};
    if (!curOp.changeHandlers)
      curOp.changeHandlers = this._eventRegistry["change"] && this._eventRegistry["change"].slice();
    if (!curOp.lastChange) {
      curOp.lastChange = curOp.change = change;
    } else {
      curOp.lastChange.next = curOp.lastChange = change;
    }
    this.$updateMarkers(delta);
  };

  onSelectionChange = function () {
    var curOp = this.curOp = this.curOp || {};
    if (!curOp.cursorActivityHandlers)
      curOp.cursorActivityHandlers = this._eventRegistry["cursorActivity"] && this._eventRegistry["cursorActivity"].slice();
    this.curOp.cursorActivity = true;
    if (this.ace.inMultiSelectMode) {
      this.ace.keyBinding.removeKeyboardHandler(keyboardHandler);
    }
  };

  operation = function (fn, force) {
    if (!force && this.curOp || force && this.curOp && this.curOp.force) {
      return fn();
    }
    if (force || !this.ace.curOp) {
      if (this.curOp)
        this.onBeforeEndOperation();
    }
    if (!this.ace.curOp) {
      var prevOp = this.ace.prevOp;
      this.ace.startOperation({
        command: { name: "vim", scrollIntoView: "cursor" }
      });
    }
    var curOp = this.curOp = this.curOp || {};
    this.curOp.force = force;
    var result = fn();
    if (this.ace.curOp && this.ace.curOp.command.name == "vim") {
      if (this.state.dialog)
        this.ace.curOp.command.scrollIntoView = false;
      this.ace.endOperation();
      if (!curOp.cursorActivity && !curOp.lastChange && prevOp)
        this.ace.prevOp = prevOp;
    }
    if (force || !this.ace.curOp) {
      if (this.curOp)
        this.onBeforeEndOperation();
    }
    return result;
  };

  onBeforeEndOperation = function () {
    var op = this.curOp;
    if (op) {
      if (op.change) { this.signal("change", op.change, op); }
      if (op && op.cursorActivity) { this.signal("cursorActivity", null, op); }
      this.curOp = null;
    }
  };
}