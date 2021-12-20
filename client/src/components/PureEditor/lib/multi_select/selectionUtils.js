import Range from "../../editor/tools/Range";
import RangeList from "../../editor/tools/RangeList";

function isSamePoint(p1, p2) {
  return p1.row == p2.row && p1.column == p2.column;
}

export const ranges = null;
export const rangeList = null;

export const addRange = function (range, $blockChangeEvents) {
  if (!range)
    return;

  if (!this.inMultiSelectMode && this.rangeCount === 0) {
    var oldRange = this.toOrientedRange();
    this.rangeList.add(oldRange);
    this.rangeList.add(range);
    if (this.rangeList.ranges.length != 2) {
      this.rangeList.removeAll();
      return $blockChangeEvents || this.fromOrientedRange(range);
    }
    this.rangeList.removeAll();
    this.rangeList.add(oldRange);
    this.$onAddRange(oldRange);
  }

  if (!range.cursor)
    range.cursor = range.end;

  var removed = this.rangeList.add(range);

  this.$onAddRange(range);

  if (removed.length)
    this.$onRemoveRange(removed);

  if (this.rangeCount > 1 && !this.inMultiSelectMode) {
    this._signal("multiSelect");
    this.inMultiSelectMode = true;
    this.session.$undoSelect = false;
    this.rangeList.attach(this.session);
  }

  return $blockChangeEvents || this.fromOrientedRange(range);
};

export const toSingleRange = function (range) {
  range = range || this.ranges[0];
  var removed = this.rangeList.removeAll();
  if (removed.length)
    this.$onRemoveRange(removed);

  range && this.fromOrientedRange(range);
};

export const substractPoint = function (pos) {
  var removed = this.rangeList.substractPoint(pos);
  if (removed) {
    this.$onRemoveRange(removed);
    return removed[0];
  }
};

export const mergeOverlappingRanges = function () {
  var removed = this.rangeList.merge();
  if (removed.length)
    this.$onRemoveRange(removed);
};

export const $onAddRange = function (range) {
  this.rangeCount = this.rangeList.ranges.length;
  this.ranges.unshift(range);
  this._signal("addRange", { range: range });
};

export const $onRemoveRange = function (removed) {
  this.rangeCount = this.rangeList.ranges.length;
  if (this.rangeCount == 1 && this.inMultiSelectMode) {
    var lastRange = this.rangeList.ranges.pop();
    removed.push(lastRange);
    this.rangeCount = 0;
  }

  for (var i = removed.length; i--;) {
    var index = this.ranges.indexOf(removed[i]);
    this.ranges.splice(index, 1);
  }

  this._signal("removeRange", { ranges: removed });

  if (this.rangeCount === 0 && this.inMultiSelectMode) {
    this.inMultiSelectMode = false;
    this._signal("singleSelect");
    this.session.$undoSelect = true;
    this.rangeList.detach(this.session);
  }

  lastRange = lastRange || this.ranges[0];
  if (lastRange && !lastRange.isEqual(this.getRange()))
    this.fromOrientedRange(lastRange);
};

export const $initRangeList = function () {
  if (this.rangeList)
    return;

  this.rangeList = new RangeList();
  this.ranges = [];
  this.rangeCount = 0;
};

export const getAllRanges = function () {
  return this.rangeCount ? this.rangeList.ranges.concat() : [this.getRange()];
};

export const splitIntoLines = function () {
  var ranges = this.ranges.length ? this.ranges : [this.getRange()];
  var newRanges = [];
  for (var i = 0; i < ranges.length; i++) {
    var range = ranges[i];
    var row = range.start.row;
    var endRow = range.end.row;
    if (row === endRow) {
      newRanges.push(range.clone());
    } else {
      newRanges.push(new Range(row, range.start.column, row, this.session.getLine(row).length));
      while (++row < endRow)
        newRanges.push(this.getLineRange(row, true));
      newRanges.push(new Range(endRow, 0, endRow, range.end.column));
    }
    if (i == 0 && !this.isBackwards())
      newRanges = newRanges.reverse();
  }
  this.toSingleRange();
  for (var i = newRanges.length; i--;)
    this.addRange(newRanges[i]);
};

export const joinSelections = function () {
  var ranges = this.rangeList.ranges;
  var lastRange = ranges[ranges.length - 1];
  var range = Range.fromPoints(ranges[0].start, lastRange.end);

  this.toSingleRange();
  this.setSelectionRange(range, lastRange.cursor == lastRange.start);
};

export const toggleBlockSelection = function () {
  if (this.rangeCount > 1) {
    var ranges = this.rangeList.ranges;
    var lastRange = ranges[ranges.length - 1];
    var range = Range.fromPoints(ranges[0].start, lastRange.end);

    this.toSingleRange();
    this.setSelectionRange(range, lastRange.cursor == lastRange.start);
  } else {
    var cursor = this.session.documentToScreenPosition(this.cursor);
    var anchor = this.session.documentToScreenPosition(this.anchor);

    var rectSel = this.rectangularRangeBlock(cursor, anchor);
    rectSel.forEach(this.addRange, this);
  }
};

export const rectangularRangeBlock = function (screenCursor, screenAnchor, includeEmptyLines) {
  var rectSel = [];

  var xBackwards = screenCursor.column < screenAnchor.column;
  if (xBackwards) {
    var startColumn = screenCursor.column;
    var endColumn = screenAnchor.column;
    var startOffsetX = screenCursor.offsetX;
    var endOffsetX = screenAnchor.offsetX;
  } else {
    var startColumn = screenAnchor.column;
    var endColumn = screenCursor.column;
    var startOffsetX = screenAnchor.offsetX;
    var endOffsetX = screenCursor.offsetX;
  }

  var yBackwards = screenCursor.row < screenAnchor.row;
  if (yBackwards) {
    var startRow = screenCursor.row;
    var endRow = screenAnchor.row;
  } else {
    var startRow = screenAnchor.row;
    var endRow = screenCursor.row;
  }

  if (startColumn < 0)
    startColumn = 0;
  if (startRow < 0)
    startRow = 0;

  if (startRow == endRow)
    includeEmptyLines = true;

  var docEnd;
  for (var row = startRow; row <= endRow; row++) {
    var range = Range.fromPoints(
      this.session.screenToDocumentPosition(row, startColumn, startOffsetX),
      this.session.screenToDocumentPosition(row, endColumn, endOffsetX)
    );
    if (range.isEmpty()) {
      if (docEnd && isSamePoint(range.end, docEnd))
        break;
      docEnd = range.end;
    }
    range.cursor = xBackwards ? range.start : range.end;
    rectSel.push(range);
  }

  if (yBackwards)
    rectSel.reverse();

  if (!includeEmptyLines) {
    var end = rectSel.length - 1;
    while (rectSel[end].isEmpty() && end > 0)
      end--;
    if (end > 0) {
      var start = 0;
      while (rectSel[start].isEmpty())
        start++;
    }
    for (var i = end; i >= start; i--) {
      if (rectSel[i].isEmpty())
        rectSel.splice(i, 1);
    }
  }

  return rectSel;
};