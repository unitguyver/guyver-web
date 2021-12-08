import config from "../config";
import TextMode from "../../mode/rules/text";
import Range from "../tools/Range";
import BackgroundTokenizer from "../tools/BackgroundTokenizer";
import lang from "../../lib/utils/lang";
import SearchHighlight from "../tools/SearchHighlight";

export const setDocument = function (doc) {
  if (this.doc)
    this.doc.off("change", this.$onChange);

  this.doc = doc;
  doc.on("change", this.$onChange);

  if (this.bgTokenizer)
    this.bgTokenizer.setDocument(this.getDocument());

  this.resetCaches();
};

export const getDocument = function () {
  return this.doc;
};

export const $resetRowCache = function (docRow) {
  if (!docRow) {
    this.$docRowCache = [];
    this.$screenRowCache = [];
    return;
  }
  var l = this.$docRowCache.length;
  var i = this.$getRowCacheIndex(this.$docRowCache, docRow) + 1;
  if (l > i) {
    this.$docRowCache.splice(i, l);
    this.$screenRowCache.splice(i, l);
  }
};

export const $getRowCacheIndex = function (cacheArray, val) {
  var low = 0;
  var hi = cacheArray.length - 1;

  while (low <= hi) {
    var mid = (low + hi) >> 1;
    var c = cacheArray[mid];

    if (val > c)
      low = mid + 1;
    else if (val < c)
      hi = mid - 1;
    else
      return mid;
  }

  return low - 1;
};

export const resetCaches = function () {
  this.$modified = true;
  this.$wrapData = [];
  this.$rowLengthCache = [];
  this.$resetRowCache(0);
  if (this.bgTokenizer)
    this.bgTokenizer.start(0);
};

export const onChangeFold = function (e) {
  var fold = e.data;
  this.$resetRowCache(fold.start.row);
};

export const onChange = function (delta) {
  this.$modified = true;
  this.$bidiHandler.onChange(delta);
  this.$resetRowCache(delta.start.row);

  var removedFolds = this.$updateInternalDataOnChange(delta);
  if (!this.$fromUndo && this.$undoManager) {
    if (removedFolds && removedFolds.length) {
      this.$undoManager.add({
        action: "removeFolds",
        folds: removedFolds
      }, this.mergeUndoDeltas);
      this.mergeUndoDeltas = true;
    }
    this.$undoManager.add(delta, this.mergeUndoDeltas);
    this.mergeUndoDeltas = true;

    this.$informUndoManager.schedule();
  }

  this.bgTokenizer && this.bgTokenizer.$updateOnChange(delta);
  this._signal("change", delta);
};

export const setValue = function (text) {
  this.doc.setValue(text);
  this.selection.moveTo(0, 0);

  this.$resetRowCache(0);
  this.setUndoManager(this.$undoManager);
  this.getUndoManager().reset();
};

export const getValue = function () {
  return this.doc.getValue();
};

export const toString = function () {
  return this.doc.getValue();
};

export const getSelection = function () {
  return this.selection;
};

export const getState = function (row) {
  return this.bgTokenizer.getState(row);
};

export const getTokens = function (row) {
  return this.bgTokenizer.getTokens(row);
};

export const getTokenAt = function (row, column) {
  var tokens = this.bgTokenizer.getTokens(row);
  var token, c = 0;
  if (column == null) {
    var i = tokens.length - 1;
    c = this.getLine(row).length;
  } else {
    for (var i = 0; i < tokens.length; i++) {
      c += tokens[i].value.length;
      if (c >= column)
        break;
    }
  }
  token = tokens[i];
  if (!token)
    return null;
  token.index = i;
  token.start = c - token.value.length;
  return token;
};

export const setUndoManager = function (undoManager) {
  this.$undoManager = undoManager;

  if (this.$informUndoManager)
    this.$informUndoManager.cancel();

  if (undoManager) {
    var self = this;
    undoManager.addSession(this);
    this.$syncInformUndoManager = function () {
      self.$informUndoManager.cancel();
      self.mergeUndoDeltas = false;
    };
    this.$informUndoManager = lang.delayedCall(this.$syncInformUndoManager);
  } else {
    this.$syncInformUndoManager = function () { };
  }
};

export const markUndoGroup = function () {
  if (this.$syncInformUndoManager)
    this.$syncInformUndoManager();
};

export const $defaultUndoManager = {
  undo: function () { },
  redo: function () { },
  hasUndo: function () { },
  hasRedo: function () { },
  reset: function () { },
  add: function () { },
  addSelection: function () { },
  startNewGroup: function () { },
  addSession: function () { }
};

export const getUndoManager = function () {
  return this.$undoManager || this.$defaultUndoManager;
};

export const getTabString = function () {
  if (this.getUseSoftTabs()) {
    return lang.stringRepeat(" ", this.getTabSize());
  } else {
    return "\t";
  }
};

export const setUseSoftTabs = function (val) {
  this.setOption("useSoftTabs", val);
};

export const getUseSoftTabs = function () {
  // todo might need more general way for changing settings from mode, but this is ok for now
  return this.$useSoftTabs && !this.$mode.$indentWithTabs;
};

export const setTabSize = function (tabSize) {
  this.setOption("tabSize", tabSize);
};

export const getTabSize = function () {
  return this.$tabSize;
};

export const isTabStop = function (position) {
  return this.$useSoftTabs && (position.column % this.$tabSize === 0);
};

export const setNavigateWithinSoftTabs = function (navigateWithinSoftTabs) {
  this.setOption("navigateWithinSoftTabs", navigateWithinSoftTabs);
};

export const getNavigateWithinSoftTabs = function () {
  return this.$navigateWithinSoftTabs;
};

export const $overwrite = false;

export const setOverwrite = function (overwrite) {
  this.setOption("overwrite", overwrite);
};

export const getOverwrite = function () {
  return this.$overwrite;
};

export const toggleOverwrite = function () {
  this.setOverwrite(!this.$overwrite);
};

export const addGutterDecoration = function (row, className) {
  if (!this.$decorations[row])
    this.$decorations[row] = "";
  this.$decorations[row] += " " + className;
  this._signal("changeBreakpoint", {});
};

export const removeGutterDecoration = function (row, className) {
  this.$decorations[row] = (this.$decorations[row] || "").replace(" " + className, "");
  this._signal("changeBreakpoint", {});
};

export const getBreakpoints = function () {
  return this.$breakpoints;
};

