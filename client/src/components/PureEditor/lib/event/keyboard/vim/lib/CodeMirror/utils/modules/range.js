import Range from "../../../../../../../../editor/tools/Range";
import Pos from "../../../Pos";

function toAcePos(cmPos) {
  return { row: cmPos.line, column: cmPos.ch };
}

export default {

  getLine(row) {
    return this.ace.session.getLine(row)
  },

  getRange(s, e) {
    const range = new Range(s.line, s.ch, e.line, e.ch)
    return this.ace.session.getTextRange(range);
  },

  replaceRange(text, s, e) {
    if (!e) {
      e = s;
    }
    const range = new Range(s.line, s.ch, e.line, e.ch);
    this.ace.session.$clipRangeToDocument(range);
    return this.ace.session.replace(range, text);
  },

  replaceSelection(p) {
    const sel = this.ace.selection;
    if (this.ace.inVirtualSelectionMode) {
      this.ace.session.replace(sel.getRange(), p[0] || "");
      return;
    }
    sel.inVirtualSelectionMode = true;

    const ranges = sel.rangeList.ranges;
    if (!ranges.length) {
      ranges = [this.ace.multiSelect.getRange()];
    }
    for (let i = ranges.length; i--;) {
      this.ace.session.replace(ranges[i], p[i] || "");
    }

    sel.inVirtualSelectionMode = false;
  },

  replaceSelections() {
    this.replaceSelection(...arguments);
  },

  updateCmSelection(sel, mode) {
    var vim = this.state.vim;
    sel = sel || vim.sel;
    var mode = mode ||
      vim.visualLine ? 'line' : vim.visualBlock ? 'block' : 'char';
    var cmSel = this.makeCmSelection(sel, mode);
    this.setSelections(cmSel.ranges, cmSel.primary);
  },

  makeCmSelection(sel, mode, exclusive) {
    let head = Pos.copyCursor(sel.head);
    let anchor = Pos.copyCursor(sel.anchor);
    if (mode == 'char') {
      var headOffset = !exclusive && !Pos.cursorIsBefore(sel.head, sel.anchor) ? 1 : 0;
      var anchorOffset = Pos.cursorIsBefore(sel.head, sel.anchor) ? 1 : 0;
      head = Pos.offsetCursor(sel.head, 0, headOffset);
      anchor = Pos.offsetCursor(sel.anchor, 0, anchorOffset);
      return {
        ranges: [{ anchor: anchor, head: head }],
        primary: 0
      };
    } else if (mode == 'line') {
      if (!Pos.cursorIsBefore(sel.head, sel.anchor)) {
        anchor.ch = 0;

        var lastLine = this.lastLine();
        if (head.line > lastLine) {
          head.line = lastLine;
        }
        head.ch = this.lineLength(head.line);
      } else {
        head.ch = 0;
        anchor.ch = this.lineLength(anchor.line);
      }
      return {
        ranges: [{ anchor: anchor, head: head }],
        primary: 0
      };
    } else if (mode == 'block') {
      var top = Math.min(anchor.line, head.line),
        fromCh = anchor.ch,
        bottom = Math.max(anchor.line, head.line),
        toCh = head.ch;
      if (fromCh < toCh) { toCh += 1 }
      else { fromCh += 1 };
      var height = bottom - top + 1;
      var primary = head.line == top ? 0 : height - 1;
      var ranges = [];
      for (var i = 0; i < height; i++) {
        ranges.push({
          anchor: new Pos(top + i, fromCh),
          head: new Pos(top + i, toCh)
        });
      }
      return {
        ranges: ranges,
        primary: primary
      };
    }
  },

  getSelection() {
    return this.ace.getSelectedText();
  },

  getSelections() {
    return this.listSelections().map(function (x) {
      return this.getRange(x.anchor, x.head);
    }, this);
  },

  getInputField() {
    return this.ace.textInput.getElement();
  },

  getWrapperElement() {
    return this.ace.container;
  },

  getLineNumber(handle) {
    return handle.row;
  },

  getLineHandle(row) {
    return {
      text: this.ace.session.getLine(row),
      row
    };
  },

  setSelections(p, primIndex) {
    var sel = this.ace.multiSelect;
    var ranges = p.map(function (x) {
      var anchor = toAcePos(x.anchor);
      var head = toAcePos(x.head);
      var r = Range.comparePoints(anchor, head) < 0
        ? new Range.fromPoints(anchor, head)
        : new Range.fromPoints(head, anchor);
      r.cursor = Range.comparePoints(r.start, head) ? r.end : r.start;
      return r;
    });

    if (this.ace.inVirtualSelectionMode) {
      this.ace.selection.fromOrientedRange(ranges[0]);
      return;
    }
    if (!primIndex) {
      ranges = ranges.reverse();
    } else if (ranges[primIndex]) {
      ranges.push(ranges.splice(primIndex, 1)[0]);
    }
    sel.toSingleRange(ranges[0].clone());
    var session = this.ace.session;
    for (var i = 0; i < ranges.length; i++) {
      var range = session.$clipRangeToDocument(ranges[i]); // todo why ace doesn't do this?
      sel.addRange(range);
    }
  },

  setSelection(a, h, options) {
    var sel = this.ace.selection;
    sel.moveTo(a.line, a.ch);
    sel.selectTo(h.line, h.ch);
    if (options && options.origin == '*mouse') {
      this.onBeforeEndOperation();
    }
  },

  setCursor(line, ch) {
    if (typeof line === 'object') {
      ch = line.ch;
      line = line.line;
    }
    var shouldScroll = !this.curOp && !this.ace.inVirtualSelectionMode;
    if (!this.ace.inVirtualSelectionMode) {
      console.log(this.ace)
      this.ace.exitMultiSelectMode();
    }
    this.ace.session.unfold({ row: line, column: ch });
    this.ace.selection.moveTo(line, ch);
    if (shouldScroll) {
      this.ace.renderer.scrollCursorIntoView();
      this.ace.endOperation();
    }
  },

  getCursor(p) {
    var sel = this.ace.selection;
    var pos = p == 'anchor' ? (sel.isEmpty() ? sel.lead : sel.anchor) :
      p == 'head' || !p ? sel.lead : sel.getRange()[p];
    return Pos.toCmPos(pos);
  },

  listSelections(p) {
    var ranges = this.ace.multiSelect.rangeList.ranges;
    // var ranges = this.ace.selection.rangeList.ranges;
    if (!ranges.length || this.ace.inVirtualSelectionMode)
      return [{ anchor: this.getCursor('anchor'), head: this.getCursor('head') }];
    return ranges.map(function (r) {
      return {
        anchor: this.clipPos(Pos.toCmPos(r.cursor == r.end ? r.start : r.end)),
        head: this.clipPos(Pos.toCmPos(r.cursor))
      };
    }, this);
  },

  clipCursorToContent(cur) {
    const vim = this.state.vim;
    const includeLineBreak = vim.insertMode || vim.visualMode;
    const line = Math.min(Math.max(this.firstLine(), cur.line), this.lastLine());
    const maxCh = this.lineLength(line) - 1 + !!includeLineBreak;
    const ch = Math.min(Math.max(0, cur.ch), maxCh);
    return new Pos(line, ch);
  },

  updateLastSelection(vim) {
    const anchor = vim.sel.anchor;
    let head = vim.sel.head;
    // To accommodate the effect of lastPastedText in the last selection
    if (vim.lastPastedText) {
      head = this.posFromIndex(this.indexFromPos(anchor) + vim.lastPastedText.length);
      vim.lastPastedText = null;
    }
    vim.lastSelection = {
      'anchorMark': this.setBookmark(anchor),
      'headMark': this.setBookmark(head),
      'anchor': Pos.copyCursor(anchor),
      'head': Pos.copyCursor(head),
      'visualMode': vim.visualMode,
      'visualLine': vim.visualLine,
      'visualBlock': vim.visualBlock
    };
  },

  lineLength(lineNum) {
    return this.getLine(lineNum).length;
  },

  firstLine() {
    return 0;
  },

  lastLine() {
    return this.ace.session.getLength() - 1;
  },

  lineCount() {
    return this.ace.session.getLength();
  },

  somethingSelected(p) {
    return !this.ace.selection.isEmpty();
  },

  clipPos(p) {
    var pos = this.ace.session.$clipPositionToDocument(p.line, p.ch);
    return Pos.toCmPos(pos);
  },
}