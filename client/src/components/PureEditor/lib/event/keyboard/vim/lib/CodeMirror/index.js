import Pos from "../Pos";
import Marker from "./lib/Marker";
import SearchCursor from "./lib/SearchCursor";
import Range from "../../../../../../editor/tools/Range";
import SearchHighlight from "../../../../../../editor/tools/SearchHighlight";
import Mirror from "./lib/Mirror";
import VimKeyMap from "./lib/KeyMap/Vim";
import utils from "./utils";
import Vim from "../Vim";

const optMap = {
  indentWithTabs: "useSoftTabs",
  indentUnit: "tabSize",
  tabSize: "tabSize",
  firstLineNumber: "firstLineNumber",
  readOnly: "readOnly"
};

function hdom(n) {
  if (typeof n === 'string') n = document.createElement(n);
  for (var a, i = 1; i < arguments.length; i++) {
    if (!(a = arguments[i])) continue;
    if (typeof a !== 'object') a = document.createTextNode(a);
    if (a.nodeType) n.appendChild(a);
    else for (var key in a) {
      if (!Object.prototype.hasOwnProperty.call(a, key)) continue;
      if (key[0] === '$') n.style[key.slice(1)] = a[key];
      else n.setAttribute(key, a[key]);
    }
  }
  return n;
}

class CodeMirror extends Mirror {
  $uid = 0;
  state = {};
  marks = {};
  options = {};
  vimApi = new Vim();

  static keyMap = new VimKeyMap();

  constructor(ace) {
    super()
    this.ace = ace;

    this.onChange = this.onChange.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onBeforeEndOperation = this.onBeforeEndOperation.bind(this);
    this.ace.on('change', this.onChange);
    this.ace.on('changeSelection', this.onSelectionChange);
    this.ace.on('beforeEndOperation', this.onBeforeEndOperation);
  };

  getValue = function () {
    return this.ace.getValue();
  };

  setValue = function (v) {
    return this.ace.setValue(v, -1);
  };

  exist = function () {
    const vim = this.state.vim;
    if (moveHead !== false) {
      this.setCursor(this.clipCursorToContent(vim.sel.head));
    }
    this.updateLastSelection(vim);
    vim.visualMode = false;
    vim.visualLine = false;
    vim.visualBlock = false;
    if (!vim.insertMode) {
      CodeMirror.signal(cm, "vim-mode-change", { mode: "normal" });
    }
  };

  showConfirm(template) {
    const pre = hdom('span', {
      $color: 'red',
      $whiteSpace: 'pre',
      class: 'cm-vim-message'
    }, template);
    if (this.openNotification) {
      this.openNotification(pre, { bottom: true, duration: 5000 });
    } else {
      alert(pre.innerText);
    }
  }

  destroy = function () {
    this.ace.off('change', this.onChange);
    this.ace.off('changeSelection', this.onSelectionChange);
    this.ace.off('beforeEndOperation', this.onBeforeEndOperation);
    this.removeOverlay();
  };

  virtualSelectionMode = function () {
    return this.ace.inVirtualSelectionMode && this.ace.selection.index;
  };

  signal = function (eventName, e, handlers) {
    var listeners = handlers ? handlers[eventName + "Handlers"]
      : (this._eventRegistry || {})[eventName];
    if (!listeners)
      return;
    listeners = listeners.slice();
    for (var i = 0; i < listeners.length; i++)
      listeners[i](this, e);
  };

  foldCode = function (pos) {
    this.ace.session.$toggleFoldWidget(pos.line, {});
  };

  markText = function (cursor) {
    // only used for fat-cursor, not needed
    return { clear: function () { }, find: function () { } };
  };

  $updateMarkers = function (delta) {
    var isInsert = delta.action == "insert";
    var start = delta.start;
    var end = delta.end;
    var rowShift = (end.row - start.row) * (isInsert ? 1 : -1);
    var colShift = (end.column - start.column) * (isInsert ? 1 : -1);
    if (isInsert) end = start;

    for (var i in this.marks) {
      var point = this.marks[i];
      var cmp = Range.comparePoints(point, start);
      if (cmp < 0) {
        continue; // delta starts after the range
      }
      if (cmp === 0) {
        if (isInsert) {
          if (point.bias == 1) {
            cmp = 1;
          } else {
            point.bias = -1;
            continue;
          }
        }
      }
      var cmp2 = isInsert ? cmp : Range.comparePoints(point, end);
      if (cmp2 > 0) {
        point.row += rowShift;
        point.column += point.row == end.row ? colShift : 0;
        continue;
      }
      if (!isInsert && cmp2 <= 0) {
        point.row = start.row;
        point.column = start.column;
        if (cmp2 === 0)
          point.bias = 1;
      }
    }
  };

  setBookmark = function (cursor, options) {
    let bm = new Marker(this, this.$uid++, cursor.line, cursor.ch);
    if (!options || !options.insertLeft)
      bm.$insertRight = true;
    this.marks[bm.id] = bm;
    return bm;
  };

  moveH = function (increment, unit) {
    if (unit == 'char') {
      const sel = this.ace.selection;
      sel.clearSelection();
      sel.moveCursorBy(0, increment);
    }
  };