export const setBreakpoints = function (rows) {
  this.$breakpoints = [];
  for (var i = 0; i < rows.length; i++) {
    this.$breakpoints[rows[i]] = "ace_breakpoint";
  }
  this._signal("changeBreakpoint", {});
};

export const clearBreakpoints = function () {
  this.$breakpoints = [];
  this._signal("changeBreakpoint", {});
};

export const setBreakpoint = function (row, className) {
  if (className === undefined)
    className = "ace_breakpoint";
  if (className)
    this.$breakpoints[row] = className;
  else
    delete this.$breakpoints[row];
  this._signal("changeBreakpoint", {});
};

export const clearBreakpoint = function (row) {
  delete this.$breakpoints[row];
  this._signal("changeBreakpoint", {});
};

export const addMarker = function (range, clazz, type, inFront) {
  var id = this.$markerId++;

  var marker = {
    range: range,
    type: type || "line",
    renderer: typeof type == "function" ? type : null,
    clazz: clazz,
    inFront: !!inFront,
    id: id
  };

  if (inFront) {
    this.$frontMarkers[id] = marker;
    this._signal("changeFrontMarker");
  } else {
    this.$backMarkers[id] = marker;
    this._signal("changeBackMarker");
  }

  return id;
};

export const addDynamicMarker = function (marker, inFront) {
  if (!marker.update)
    return;
  var id = this.$markerId++;
  marker.id = id;
  marker.inFront = !!inFront;

  if (inFront) {
    this.$frontMarkers[id] = marker;
    this._signal("changeFrontMarker");
  } else {
    this.$backMarkers[id] = marker;
    this._signal("changeBackMarker");
  }

  return marker;
};

export const removeMarker = function (markerId) {
  var marker = this.$frontMarkers[markerId] || this.$backMarkers[markerId];
  if (!marker)
    return;

  var markers = marker.inFront ? this.$frontMarkers : this.$backMarkers;
  delete (markers[markerId]);
  this._signal(marker.inFront ? "changeFrontMarker" : "changeBackMarker");
};

export const getMarkers = function (inFront) {
  return inFront ? this.$frontMarkers : this.$backMarkers;
};

export const highlight = function (re) {
  if (!this.$searchHighlight) {
    var highlight = new SearchHighlight(null, "ace_selected-word", "text");
    this.$searchHighlight = this.addDynamicMarker(highlight);
  }
  this.$searchHighlight.setRegexp(re);
};

export const highlightLines = function (startRow, endRow, clazz, inFront) {
  if (typeof endRow != "number") {
    clazz = endRow;
    endRow = startRow;
  }
  if (!clazz)
    clazz = "ace_step";

  var range = new Range(startRow, 0, endRow, Infinity);
  range.id = this.addMarker(range, clazz, "fullLine", inFront);
  return range;
};

export const setAnnotations = function (annotations) {
  this.$annotations = annotations;
  this._signal("changeAnnotation", {});
};

export const getAnnotations = function () {
  return this.$annotations || [];
};

export const clearAnnotations = function () {
  this.setAnnotations([]);
};

export const $detectNewLine = function (text) {
  var match = text.match(/^.*?(\r?\n)/m);
  if (match) {
    this.$autoNewLine = match[1];
  } else {
    this.$autoNewLine = "\n";
  }
};

export const getWordRange = function (row, column) {
  var line = this.getLine(row);

  var inToken = false;
  if (column > 0)
    inToken = !!line.charAt(column - 1).match(this.tokenRe);

  if (!inToken)
    inToken = !!line.charAt(column).match(this.tokenRe);

  if (inToken)
    var re = this.tokenRe;
  else if (/^\s+$/.test(line.slice(column - 1, column + 1)))
    var re = /\s/;
  else
    var re = this.nonTokenRe;

  var start = column;
  if (start > 0) {
    do {
      start--;
    }
    while (start >= 0 && line.charAt(start).match(re));
    start++;
  }

  var end = column;
  while (end < line.length && line.charAt(end).match(re)) {
    end++;
  }

  return new Range(row, start, row, end);
};

export const getAWordRange = function (row, column) {
  var wordRange = this.getWordRange(row, column);
  var line = this.getLine(wordRange.end.row);

  while (line.charAt(wordRange.end.column).match(/[ \t]/)) {
    wordRange.end.column += 1;
  }
  return wordRange;
};

export const setNewLineMode = function (newLineMode) {
  this.doc.setNewLineMode(newLineMode);
};

export const getNewLineMode = function () {
  return this.doc.getNewLineMode();
};

export const setUseWorker = function (useWorker) { this.setOption("useWorker", useWorker); };

export const getUseWorker = function () { return this.$useWorker; };

export const onReloadTokenizer = function (e) {
  var rows = e.data;
  this.bgTokenizer.start(rows.first);
  this._signal("tokenizerUpdate", e);
};

export const $modes = config.$modes;

export const $mode = null;
export const $modeId = null;

export const setMode = function (mode = "text", cb) {
  let options, path;

  if (mode && typeof mode === "object") {
    if (mode.getTokenizer) {
      return this.$onChangeMode(mode);
    }
    options = mode;
    path = options.path;
  } else {
    path = mode;
  }

  if (!this.$modes["text"])
    this.$modes["text"] = new TextMode();

  if (this.$modes[path] && !options) {
    this.$onChangeMode(this.$modes[path]);
    cb && cb();
    return;
  }
  // load on demand
  this.$modeId = path;
  config.loadModule(["mode", path], function (M) {
    if (this.$modeId !== path)
      return cb && cb();
    if (this.$modes[path] && !options) {
      this.$onChangeMode(this.$modes[path]);
    } else if (M) {
      const m = new M(options);
      if (!options) {
        this.$modes[path] = m;
        m.$id = path;
      }
      this.$onChangeMode(m);
    }
    cb && cb();
  }.bind(this));

  // set mode to text until loading is finished
  if (!this.$mode)
    this.$onChangeMode(this.$modes["text"], true);
};

