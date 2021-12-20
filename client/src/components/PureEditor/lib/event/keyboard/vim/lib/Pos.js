

export default class Pos {

  constructor(line, ch) {
    this.line = line; this.ch = ch;
  };

  static toCmPos = function (acePos) {
    return new Pos(acePos.row, acePos.column);
  };

  static toAcePos = function (cmPos) {
    return { row: cmPos.line, column: cmPos.ch };
  };

  static getLastEditPos = function (cm) {
    const undoManager = cm.ace.session.$undoManager;
    if (undoManager && undoManager.$lastDelta) {
      return Pos.toCmPos(undoManager.$lastDelta.end);
    }
  };

  static offsetCursor(cur, offsetLine, offsetCh) {
    if (typeof offsetLine === 'object') {
      offsetCh = offsetLine.ch;
      offsetLine = offsetLine.line;
    }
    return new Pos(cur.line + offsetLine, cur.ch + offsetCh);
  };

  static cursorIsBefore(cur1, cur2) {
    if (cur1.line < cur2.line) {
      return true;
    }
    if (cur1.line == cur2.line && cur1.ch < cur2.ch) {
      return true;
    }
    return false;
  };

  static getMarkPos = function (cm, vim, markName) {
    if (markName == '\'' || markName == '`') {
      return vimGlobalState.jumpList.find(cm, -1) || new Pos(0, 0);
    } else if (markName == '.') {
      return Pos.getLastEditPos(cm);
    }

    const mark = vim.marks[markName];
    return mark && mark.find();
  };

  static copyCursor(cur) {
    return new Pos(cur.line, cur.ch);
  };

  static cursorEqual(cur1, cur2) {
    return cur1.ch == cur2.ch && cur1.line == cur2.line;
  }
}