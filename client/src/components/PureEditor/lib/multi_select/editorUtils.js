import Range from "../../editor/tools/Range";
import Selection from "../../editor/tools/Selection";
import { keyboardHandler } from "../commands/multi_select_commands";
import Search from "../../editor/tools/Search";
import lang from "../utils/lang";

const search = new Search();

function find(session, needle, dir) {
  search.$options.wrap = true;
  search.$options.needle = needle;
  search.$options.backwards = dir == -1;
  return search.find(session);
}

export const updateSelectionMarkers = function () {
  this.renderer.updateCursor();
  this.renderer.updateBackMarkers();
};

export const addSelectionMarker = function (orientedRange) {
  if (!orientedRange.cursor)
    orientedRange.cursor = orientedRange.end;

  var style = this.getSelectionStyle();
  orientedRange.marker = this.session.addMarker(orientedRange, "ace_selection", style);

  this.session.$selectionMarkers.push(orientedRange);
  this.session.selectionMarkerCount = this.session.$selectionMarkers.length;
  return orientedRange;
};

export const removeSelectionMarker = function (range) {
  if (!range.marker)
    return;
  this.session.removeMarker(range.marker);
  var index = this.session.$selectionMarkers.indexOf(range);
  if (index != -1)
    this.session.$selectionMarkers.splice(index, 1);
  this.session.selectionMarkerCount = this.session.$selectionMarkers.length;
};

export const removeSelectionMarkers = function (ranges) {
  var markerList = this.session.$selectionMarkers;
  for (var i = ranges.length; i--;) {
    var range = ranges[i];
    if (!range.marker)
      continue;
    this.session.removeMarker(range.marker);
    var index = markerList.indexOf(range);
    if (index != -1)
      markerList.splice(index, 1);
  }
  this.session.selectionMarkerCount = markerList.length;
};

export const $onAddRange = function (e) {
  this.addSelectionMarker(e.range);
  this.renderer.updateCursor();
  this.renderer.updateBackMarkers();
};

export const $onRemoveRange = function (e) {
  this.removeSelectionMarkers(e.ranges);
  this.renderer.updateCursor();
  this.renderer.updateBackMarkers();
};

export const $onMultiSelect = function (e) {
  if (this.inMultiSelectMode)
    return;
  this.inMultiSelectMode = true;

  this.setStyle("ace_multiselect");
  this.keyBinding.addKeyboardHandler(keyboardHandler);
  this.commands.setDefaultHandler("exec", this.$onMultiSelectExec);

  this.renderer.updateCursor();
  this.renderer.updateBackMarkers();
};

export const $onSingleSelect = function (e) {
  if (this.session.multiSelect.inVirtualMode)
    return;
  this.inMultiSelectMode = false;

  this.unsetStyle("ace_multiselect");
  this.keyBinding.removeKeyboardHandler(keyboardHandler);

  this.commands.removeDefaultHandler("exec", this.$onMultiSelectExec);
  this.renderer.updateCursor();
  this.renderer.updateBackMarkers();
  this._emit("changeSelection");
};

export const $onMultiSelectExec = function (e) {
  var command = e.command;
  var editor = e.editor;
  if (!editor.multiSelect)
    return;
  if (!command.multiSelectAction) {
    var result = command.exec(editor, e.args || {});
    editor.multiSelect.addRange(editor.multiSelect.toOrientedRange());
    editor.multiSelect.mergeOverlappingRanges();
  } else if (command.multiSelectAction == "forEach") {
    result = editor.forEachSelection(command, e.args);
  } else if (command.multiSelectAction == "forEachLine") {
    result = editor.forEachSelection(command, e.args, true);
  } else if (command.multiSelectAction == "single") {
    editor.exitMultiSelectMode();
    result = command.exec(editor, e.args || {});
  } else {
    result = command.multiSelectAction(editor, e.args || {});
  }
  return result;
};

export const forEachSelection = function (cmd, args, options) {
  if (this.inVirtualSelectionMode)
    return;
  var keepOrder = options && options.keepOrder;
  var $byLines = options == true || options && options.$byLines;
  var session = this.session;
  var selection = this.selection;
  var rangeList = selection.rangeList;
  var ranges = (keepOrder ? selection : rangeList).ranges;
  var result;

  if (!ranges.length)
    return cmd.exec ? cmd.exec(this, args || {}) : cmd(this, args || {});

  var reg = selection._eventRegistry;
  selection._eventRegistry = {};

  var tmpSel = new Selection(session);
  this.inVirtualSelectionMode = true;
  for (var i = ranges.length; i--;) {
    if ($byLines) {
      while (i > 0 && ranges[i].start.row == ranges[i - 1].end.row)
        i--;
    }
    tmpSel.fromOrientedRange(ranges[i]);
    tmpSel.index = i;
    this.selection = session.selection = tmpSel;
    var cmdResult = cmd.exec ? cmd.exec(this, args || {}) : cmd(this, args || {});
    if (!result && cmdResult !== undefined)
      result = cmdResult;
    tmpSel.toOrientedRange(ranges[i]);
  }
  tmpSel.detach();

  this.selection = session.selection = selection;
  this.inVirtualSelectionMode = false;
  selection._eventRegistry = reg;
  selection.mergeOverlappingRanges();
  if (selection.ranges[0])
    selection.fromOrientedRange(selection.ranges[0]);

  var anim = this.renderer.$scrollAnimation;
  this.onCursorChange();
  this.onSelectionChange();
  if (anim && anim.from == anim.to)
    this.renderer.animateScrolling(anim.from);

  return result;
};