export const $onChangeMode = function (mode, $isPlaceholder) {
  if (!$isPlaceholder)
    this.$modeId = mode.$id;
  if (this.$mode === mode)
    return;

  var oldMode = this.$mode;
  this.$mode = mode;

  this.$stopWorker();

  if (this.$useWorker)
    this.$startWorker();

  var tokenizer = mode.getTokenizer();

  if (tokenizer.on !== undefined) {
    var onReloadTokenizer = this.onReloadTokenizer.bind(this);
    tokenizer.on("update", onReloadTokenizer);
  }

  if (!this.bgTokenizer) {
    this.bgTokenizer = new BackgroundTokenizer(tokenizer);
    var _self = this;
    this.bgTokenizer.on("update", function (e) {
      _self._signal("tokenizerUpdate", e);
    });
  } else {
    this.bgTokenizer.setTokenizer(tokenizer);
  }

  this.bgTokenizer.setDocument(this.getDocument());

  this.tokenRe = mode.tokenRe;
  this.nonTokenRe = mode.nonTokenRe;


  if (!$isPlaceholder) {
    // experimental method, used by c9 findiniles
    if (mode.attachToSession)
      mode.attachToSession(this);
    this.$options.wrapMethod.set.call(this, this.$wrapMethod);
    this.$setFolding(mode.foldingRules);
    this.bgTokenizer.start(0);
    this._emit("changeMode", { oldMode: oldMode, mode: mode });
  }
};

export const $stopWorker = function () {
  if (this.$worker) {
    this.$worker.terminate();
    this.$worker = null;
  }
};

export const $startWorker = function () {
  try {
    this.$worker = this.$mode.createWorker(this);
  } catch (e) {
    config.warn("Could not load worker", e);
    this.$worker = null;
  }
};

export const getMode = function () {
  return this.$mode;
};

export const $scrollTop = 0;

export const setScrollTop = function (scrollTop) {
  // TODO: should we force integer lineheight instead? scrollTop = Math.round(scrollTop); 
  if (this.$scrollTop === scrollTop || isNaN(scrollTop))
    return;

  this.$scrollTop = scrollTop;
  this._signal("changeScrollTop", scrollTop);
};

export const getScrollTop = function () {
  return this.$scrollTop;
};

export const $scrollLeft = 0;

export const setScrollLeft = function (scrollLeft) {
  // scrollLeft = Math.round(scrollLeft);
  if (this.$scrollLeft === scrollLeft || isNaN(scrollLeft))
    return;

  this.$scrollLeft = scrollLeft;
  this._signal("changeScrollLeft", scrollLeft);
};

export const getScrollLeft = function () {
  return this.$scrollLeft;
};

export const getScreenWidth = function () {
  this.$computeWidth();
  if (this.lineWidgets)
    return Math.max(this.getLineWidgetMaxWidth(), this.screenWidth);
  return this.screenWidth;
};

export const getLineWidgetMaxWidth = function () {
  if (this.lineWidgetsWidth != null) return this.lineWidgetsWidth;
  var width = 0;
  this.lineWidgets.forEach(function (w) {
    if (w && w.screenWidth > width)
      width = w.screenWidth;
  });
  return this.lineWidgetWidth = width;
};

export const $computeWidth = function (force) {
  if (this.$modified || force) {
    this.$modified = false;

    if (this.$useWrapMode)
      return this.screenWidth = this.$wrapLimit;

    var lines = this.doc.getAllLines();
    var cache = this.$rowLengthCache;
    var longestScreenLine = 0;
    var foldIndex = 0;
    var foldLine = this.$foldData[foldIndex];
    var foldStart = foldLine ? foldLine.start.row : Infinity;
    var len = lines.length;

    for (var i = 0; i < len; i++) {
      if (i > foldStart) {
        i = foldLine.end.row + 1;
        if (i >= len)
          break;
        foldLine = this.$foldData[foldIndex++];
        foldStart = foldLine ? foldLine.start.row : Infinity;
      }

      if (cache[i] == null)
        cache[i] = this.$getStringScreenWidth(lines[i])[0];

      if (cache[i] > longestScreenLine)
        longestScreenLine = cache[i];
    }
    this.screenWidth = longestScreenLine;
  }
};

export const getLine = function (row) {
  return this.doc.getLine(row);
};

export const getLines = function (firstRow, lastRow) {
  return this.doc.getLines(firstRow, lastRow);
};

export const getLength = function () {
  return this.doc.getLength();
};

export const getTextRange = function (range) {
  return this.doc.getTextRange(range || this.selection.getRange());
};

export const insert = function (position, text) {
  return this.doc.insert(position, text);
};

export const remove = function (range) {
  return this.doc.remove(range);
};

export const removeFullLines = function (firstRow, lastRow) {
  return this.doc.removeFullLines(firstRow, lastRow);
};

export const undoChanges = function (deltas, dontSelect) {
  if (!deltas.length)
    return;

  this.$fromUndo = true;
  for (var i = deltas.length - 1; i != -1; i--) {
    var delta = deltas[i];
    if (delta.action == "insert" || delta.action == "remove") {
      this.doc.revertDelta(delta);
    } else if (delta.folds) {
      this.addFolds(delta.folds);
    }
  }
  if (!dontSelect && this.$undoSelect) {
    if (deltas.selectionBefore)
      this.selection.fromJSON(deltas.selectionBefore);
    else
      this.selection.setRange(this.$getUndoSelection(deltas, true));
  }
  this.$fromUndo = false;
};

export const redoChanges = function (deltas, dontSelect) {
  if (!deltas.length)
    return;

  this.$fromUndo = true;
  for (var i = 0; i < deltas.length; i++) {
    var delta = deltas[i];
    if (delta.action == "insert" || delta.action == "remove") {
      this.doc.$safeApplyDelta(delta);
    }
  }

  if (!dontSelect && this.$undoSelect) {
    if (deltas.selectionAfter)
      this.selection.fromJSON(deltas.selectionAfter);
    else
      this.selection.setRange(this.$getUndoSelection(deltas, false));
  }
  this.$fromUndo = false;
};

export const setUndoSelect = function (enable) {
  this.$undoSelect = enable;
};

export const $getUndoSelection = function (deltas, isUndo) {
  function isInsert(delta) {
    return isUndo ? delta.action !== "insert" : delta.action === "insert";
  }

  var range, point;

  for (var i = 0; i < deltas.length; i++) {
    var delta = deltas[i];
    if (!delta.start) continue; // skip folds
    if (!range) {
      if (isInsert(delta)) {
        range = Range.fromPoints(delta.start, delta.end);
      } else {
        range = Range.fromPoints(delta.start, delta.start);
      }
      continue;
    }

    if (isInsert(delta)) {
      point = delta.start;
      if (range.compare(point.row, point.column) == -1) {
        range.setStart(point);
      }
      point = delta.end;
      if (range.compare(point.row, point.column) == 1) {
        range.setEnd(point);
      }
    } else {
      point = delta.start;
      if (range.compare(point.row, point.column) == -1) {
        range = Range.fromPoints(delta.start, delta.start);
      }
    }
  }
  return range;
};