  findPosV = function (start, amount, unit, goalColumn) {
    if (unit == 'page') {
      var renderer = this.ace.renderer;
      var config = renderer.layerConfig;
      amount = amount * Math.floor(config.height / config.lineHeight);
      unit = 'line';
    }
    if (unit == 'line') {
      var screenPos = this.ace.session.documentToScreenPosition(start.line, start.ch);
      if (goalColumn != null)
        screenPos.column = goalColumn;
      screenPos.row += amount;
      // not what codemirror does but vim mode needs only this
      screenPos.row = Math.min(Math.max(0, screenPos.row), this.ace.session.getScreenLength() - 1);
      var pos = this.ace.session.screenToDocumentPosition(screenPos.row, screenPos.column);
      return Pos.toCmPos(pos);
    } else {
      debugger;
    }
  };

  charCoords = function (pos, mode) {
    if (mode == 'div' || !mode) {
      var sc = this.ace.session.documentToScreenPosition(pos.line, pos.ch);
      return { left: sc.column, top: sc.row };
    } if (mode == 'local') {
      var renderer = this.ace.renderer;
      var sc = this.ace.session.documentToScreenPosition(pos.line, pos.ch);
      var lh = renderer.layerConfig.lineHeight;
      var cw = renderer.layerConfig.characterWidth;
      var top = lh * sc.row;
      return { left: sc.column * cw, top: top, bottom: top + lh };
    }
  };

  coordsChar = function (pos, mode) {
    var renderer = this.ace.renderer;
    if (mode == 'local') {
      var row = Math.max(0, Math.floor(pos.top / renderer.lineHeight));
      var col = Math.max(0, Math.floor(pos.left / renderer.characterWidth));
      var ch = renderer.session.screenToDocumentPosition(row, col);
      return Pos.toCmPos(ch);
    } else if (mode == 'div') {
      throw "not implemented";
    }
  };

  getSearchCursor = function (query, pos, caseFold) {
    return new SearchCursor(query, pos, this);
  };

  scrollTo = function (x, y) {
    const renderer = this.ace.renderer;
    const config = renderer.layerConfig;
    const maxHeight = config.maxHeight - (renderer.$size.scrollerHeight - renderer.lineHeight) * renderer.$scrollPastEnd;
    if (y != null) {
      this.ace.session.setScrollTop(Math.max(0, Math.min(y, maxHeight)));
    }
    if (x != null) {
      this.ace.session.setScrollLeft(Math.max(0, Math.min(x, config.width)));
    }
  };

  scrollInfo = function () {
    return 0;
  };

  scrollIntoView = function (pos, margin) {
    if (pos) {
      const renderer = this.ace.renderer;
      let viewMargin = { "top": 0, "bottom": margin };
      renderer.scrollCursorIntoView(
        Pos.toAcePos(pos),
        (renderer.lineHeight * 2) / renderer.$size.scrollerHeight,
        viewMargin
      );
    }
  };

  setOption = function (name, val) {
    this.state[name] = val;
    switch (name) {
      case 'indentWithTabs':
        name = optMap[name];
        val = !val;
        break;
      case 'keyMap':
        this.state.$keyMap = val;
        return;
        break;
      default:
        name = optMap[name];
    }
    if (name)
      this.ace.setOption(name, val);
  };

  getOption = function (name) {
    let val;
    let aceOpt = optMap[name];
    if (aceOpt)
      val = this.ace.getOption(aceOpt);
    switch (name) {
      case 'indentWithTabs':
        name = optMap[name];
        return !val;
      case 'keyMap':
        return this.state.$keyMap || 'vim';
    }
    return aceOpt ? val : this.state[name];
  };

  toggleOverwrite = function (on) {
    this.state.overwrite = on;
    return this.ace.setOverwrite(on);
  };

  addOverlay = function (o) {
    if (!this.$searchHighlight || !this.$searchHighlight.session) {
      const highlight = new SearchHighlight(null, "ace_highlight-marker", "text");
      const marker = this.ace.session.addDynamicMarker(highlight);
      highlight.id = marker.id;
      highlight.session = this.ace.session;
      highlight.destroy = function (o) {
        highlight.session.off("change", highlight.updateOnChange);
        highlight.session.off("changeEditor", highlight.destroy);
        highlight.session.removeMarker(highlight.id);
        highlight.session = null;
      };
      highlight.updateOnChange = function (delta) {
        var row = delta.start.row;
        if (row == delta.end.row) highlight.cache[row] = undefined;
        else highlight.cache.splice(row, highlight.cache.length);
      };
      highlight.session.on("changeEditor", highlight.destroy);
      highlight.session.on("change", highlight.updateOnChange);
    }
    const re = new RegExp(o.query.source, "gmi");
    this.$searchHighlight = o.highlight = highlight;
    this.$searchHighlight.setRegexp(re);
    this.ace.renderer.updateBackMarkers();
  };

  removeOverlay = function (o) {
    if (this.$searchHighlight && this.$searchHighlight.session) {
      this.$searchHighlight.destroy();
    }
  };