export const exitMultiSelectMode = function () {
  if (!this.inMultiSelectMode || this.inVirtualSelectionMode)
    return;
  this.multiSelect.toSingleRange();
};

export const getSelectedText = function () {
  var text = "";
  if (this.inMultiSelectMode && !this.inVirtualSelectionMode) {
    var ranges = this.multiSelect.rangeList.ranges;
    var buf = [];
    for (var i = 0; i < ranges.length; i++) {
      buf.push(this.session.getTextRange(ranges[i]));
    }
    var nl = this.session.getDocument().getNewLineCharacter();
    text = buf.join(nl);
    if (text.length == (buf.length - 1) * nl.length)
      text = "";
  } else if (!this.selection.isEmpty()) {
    text = this.session.getTextRange(this.getSelectionRange());
  }
  return text;
};

export const $checkMultiselectChange = function (e, anchor) {
  if (this.inMultiSelectMode && !this.inVirtualSelectionMode) {
    var range = this.multiSelect.ranges[0];
    if (this.multiSelect.isEmpty() && anchor == this.multiSelect.anchor)
      return;
    var pos = anchor == this.multiSelect.anchor
      ? range.cursor == range.start ? range.end : range.start
      : range.cursor;
    if (pos.row != anchor.row
      || this.session.$clipPositionToDocument(pos.row, pos.column).column != anchor.column)
      this.multiSelect.toSingleRange(this.multiSelect.toOrientedRange());
    else
      this.multiSelect.mergeOverlappingRanges();
  }
};

export const findAll = function (needle, options, additive) {
  options = options || {};
  options.needle = needle || options.needle;
  if (options.needle == undefined) {
    var range = this.selection.isEmpty()
      ? this.selection.getWordRange()
      : this.selection.getRange();
    options.needle = this.session.getTextRange(range);
  }
  this.$search.set(options);

  var ranges = this.$search.findAll(this.session);
  if (!ranges.length)
    return 0;

  var selection = this.multiSelect;

  if (!additive)
    selection.toSingleRange(ranges[0]);

  for (var i = ranges.length; i--;)
    selection.addRange(ranges[i], true);

  // keep old selection as primary if possible
  if (range && selection.rangeList.rangeAtPoint(range.start))
    selection.addRange(range, true);

  return ranges.length;
};

export const selectMoreLines = function (dir, skip) {
  var range = this.selection.toOrientedRange();
  var isBackwards = range.cursor == range.end;

  var screenLead = this.session.documentToScreenPosition(range.cursor);
  if (this.selection.$desiredColumn)
    screenLead.column = this.selection.$desiredColumn;

  var lead = this.session.screenToDocumentPosition(screenLead.row + dir, screenLead.column);

  if (!range.isEmpty()) {
    var screenAnchor = this.session.documentToScreenPosition(isBackwards ? range.end : range.start);
    var anchor = this.session.screenToDocumentPosition(screenAnchor.row + dir, screenAnchor.column);
  } else {
    var anchor = lead;
  }

  if (isBackwards) {
    var newRange = Range.fromPoints(lead, anchor);
    newRange.cursor = newRange.start;
  } else {
    var newRange = Range.fromPoints(anchor, lead);
    newRange.cursor = newRange.end;
  }

  newRange.desiredColumn = screenLead.column;
  if (!this.selection.inMultiSelectMode) {
    this.selection.addRange(range);
  } else {
    if (skip)
      var toRemove = range.cursor;
  }

  this.selection.addRange(newRange);
  if (toRemove)
    this.selection.substractPoint(toRemove);
};

export const transposeSelections = function (dir) {
  var session = this.session;
  var sel = session.multiSelect;
  var all = sel.ranges;

  for (var i = all.length; i--;) {
    var range = all[i];
    if (range.isEmpty()) {
      var tmp = session.getWordRange(range.start.row, range.start.column);
      range.start.row = tmp.start.row;
      range.start.column = tmp.start.column;
      range.end.row = tmp.end.row;
      range.end.column = tmp.end.column;
    }
  }
  sel.mergeOverlappingRanges();

  var words = [];
  for (var i = all.length; i--;) {
    var range = all[i];
    words.unshift(session.getTextRange(range));
  }

  if (dir < 0)
    words.unshift(words.pop());
  else
    words.push(words.shift());

  for (var i = all.length; i--;) {
    var range = all[i];
    var tmp = range.clone();
    session.replace(range, words[i]);
    range.start.row = tmp.start.row;
    range.start.column = tmp.start.column;
  }
  sel.fromOrientedRange(sel.ranges[0]);
};