export const replace = function (range, text) {
  return this.doc.replace(range, text);
};

export const moveText = function (fromRange, toPosition, copy) {
  var text = this.getTextRange(fromRange);
  var folds = this.getFoldsInRange(fromRange);

  var toRange = Range.fromPoints(toPosition, toPosition);
  if (!copy) {
    this.remove(fromRange);
    var rowDiff = fromRange.start.row - fromRange.end.row;
    var collDiff = rowDiff ? -fromRange.end.column : fromRange.start.column - fromRange.end.column;
    if (collDiff) {
      if (toRange.start.row == fromRange.end.row && toRange.start.column > fromRange.end.column)
        toRange.start.column += collDiff;
      if (toRange.end.row == fromRange.end.row && toRange.end.column > fromRange.end.column)
        toRange.end.column += collDiff;
    }
    if (rowDiff && toRange.start.row >= fromRange.end.row) {
      toRange.start.row += rowDiff;
      toRange.end.row += rowDiff;
    }
  }

  toRange.end = this.insert(toRange.start, text);
  if (folds.length) {
    var oldStart = fromRange.start;
    var newStart = toRange.start;
    var rowDiff = newStart.row - oldStart.row;
    var collDiff = newStart.column - oldStart.column;
    this.addFolds(folds.map(function (x) {
      x = x.clone();
      if (x.start.row == oldStart.row)
        x.start.column += collDiff;
      if (x.end.row == oldStart.row)
        x.end.column += collDiff;
      x.start.row += rowDiff;
      x.end.row += rowDiff;
      return x;
    }));
  }

  return toRange;
};

export const indentRows = function (startRow, endRow, indentString) {
  indentString = indentString.replace(/\t/g, this.getTabString());
  for (var row = startRow; row <= endRow; row++)
    this.doc.insertInLine({ row: row, column: 0 }, indentString);
};

export const outdentRows = function (range) {
  var rowRange = range.collapseRows();
  var deleteRange = new Range(0, 0, 0, 0);
  var size = this.getTabSize();

  for (var i = rowRange.start.row; i <= rowRange.end.row; ++i) {
    var line = this.getLine(i);

    deleteRange.start.row = i;
    deleteRange.end.row = i;
    for (var j = 0; j < size; ++j)
      if (line.charAt(j) != ' ')
        break;
    if (j < size && line.charAt(j) == '\t') {
      deleteRange.start.column = j;
      deleteRange.end.column = j + 1;
    } else {
      deleteRange.start.column = 0;
      deleteRange.end.column = j;
    }
    this.remove(deleteRange);
  }
};

export const $moveLines = function (firstRow, lastRow, dir) {
  firstRow = this.getRowFoldStart(firstRow);
  lastRow = this.getRowFoldEnd(lastRow);
  if (dir < 0) {
    var row = this.getRowFoldStart(firstRow + dir);
    if (row < 0) return 0;
    var diff = row - firstRow;
  } else if (dir > 0) {
    var row = this.getRowFoldEnd(lastRow + dir);
    if (row > this.doc.getLength() - 1) return 0;
    var diff = row - lastRow;
  } else {
    firstRow = this.$clipRowToDocument(firstRow);
    lastRow = this.$clipRowToDocument(lastRow);
    var diff = lastRow - firstRow + 1;
  }

  var range = new Range(firstRow, 0, lastRow, Number.MAX_VALUE);
  var folds = this.getFoldsInRange(range).map(function (x) {
    x = x.clone();
    x.start.row += diff;
    x.end.row += diff;
    return x;
  });

  var lines = dir == 0
    ? this.doc.getLines(firstRow, lastRow)
    : this.doc.removeFullLines(firstRow, lastRow);
  this.doc.insertFullLines(firstRow + diff, lines);
  folds.length && this.addFolds(folds);
  return diff;
};

export const moveLinesUp = function (firstRow, lastRow) {
  return this.$moveLines(firstRow, lastRow, -1);
};

export const moveLinesDown = function (firstRow, lastRow) {
  return this.$moveLines(firstRow, lastRow, 1);
};

export const duplicateLines = function (firstRow, lastRow) {
  return this.$moveLines(firstRow, lastRow, 0);
};


export const $clipRowToDocument = function (row) {
  return Math.max(0, Math.min(row, this.doc.getLength() - 1));
};

export const $clipColumnToRow = function (row, column) {
  if (column < 0)
    return 0;
  return Math.min(this.doc.getLine(row).length, column);
};


export const $clipPositionToDocument = function (row, column) {
  column = Math.max(0, column);

  if (row < 0) {
    row = 0;
    column = 0;
  } else {
    var len = this.doc.getLength();
    if (row >= len) {
      row = len - 1;
      column = this.doc.getLine(len - 1).length;
    } else {
      column = Math.min(this.doc.getLine(row).length, column);
    }
  }

  return {
    row: row,
    column: column
  };
};

export const $clipRangeToDocument = function (range) {
  if (range.start.row < 0) {
    range.start.row = 0;
    range.start.column = 0;
  } else {
    range.start.column = this.$clipColumnToRow(
      range.start.row,
      range.start.column
    );
  }

  var len = this.doc.getLength() - 1;
  if (range.end.row > len) {
    range.end.row = len;
    range.end.column = this.doc.getLine(len).length;
  } else {
    range.end.column = this.$clipColumnToRow(
      range.end.row,
      range.end.column
    );
  }
  return range;
};

export const $wrapLimit = 80;
export const $useWrapMode = false;
export const $wrapLimitRange = {
  min: null,
  max: null
};

export const setUseWrapMode = function (useWrapMode) {
  if (useWrapMode != this.$useWrapMode) {
    this.$useWrapMode = useWrapMode;
    this.$modified = true;
    this.$resetRowCache(0);

    // If wrapMode is activaed, the wrapData array has to be initialized.
    if (useWrapMode) {
      var len = this.getLength();
      this.$wrapData = Array(len);
      this.$updateWrapData(0, len - 1);
    }

    this._signal("changeWrapMode");
  }
};