  getScrollInfo = function () {
    const renderer = this.ace.renderer;
    const config = renderer.layerConfig;
    return {
      left: renderer.scrollLeft,
      top: renderer.scrollTop,
      height: config.maxHeight,
      width: config.width,
      clientHeight: config.height,
      clientWidth: config.width
    };
  };

  getTokenTypeAt = function (pos) {
    const token = this.ace.session.getTokenAt(pos.line, pos.ch);
    return token && /comment|string/.test(token.type) ? "string" : "";
  };

  findMatchingBracket = function (pos) {
    const m = this.ace.session.findMatchingBracket(toAcePos(pos));
    return { to: m && toCmPos(m) };
  };

  indentLine = function (line, method) {
    if (method === true) {
      this.ace.session.indentRows(line, line, "\t");
    } else if (method === false) {
      this.ace.session.outdentRows(new Range(line, 0, line, 0));
    }
  };

  indexFromPos = function (pos) {
    return this.ace.session.doc.positionToIndex(toAcePos(pos));
  };

  posFromIndex = function (index) {
    return toCmPos(this.ace.session.doc.indexToPosition(index));
  };

  defaultTextHeight = function (index) {
    return this.ace.renderer.layerConfig.lineHeight;
  };

  scanForBracket = function (pos, dir, _, options) {
    var re = options.bracketRegex.source;
    var tokenRe = /paren|text|operator|tag/;
    if (dir == 1) {
      var m = this.ace.session.$findClosingBracket(re.slice(1, 2), toAcePos(pos), tokenRe);
    } else {
      var m = this.ace.session.$findOpeningBracket(re.slice(-2, -1), { row: pos.line, column: pos.ch + 1 }, tokenRe);
    }
    return m && { pos: toCmPos(m) };
  };

  refresh = function () {
    return this.ace.resize(true);
  };

  getMode = function () {
    return { name: this.getOption("mode") };
  };

  execCommand = function (name) {
    if (name == "indentAuto") this.ace.execCommand("autoindent");
    else console.log(name + " is not implemented");
  };

  transformCursor(range) {
    var vim = this.state.vim;
    if (!vim || vim.insertMode) return range.head;
    var head = vim.sel.head;
    if (!head) return range.head;

    if (vim.visualBlock) {
      if (range.head.line != head.line) {
        return;
      }
    }
    if (range.from() == range.anchor && !range.empty()) {
      if (range.head.line == head.line && range.head.ch != head.ch)
        return new Pos(range.head.line, range.head.ch - 1);
    }

    return range.head;
  };

  handleExternalSelection(vim, keepHPos) {
    var anchor = this.getCursor('anchor');
    var head = this.getCursor('head');
    // Enter or exit visual mode to match mouse selection.
    if (vim.visualMode && !cm.somethingSelected()) {
      this.exitVisualMode(false);
    } else if (!vim.visualMode && !vim.insertMode && this.somethingSelected()) {
      vim.visualMode = true;
      vim.visualLine = false;
      CodeMirror.signal(cm, "vim-mode-change", { mode: "visual" });
    }
    if (vim.visualMode) {
      // Bind CodeMirror selection model to vim selection model.
      // Mouse selections are considered visual characterwise.
      var headOffset = !Pos.cursorIsBefore(head, anchor) ? -1 : 0;
      var anchorOffset = Pos.cursorIsBefore(head, anchor) ? -1 : 0;
      head = offsetCursor(head, 0, headOffset);
      anchor = offsetCursor(anchor, 0, anchorOffset);
      vim.sel = {
        anchor: anchor,
        head: head
      };
      this.updateMark(vim, '<', cursorMin(head, anchor));
      this.updateMark(vim, '>', cursorMax(head, anchor));
    } else if (!vim.insertMode && !keepHPos) {
      // Reset lastHPos if selection was modified by something outside of vim mode e.g. by mouse.
      vim.lastHPos = this.getCursor().ch;
    }
  };

  onCursorActivity() {
    let vim = this.state.vim;
    if (vim.insertMode) {
      // Tracking cursor activity in insert mode (for macro support).
      var macroModeState = this.vimApi.state.macroModeState;
      if (macroModeState.isPlaying) { return; }
      var lastChange = macroModeState.lastInsertModeChanges;
      if (lastChange.expectCursorActivityForChange) {
        lastChange.expectCursorActivityForChange = false;
      } else {
        // Cursor moved outside the context of an edit. Reset the change.
        lastChange.maybeReset = true;
      }
    } else if (!this.curOp.isVimOp) {
      this.handleExternalSelection(vim);
    }
  };

  getOnPasteFn() {
    const _self = this;
    let vim = this.state.vim;
    if (!vim.onPasteFn) {
      vim.onPasteFn = function () {
        if (!vim.insertMode) {
          _self.setCursor(offsetCursor(_self.getCursor(), 0, 1));
          _self.enterInsertMode({}, vim);
        }
      };
    }
    return vim.onPasteFn;
  };

};

for (let key in utils) {
  CodeMirror.prototype[key] = utils[key];
}

export default CodeMirror;