export const selectMore = function (dir, skip, stopAtFirst) {
  var session = this.session;
  var sel = session.multiSelect;

  var range = sel.toOrientedRange();
  if (range.isEmpty()) {
    range = session.getWordRange(range.start.row, range.start.column);
    range.cursor = dir == -1 ? range.start : range.end;
    this.multiSelect.addRange(range);
    if (stopAtFirst)
      return;
  }
  var needle = session.getTextRange(range);

  var newRange = find(session, needle, dir);
  if (newRange) {
    newRange.cursor = dir == -1 ? newRange.start : newRange.end;
    this.session.unfold(newRange);
    this.multiSelect.addRange(newRange);
    this.renderer.scrollCursorIntoView(null, 0.5);
  }
  if (skip)
    this.multiSelect.substractPoint(range.cursor);
};

export const alignCursors = function () {
  var session = this.session;
  var sel = session.multiSelect;
  var ranges = sel.ranges;
  // filter out ranges on same row
  var row = -1;
  var sameRowRanges = ranges.filter(function (r) {
    if (r.cursor.row == row)
      return true;
    row = r.cursor.row;
  });

  if (!ranges.length || sameRowRanges.length == ranges.length - 1) {
    var range = this.selection.getRange();
    var fr = range.start.row, lr = range.end.row;
    var guessRange = fr == lr;
    if (guessRange) {
      var max = this.session.getLength();
      var line;
      do {
        line = this.session.getLine(lr);
      } while (/[=:]/.test(line) && ++lr < max);
      do {
        line = this.session.getLine(fr);
      } while (/[=:]/.test(line) && --fr > 0);

      if (fr < 0) fr = 0;
      if (lr >= max) lr = max - 1;
    }
    var lines = this.session.removeFullLines(fr, lr);
    lines = this.$reAlignText(lines, guessRange);
    this.session.insert({ row: fr, column: 0 }, lines.join("\n") + "\n");
    if (!guessRange) {
      range.start.column = 0;
      range.end.column = lines[lines.length - 1].length;
    }
    this.selection.setRange(range);
  } else {
    sameRowRanges.forEach(function (r) {
      sel.substractPoint(r.cursor);
    });

    var maxCol = 0;
    var minSpace = Infinity;
    var spaceOffsets = ranges.map(function (r) {
      var p = r.cursor;
      var line = session.getLine(p.row);
      var spaceOffset = line.substr(p.column).search(/\S/g);
      if (spaceOffset == -1)
        spaceOffset = 0;

      if (p.column > maxCol)
        maxCol = p.column;
      if (spaceOffset < minSpace)
        minSpace = spaceOffset;
      return spaceOffset;
    });
    ranges.forEach(function (r, i) {
      var p = r.cursor;
      var l = maxCol - p.column;
      var d = spaceOffsets[i] - minSpace;
      if (l > d)
        session.insert(p, lang.stringRepeat(" ", l - d));
      else
        session.remove(new Range(p.row, p.column, p.row, p.column - l + d));

      r.start.column = r.end.column = maxCol;
      r.start.row = r.end.row = p.row;
      r.cursor = r.end;
    });
    sel.fromOrientedRange(ranges[0]);
    this.renderer.updateCursor();
    this.renderer.updateBackMarkers();
  }
};

export const $reAlignText = function (lines, forceLeft) {
  var isLeftAligned = true, isRightAligned = true;
  var startW, textW, endW;

  return lines.map(function (line) {
    var m = line.match(/(\s*)(.*?)(\s*)([=:].*)/);
    if (!m)
      return [line];

    if (startW == null) {
      startW = m[1].length;
      textW = m[2].length;
      endW = m[3].length;
      return m;
    }

    if (startW + textW + endW != m[1].length + m[2].length + m[3].length)
      isRightAligned = false;
    if (startW != m[1].length)
      isLeftAligned = false;

    if (startW > m[1].length)
      startW = m[1].length;
    if (textW < m[2].length)
      textW = m[2].length;
    if (endW > m[3].length)
      endW = m[3].length;

    return m;
  }).map(forceLeft ? alignLeft :
    isLeftAligned ? isRightAligned ? alignRight : alignLeft : unAlign);

  function spaces(n) {
    return lang.stringRepeat(" ", n);
  }

  function alignLeft(m) {
    return !m[2] ? m[0] : spaces(startW) + m[2]
      + spaces(textW - m[2].length + endW)
      + m[4].replace(/^([=:])\s+/, "$1 ");
  }
  function alignRight(m) {
    return !m[2] ? m[0] : spaces(startW + textW - m[2].length) + m[2]
      + spaces(endW)
      + m[4].replace(/^([=:])\s+/, "$1 ");
  }
  function unAlign(m) {
    return !m[2] ? m[0] : spaces(startW) + m[2]
      + spaces(endW)
      + m[4].replace(/^([=:])\s+/, "$1 ");
  }
};