export const getUseWrapMode = function () {
  return this.$useWrapMode;
};

export const setWrapLimitRange = function (min, max) {
  if (this.$wrapLimitRange.min !== min || this.$wrapLimitRange.max !== max) {
    this.$wrapLimitRange = { min: min, max: max };
    this.$modified = true;
    this.$bidiHandler.markAsDirty();

    // This will force a recalculation of the wrap limit
    if (this.$useWrapMode)
      this._signal("changeWrapMode");
  }
};

export const adjustWrapLimit = function (desiredLimit, $printMargin) {
  var limits = this.$wrapLimitRange;
  if (limits.max < 0)
    limits = { min: $printMargin, max: $printMargin };
  var wrapLimit = this.$constrainWrapLimit(desiredLimit, limits.min, limits.max);
  if (wrapLimit != this.$wrapLimit && wrapLimit > 1) {
    this.$wrapLimit = wrapLimit;
    this.$modified = true;
    if (this.$useWrapMode) {
      this.$updateWrapData(0, this.getLength() - 1);
      this.$resetRowCache(0);
      this._signal("changeWrapLimit");
    }
    return true;
  }
  return false;
};

export const $constrainWrapLimit = function (wrapLimit, min, max) {
  if (min)
    wrapLimit = Math.max(min, wrapLimit);

  if (max)
    wrapLimit = Math.min(max, wrapLimit);

  return wrapLimit;
};

export const getWrapLimit = function () {
  return this.$wrapLimit;
};

export const setWrapLimit = function (limit) {
  this.setWrapLimitRange(limit, limit);
};

export const getWrapLimitRange = function () {
  // Avoid unexpected mutation by returning a copy
  return {
    min: this.$wrapLimitRange.min,
    max: this.$wrapLimitRange.max
  };
};

export const $updateInternalDataOnChange = function (delta) {
  var useWrapMode = this.$useWrapMode;
  var action = delta.action;
  var start = delta.start;
  var end = delta.end;
  var firstRow = start.row;
  var lastRow = end.row;
  var len = lastRow - firstRow;
  var removedFolds = null;

  this.$updating = true;
  if (len != 0) {
    if (action === "remove") {
      this[useWrapMode ? "$wrapData" : "$rowLengthCache"].splice(firstRow, len);

      var foldLines = this.$foldData;
      removedFolds = this.getFoldsInRange(delta);
      this.removeFolds(removedFolds);

      var foldLine = this.getFoldLine(end.row);
      var idx = 0;
      if (foldLine) {
        foldLine.addRemoveChars(end.row, end.column, start.column - end.column);
        foldLine.shiftRow(-len);

        var foldLineBefore = this.getFoldLine(firstRow);
        if (foldLineBefore && foldLineBefore !== foldLine) {
          foldLineBefore.merge(foldLine);
          foldLine = foldLineBefore;
        }
        idx = foldLines.indexOf(foldLine) + 1;
      }

      for (idx; idx < foldLines.length; idx++) {
        var foldLine = foldLines[idx];
        if (foldLine.start.row >= end.row) {
          foldLine.shiftRow(-len);
        }
      }

      lastRow = firstRow;
    } else {
      var args = Array(len);
      args.unshift(firstRow, 0);
      var arr = useWrapMode ? this.$wrapData : this.$rowLengthCache;
      arr.splice.apply(arr, args);

      // If some new line is added inside of a foldLine, then split
      // the fold line up.
      var foldLines = this.$foldData;
      var foldLine = this.getFoldLine(firstRow);
      var idx = 0;
      if (foldLine) {
        var cmp = foldLine.range.compareInside(start.row, start.column);
        // Inside of the foldLine range. Need to split stuff up.
        if (cmp == 0) {
          foldLine = foldLine.split(start.row, start.column);
          if (foldLine) {
            foldLine.shiftRow(len);
            foldLine.addRemoveChars(lastRow, 0, end.column - start.column);
          }
        } else
          // Infront of the foldLine but same row. Need to shift column.
          if (cmp == -1) {
            foldLine.addRemoveChars(firstRow, 0, end.column - start.column);
            foldLine.shiftRow(len);
          }
        // Nothing to do if the insert is after the foldLine.
        idx = foldLines.indexOf(foldLine) + 1;
      }

      for (idx; idx < foldLines.length; idx++) {
        var foldLine = foldLines[idx];
        if (foldLine.start.row >= firstRow) {
          foldLine.shiftRow(len);
        }
      }
    }
  } else {
    // Realign folds. E.g. if you add some new chars before a fold, the
    // fold should "move" to the right.
    len = Math.abs(delta.start.column - delta.end.column);
    if (action === "remove") {
      // Get all the folds in the change range and remove them.
      removedFolds = this.getFoldsInRange(delta);
      this.removeFolds(removedFolds);

      len = -len;
    }
    var foldLine = this.getFoldLine(firstRow);
    if (foldLine) {
      foldLine.addRemoveChars(firstRow, start.column, len);
    }
  }

  if (useWrapMode && this.$wrapData.length != this.doc.getLength()) {
    console.error("doc.getLength() and $wrapData.length have to be the same!");
  }
  this.$updating = false;

  if (useWrapMode)
    this.$updateWrapData(firstRow, lastRow);
  else
    this.$updateRowLengthCache(firstRow, lastRow);

  return removedFolds;
};

export const $updateRowLengthCache = function (firstRow, lastRow, b) {
  this.$rowLengthCache[firstRow] = null;
  this.$rowLengthCache[lastRow] = null;
};

export const $updateWrapData = function (firstRow, lastRow) {
  var lines = this.doc.getAllLines();
  var tabSize = this.getTabSize();
  var wrapData = this.$wrapData;
  var wrapLimit = this.$wrapLimit;
  var tokens;
  var foldLine;

  var row = firstRow;
  lastRow = Math.min(lastRow, lines.length - 1);
  while (row <= lastRow) {
    foldLine = this.getFoldLine(row, foldLine);
    if (!foldLine) {
      tokens = this.$getDisplayTokens(lines[row]);
      wrapData[row] = this.$computeWrapSplits(tokens, wrapLimit, tabSize);
      row++;
    } else {
      tokens = [];
      foldLine.walk(function (placeholder, row, column, lastColumn) {
        var walkTokens;
        if (placeholder != null) {
          walkTokens = this.$getDisplayTokens(
            placeholder, tokens.length);
          walkTokens[0] = PLACEHOLDER_START;
          for (var i = 1; i < walkTokens.length; i++) {
            walkTokens[i] = PLACEHOLDER_BODY;
          }
        } else {
          walkTokens = this.$getDisplayTokens(
            lines[row].substring(lastColumn, column),
            tokens.length);
        }
        tokens = tokens.concat(walkTokens);
      }.bind(this),
        foldLine.end.row,
        lines[foldLine.end.row].length + 1
      );

      wrapData[foldLine.start.row] = this.$computeWrapSplits(tokens, wrapLimit, tabSize);
      row = foldLine.end.row + 1;
    }
  }
};

// "Tokens"
var CHAR = 1,
  CHAR_EXT = 2,
  PLACEHOLDER_START = 3,
  PLACEHOLDER_BODY = 4,
  PUNCTUATION = 9,
  SPACE = 10,
  TAB = 11,
  TAB_SPACE = 12;


export const $computeWrapSplits = function (tokens, wrapLimit, tabSize) {
  if (tokens.length == 0) {
    return [];
  }

  var splits = [];
  var displayLength = tokens.length;
  var lastSplit = 0, lastDocSplit = 0;

  var isCode = this.$wrapAsCode;

  var indentedSoftWrap = this.$indentedSoftWrap;
  var maxIndent = wrapLimit <= Math.max(2 * tabSize, 8)
    || indentedSoftWrap === false ? 0 : Math.floor(wrapLimit / 2);

  function getWrapIndent() {
    var indentation = 0;
    if (maxIndent === 0)
      return indentation;
    if (indentedSoftWrap) {
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token == SPACE)
          indentation += 1;
        else if (token == TAB)
          indentation += tabSize;
        else if (token == TAB_SPACE)
          continue;
        else
          break;
      }
    }
    if (isCode && indentedSoftWrap !== false)
      indentation += tabSize;
    return Math.min(indentation, maxIndent);
  }
  function addSplit(screenPos) {
    // The document size is the current size - the extra width for tabs
    // and multipleWidth characters.
    var len = screenPos - lastSplit;
    for (var i = lastSplit; i < screenPos; i++) {
      var ch = tokens[i];
      if (ch === 12 || ch === 2) len -= 1;
    }

    if (!splits.length) {
      indent = getWrapIndent();
      splits.indent = indent;
    }
    lastDocSplit += len;
    splits.push(lastDocSplit);
    lastSplit = screenPos;
  }
  var indent = 0;
  while (displayLength - lastSplit > wrapLimit - indent) {
    // This is, where the split should be.
    var split = lastSplit + wrapLimit - indent;

    // If there is a space or tab at this split position, then making
    // a split is simple.
    if (tokens[split - 1] >= SPACE && tokens[split] >= SPACE) {
      /* disabled see https://github.com/ajaxorg/ace/issues/1186
      // Include all following spaces + tabs in this split as well.
      while (tokens[split] >= SPACE) {
          split ++;
      } */
      addSplit(split);
      continue;
    }

    // === ELSE ===
    // Check if split is inside of a placeholder. Placeholder are
    // not splitable. Therefore, seek the beginning of the placeholder
    // and try to place the split before the placeholder's start.
    if (tokens[split] == PLACEHOLDER_START || tokens[split] == PLACEHOLDER_BODY) {
      // Seek the start of the placeholder and do the split
      // before the placeholder. By definition there always
      // a PLACEHOLDER_START between split and lastSplit.
      for (split; split != lastSplit - 1; split--) {
        if (tokens[split] == PLACEHOLDER_START) {
          // split++; << No incremental here as we want to
          //  have the position before the Placeholder.
          break;
        }
      }

      // If the PLACEHOLDER_START is not the index of the
      // last split, then we can do the split
      if (split > lastSplit) {
        addSplit(split);
        continue;
      }

      // If the PLACEHOLDER_START IS the index of the last
      // split, then we have to place the split after the
      // placeholder. So, let's seek for the end of the placeholder.
      split = lastSplit + wrapLimit;
      for (split; split < tokens.length; split++) {
        if (tokens[split] != PLACEHOLDER_BODY) {
          break;
        }
      }

      // If spilt == tokens.length, then the placeholder is the last
      // thing in the line and adding a new split doesn't make sense.
      if (split == tokens.length) {
        break;  // Breaks the while-loop.
      }

      // Finally, add the split...
      addSplit(split);
      continue;
    }

    // === ELSE ===
    // Search for the first non space/tab/placeholder/punctuation token backwards.
    var minSplit = Math.max(split - (wrapLimit - (wrapLimit >> 2)), lastSplit - 1);
    while (split > minSplit && tokens[split] < PLACEHOLDER_START) {
      split--;
    }
    if (isCode) {
      while (split > minSplit && tokens[split] < PLACEHOLDER_START) {
        split--;
      }
      while (split > minSplit && tokens[split] == PUNCTUATION) {
        split--;
      }
    } else {
      while (split > minSplit && tokens[split] < SPACE) {
        split--;
      }
    }
    // If we found one, then add the split.
    if (split > minSplit) {
      addSplit(++split);
      continue;
    }

    // === ELSE ===
    split = lastSplit + wrapLimit;
    // The split is inside of a CHAR or CHAR_EXT token and no space
    // around -> force a split.
    if (tokens[split] == CHAR_EXT)
      split--;
    addSplit(split - indent);
  }
  return splits;
};

export const $getDisplayTokens = function (str, offset) {
  var arr = [];
  var tabSize;
  offset = offset || 0;

  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    // Tab
    if (c == 9) {
      tabSize = this.getScreenTabSize(arr.length + offset);
      arr.push(TAB);
      for (var n = 1; n < tabSize; n++) {
        arr.push(TAB_SPACE);
      }
    }
    // Space
    else if (c == 32) {
      arr.push(SPACE);
    } else if ((c > 39 && c < 48) || (c > 57 && c < 64)) {
      arr.push(PUNCTUATION);
    }
    // full width characters
    else if (c >= 0x1100 && isFullWidth(c)) {
      arr.push(CHAR, CHAR_EXT);
    } else {
      arr.push(CHAR);
    }
  }
  return arr;
};

export const $getStringScreenWidth = function (str, maxScreenColumn, screenColumn) {
  if (maxScreenColumn == 0)
    return [0, 0];
  if (maxScreenColumn == null)
    maxScreenColumn = Infinity;
  screenColumn = screenColumn || 0;

  var c, column;
  for (column = 0; column < str.length; column++) {
    c = str.charCodeAt(column);
    // tab
    if (c == 9) {
      screenColumn += this.getScreenTabSize(screenColumn);
    }
    // full width characters
    else if (c >= 0x1100 && isFullWidth(c)) {
      screenColumn += 2;
    } else {
      screenColumn += 1;
    }
    if (screenColumn > maxScreenColumn) {
      break;
    }
  }

  return [screenColumn, column];
};

export const lineWidgets = null;

export const getRowLength = function (row) {
  var h = 1;
  if (this.lineWidgets)
    h += this.lineWidgets[row] && this.lineWidgets[row].rowCount || 0;

  if (!this.$useWrapMode || !this.$wrapData[row])
    return h;
  else
    return this.$wrapData[row].length + h;
};
export const getRowLineCount = function (row) {
  if (!this.$useWrapMode || !this.$wrapData[row]) {
    return 1;
  } else {
    return this.$wrapData[row].length + 1;
  }
};

export const getRowWrapIndent = function (screenRow) {
  if (this.$useWrapMode) {
    var pos = this.screenToDocumentPosition(screenRow, Number.MAX_VALUE);
    var splits = this.$wrapData[pos.row];
    return splits.length && splits[0] < pos.column ? splits.indent : 0;
  } else {
    return 0;
  }
};

export const getScreenLastRowColumn = function (screenRow) {
  var pos = this.screenToDocumentPosition(screenRow, Number.MAX_VALUE);
  return this.documentToScreenColumn(pos.row, pos.column);
};

export const getDocumentLastRowColumn = function (docRow, docColumn) {
  var screenRow = this.documentToScreenRow(docRow, docColumn);
  return this.getScreenLastRowColumn(screenRow);
};

export const getDocumentLastRowColumnPosition = function (docRow, docColumn) {
  var screenRow = this.documentToScreenRow(docRow, docColumn);
  return this.screenToDocumentPosition(screenRow, Number.MAX_VALUE / 10);
};

export const getRowSplitData = function (row) {
  if (!this.$useWrapMode) {
    return undefined;
  } else {
    return this.$wrapData[row];
  }
};

export const getScreenTabSize = function (screenColumn) {
  return this.$tabSize - (screenColumn % this.$tabSize | 0);
};


export const screenToDocumentRow = function (screenRow, screenColumn) {
  return this.screenToDocumentPosition(screenRow, screenColumn).row;
};


export const screenToDocumentColumn = function (screenRow, screenColumn) {
  return this.screenToDocumentPosition(screenRow, screenColumn).column;
};

export const screenToDocumentPosition = function (screenRow, screenColumn, offsetX) {
  if (screenRow < 0)
    return { row: 0, column: 0 };

  var line;
  var docRow = 0;
  var docColumn = 0;
  var column;
  var row = 0;
  var rowLength = 0;

  var rowCache = this.$screenRowCache;
  var i = this.$getRowCacheIndex(rowCache, screenRow);
  var l = rowCache.length;
  if (l && i >= 0) {
    var row = rowCache[i];
    var docRow = this.$docRowCache[i];
    var doCache = screenRow > rowCache[l - 1];
  } else {
    var doCache = !l;
  }

  var maxRow = this.getLength() - 1;
  var foldLine = this.getNextFoldLine(docRow);
  var foldStart = foldLine ? foldLine.start.row : Infinity;

  while (row <= screenRow) {
    rowLength = this.getRowLength(docRow);
    if (row + rowLength > screenRow || docRow >= maxRow) {
      break;
    } else {
      row += rowLength;
      docRow++;
      if (docRow > foldStart) {
        docRow = foldLine.end.row + 1;
        foldLine = this.getNextFoldLine(docRow, foldLine);
        foldStart = foldLine ? foldLine.start.row : Infinity;
      }
    }

    if (doCache) {
      this.$docRowCache.push(docRow);
      this.$screenRowCache.push(row);
    }
  }

  if (foldLine && foldLine.start.row <= docRow) {
    line = this.getFoldDisplayLine(foldLine);
    docRow = foldLine.start.row;
  } else if (row + rowLength <= screenRow || docRow > maxRow) {
    // clip at the end of the document
    return {
      row: maxRow,
      column: this.getLine(maxRow).length
    };
  } else {
    line = this.getLine(docRow);
    foldLine = null;
  }
  var wrapIndent = 0, splitIndex = Math.floor(screenRow - row);
  if (this.$useWrapMode) {
    var splits = this.$wrapData[docRow];
    if (splits) {
      column = splits[splitIndex];
      if (splitIndex > 0 && splits.length) {
        wrapIndent = splits.indent;
        docColumn = splits[splitIndex - 1] || splits[splits.length - 1];
        line = line.substring(docColumn);
      }
    }
  }

  if (offsetX !== undefined && this.$bidiHandler.isBidiRow(row + splitIndex, docRow, splitIndex))
    screenColumn = this.$bidiHandler.offsetToCol(offsetX);

  docColumn += this.$getStringScreenWidth(line, screenColumn - wrapIndent)[1];

  // We remove one character at the end so that the docColumn
  // position returned is not associated to the next row on the screen.
  if (this.$useWrapMode && docColumn >= column)
    docColumn = column - 1;

  if (foldLine)
    return foldLine.idxToPosition(docColumn);

  return { row: docRow, column: docColumn };
};

export const documentToScreenPosition = function (docRow, docColumn) {
  // Normalize the passed in arguments.
  if (typeof docColumn === "undefined")
    var pos = this.$clipPositionToDocument(docRow.row, docRow.column);
  else
    pos = this.$clipPositionToDocument(docRow, docColumn);

  docRow = pos.row;
  docColumn = pos.column;

  var screenRow = 0;
  var foldStartRow = null;
  var fold = null;

  // Clamp the docRow position in case it's inside of a folded block.
  fold = this.getFoldAt(docRow, docColumn, 1);
  if (fold) {
    docRow = fold.start.row;
    docColumn = fold.start.column;
  }

  var rowEnd, row = 0;


  var rowCache = this.$docRowCache;
  var i = this.$getRowCacheIndex(rowCache, docRow);
  var l = rowCache.length;
  if (l && i >= 0) {
    var row = rowCache[i];
    var screenRow = this.$screenRowCache[i];
    var doCache = docRow > rowCache[l - 1];
  } else {
    var doCache = !l;
  }

  var foldLine = this.getNextFoldLine(row);
  var foldStart = foldLine ? foldLine.start.row : Infinity;

  while (row < docRow) {
    if (row >= foldStart) {
      rowEnd = foldLine.end.row + 1;
      if (rowEnd > docRow)
        break;
      foldLine = this.getNextFoldLine(rowEnd, foldLine);
      foldStart = foldLine ? foldLine.start.row : Infinity;
    }
    else {
      rowEnd = row + 1;
    }

    screenRow += this.getRowLength(row);
    row = rowEnd;

    if (doCache) {
      this.$docRowCache.push(row);
      this.$screenRowCache.push(screenRow);
    }
  }

  // Calculate the text line that is displayed in docRow on the screen.
  var textLine = "";
  // Check if the final row we want to reach is inside of a fold.
  if (foldLine && row >= foldStart) {
    textLine = this.getFoldDisplayLine(foldLine, docRow, docColumn);
    foldStartRow = foldLine.start.row;
  } else {
    textLine = this.getLine(docRow).substring(0, docColumn);
    foldStartRow = docRow;
  }
  var wrapIndent = 0;
  // Clamp textLine if in wrapMode.
  if (this.$useWrapMode) {
    var wrapRow = this.$wrapData[foldStartRow];
    if (wrapRow) {
      var screenRowOffset = 0;
      while (textLine.length >= wrapRow[screenRowOffset]) {
        screenRow++;
        screenRowOffset++;
      }
      textLine = textLine.substring(
        wrapRow[screenRowOffset - 1] || 0, textLine.length
      );
      wrapIndent = screenRowOffset > 0 ? wrapRow.indent : 0;
    }
  }

  if (this.lineWidgets && this.lineWidgets[row] && this.lineWidgets[row].rowsAbove)
    screenRow += this.lineWidgets[row].rowsAbove;

  return {
    row: screenRow,
    column: wrapIndent + this.$getStringScreenWidth(textLine)[0]
  };
};

export const documentToScreenColumn = function (row, docColumn) {
  return this.documentToScreenPosition(row, docColumn).column;
};

export const documentToScreenRow = function (docRow, docColumn) {
  return this.documentToScreenPosition(docRow, docColumn).row;
};

export const getScreenLength = function () {
  var screenRows = 0;
  var fold = null;
  if (!this.$useWrapMode) {
    screenRows = this.getLength();

    // Remove the folded lines again.
    var foldData = this.$foldData;
    for (var i = 0; i < foldData.length; i++) {
      fold = foldData[i];
      screenRows -= fold.end.row - fold.start.row;
    }
  } else {
    var lastRow = this.$wrapData.length;
    var row = 0, i = 0;
    var fold = this.$foldData[i++];
    var foldStart = fold ? fold.start.row : Infinity;

    while (row < lastRow) {
      var splits = this.$wrapData[row];
      screenRows += splits ? splits.length + 1 : 1;
      row++;
      if (row > foldStart) {
        row = fold.end.row + 1;
        fold = this.$foldData[i++];
        foldStart = fold ? fold.start.row : Infinity;
      }
    }
  }

  // todo
  if (this.lineWidgets)
    screenRows += this.$getWidgetScreenLength();

  return screenRows;
};

export const $setFontMetrics = function (fm) {
  if (!this.$enableVarChar) return;
  this.$getStringScreenWidth = function (str, maxScreenColumn, screenColumn) {
    if (maxScreenColumn === 0)
      return [0, 0];
    if (!maxScreenColumn)
      maxScreenColumn = Infinity;
    screenColumn = screenColumn || 0;

    var c, column;
    for (column = 0; column < str.length; column++) {
      c = str.charAt(column);
      // tab
      if (c === "\t") {
        screenColumn += this.getScreenTabSize(screenColumn);
      } else {
        screenColumn += fm.getCharacterWidth(c);
      }
      if (screenColumn > maxScreenColumn) {
        break;
      }
    }

    return [screenColumn, column];
  };
};

export const destroy = function () {
  if (this.bgTokenizer) {
    this.bgTokenizer.setDocument(null);
    this.bgTokenizer = null;
  }
  this.$stopWorker();
  this.removeAllListeners();
  if (this.doc) {
    this.doc.off("change", this.$onChange);
  }
  this.selection.detach();
};

export const isFullWidth = function (c) {
  if (c < 0x1100)
    return false;
  return c >= 0x1100 && c <= 0x115F ||
    c >= 0x11A3 && c <= 0x11A7 ||
    c >= 0x11FA && c <= 0x11FF ||
    c >= 0x2329 && c <= 0x232A ||
    c >= 0x2E80 && c <= 0x2E99 ||
    c >= 0x2E9B && c <= 0x2EF3 ||
    c >= 0x2F00 && c <= 0x2FD5 ||
    c >= 0x2FF0 && c <= 0x2FFB ||
    c >= 0x3000 && c <= 0x303E ||
    c >= 0x3041 && c <= 0x3096 ||
    c >= 0x3099 && c <= 0x30FF ||
    c >= 0x3105 && c <= 0x312D ||
    c >= 0x3131 && c <= 0x318E ||
    c >= 0x3190 && c <= 0x31BA ||
    c >= 0x31C0 && c <= 0x31E3 ||
    c >= 0x31F0 && c <= 0x321E ||
    c >= 0x3220 && c <= 0x3247 ||
    c >= 0x3250 && c <= 0x32FE ||
    c >= 0x3300 && c <= 0x4DBF ||
    c >= 0x4E00 && c <= 0xA48C ||
    c >= 0xA490 && c <= 0xA4C6 ||
    c >= 0xA960 && c <= 0xA97C ||
    c >= 0xAC00 && c <= 0xD7A3 ||
    c >= 0xD7B0 && c <= 0xD7C6 ||
    c >= 0xD7CB && c <= 0xD7FB ||
    c >= 0xF900 && c <= 0xFAFF ||
    c >= 0xFE10 && c <= 0xFE19 ||
    c >= 0xFE30 && c <= 0xFE52 ||
    c >= 0xFE54 && c <= 0xFE66 ||
    c >= 0xFE68 && c <= 0xFE6B ||
    c >= 0xFF01 && c <= 0xFF60 ||
    c >= 0xFFE0 && c <= 0xFFE6;
}