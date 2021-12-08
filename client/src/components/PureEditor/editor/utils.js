import dom from "../lib/utils/dom";
import Range from "./tools/Range";
import TokenIterator from "./tools/TokenIterator";
import oop from "../lib/utils/oop";
import lang from "../lib/utils/lang";
import clipboard from "../utils/clipboard";

export const $initOperationListeners = function () {
  this.commands.on("exec", this.startOperation.bind(this), true);
  this.commands.on("afterExec", this.endOperation.bind(this), true);

  this.$opResetTimer = lang.delayedCall(this.endOperation.bind(this, true));

  // todo: add before change events?
  this.on("change", function () {
    if (!this.curOp) {
      this.startOperation();
      this.curOp.selectionBefore = this.$lastSel;
    }
    this.curOp.docChanged = true;
  }.bind(this), true);

  this.on("changeSelection", function () {
    if (!this.curOp) {
      this.startOperation();
      this.curOp.selectionBefore = this.$lastSel;
    }
    this.curOp.selectionChanged = true;
  }.bind(this), true);
};

export const curOp = null;
export const prevOp = {};
export const startOperation = function (commandEvent) {
  if (this.curOp) {
    if (!commandEvent || this.curOp.command)
      return;
    this.prevOp = this.curOp;
  }
  if (!commandEvent) {
    this.previousCommand = null;
    commandEvent = {};
  }

  this.$opResetTimer.schedule();
  this.curOp = this.session.curOp = {
    command: commandEvent.command || {},
    args: commandEvent.args,
    scrollTop: this.renderer.scrollTop
  };
  this.curOp.selectionBefore = this.selection.toJSON();
};

export const endOperation = function (e) {
  if (this.curOp && this.session) {
    if (e && e.returnValue === false || !this.session)
      return (this.curOp = null);
    if (e == true && this.curOp.command && this.curOp.command.name == "mouse")
      return;
    this._signal("beforeEndOperation");
    if (!this.curOp) return;
    var command = this.curOp.command;
    var scrollIntoView = command && command.scrollIntoView;
    if (scrollIntoView) {
      switch (scrollIntoView) {
        case "center-animate":
          scrollIntoView = "animate";
        /* fall through */
        case "center":
          this.renderer.scrollCursorIntoView(null, 0.5);
          break;
        case "animate":
        case "cursor":
          this.renderer.scrollCursorIntoView();
          break;
        case "selectionPart":
          var range = this.selection.getRange();
          var config = this.renderer.layerConfig;
          if (range.start.row >= config.lastRow || range.end.row <= config.firstRow) {
            this.renderer.scrollSelectionIntoView(this.selection.anchor, this.selection.lead);
          }
          break;
        default:
          break;
      }
      if (scrollIntoView == "animate")
        this.renderer.animateScrolling(this.curOp.scrollTop);
    }
    var sel = this.selection.toJSON();
    this.curOp.selectionAfter = sel;
    this.$lastSel = this.selection.toJSON();

    this.session.getUndoManager().addSelection(sel);
    this.prevOp = this.curOp;
    this.curOp = null;
  }
};

export const $mergeableCommands = ["backspace", "del", "insertstring"];
export const $historyTracker = function (e) {
  if (!this.$mergeUndoDeltas)
    return;

  var prev = this.prevOp;
  var mergeableCommands = this.$mergeableCommands;
  // previous command was the same
  var shouldMerge = prev.command && (e.command.name == prev.command.name);
  if (e.command.name == "insertstring") {
    var text = e.args;
    if (this.mergeNextCommand === undefined)
      this.mergeNextCommand = true;

    shouldMerge = shouldMerge
      && this.mergeNextCommand // previous command allows to coalesce with
      && (!/\s/.test(text) || /\s/.test(prev.args)); // previous insertion was of same type

    this.mergeNextCommand = true;
  } else {
    shouldMerge = shouldMerge
      && mergeableCommands.indexOf(e.command.name) !== -1; // the command is mergeable
  }

  if (
    this.$mergeUndoDeltas != "always"
    && Date.now() - this.sequenceStartTime > 2000
  ) {
    shouldMerge = false; // the sequence is too long
  }

  if (shouldMerge)
    this.session.mergeUndoDeltas = true;
  else if (mergeableCommands.indexOf(e.command.name) !== -1)
    this.sequenceStartTime = Date.now();
};

export const setKeyboardHandler = function (keyboardHandler, cb) {
  if (keyboardHandler && typeof keyboardHandler === "string" && keyboardHandler != "ace") {
    this.$keybindingId = keyboardHandler;
    var _self = this;
    config.loadModule(["keybinding", keyboardHandler], function (module) {
      if (_self.$keybindingId == keyboardHandler)
        _self.keyBinding.setKeyboardHandler(module && module.handler);
      cb && cb();
    });
  } else {
    this.$keybindingId = null;
    this.keyBinding.setKeyboardHandler(keyboardHandler);
    cb && cb();
  }
};

export const getKeyboardHandler = function () {
  return this.keyBinding.getKeyboardHandler();
};


export const setSession = function (session) {
  if (this.session == session)
    return;

  // make sure operationEnd events are not emitted to wrong session
  if (this.curOp) this.endOperation();
  this.curOp = {};

  var oldSession = this.session;
  if (oldSession) {
    this.session.off("change", this.$onDocumentChange);
    this.session.off("changeMode", this.$onChangeMode);
    this.session.off("tokenizerUpdate", this.$onTokenizerUpdate);
    this.session.off("changeTabSize", this.$onChangeTabSize);
    this.session.off("changeWrapLimit", this.$onChangeWrapLimit);
    this.session.off("changeWrapMode", this.$onChangeWrapMode);
    this.session.off("changeFold", this.$onChangeFold);
    this.session.off("changeFrontMarker", this.$onChangeFrontMarker);
    this.session.off("changeBackMarker", this.$onChangeBackMarker);
    this.session.off("changeBreakpoint", this.$onChangeBreakpoint);
    this.session.off("changeAnnotation", this.$onChangeAnnotation);
    this.session.off("changeOverwrite", this.$onCursorChange);
    this.session.off("changeScrollTop", this.$onScrollTopChange);
    this.session.off("changeScrollLeft", this.$onScrollLeftChange);

    var selection = this.session.getSelection();
    selection.off("changeCursor", this.$onCursorChange);
    selection.off("changeSelection", this.$onSelectionChange);
  }

  this.session = session;
  if (session) {
    this.$onDocumentChange = this.onDocumentChange.bind(this);
    session.on("change", this.$onDocumentChange);
    this.renderer.setSession(session);

    this.$onChangeMode = this.onChangeMode.bind(this);
    session.on("changeMode", this.$onChangeMode);

    this.$onTokenizerUpdate = this.onTokenizerUpdate.bind(this);
    session.on("tokenizerUpdate", this.$onTokenizerUpdate);

    this.$onChangeTabSize = this.renderer.onChangeTabSize.bind(this.renderer);
    session.on("changeTabSize", this.$onChangeTabSize);

    this.$onChangeWrapLimit = this.onChangeWrapLimit.bind(this);
    session.on("changeWrapLimit", this.$onChangeWrapLimit);

    this.$onChangeWrapMode = this.onChangeWrapMode.bind(this);
    session.on("changeWrapMode", this.$onChangeWrapMode);

    this.$onChangeFold = this.onChangeFold.bind(this);
    session.on("changeFold", this.$onChangeFold);

    this.$onChangeFrontMarker = this.onChangeFrontMarker.bind(this);
    this.session.on("changeFrontMarker", this.$onChangeFrontMarker);

    this.$onChangeBackMarker = this.onChangeBackMarker.bind(this);
    this.session.on("changeBackMarker", this.$onChangeBackMarker);

    this.$onChangeBreakpoint = this.onChangeBreakpoint.bind(this);
    this.session.on("changeBreakpoint", this.$onChangeBreakpoint);

    this.$onChangeAnnotation = this.onChangeAnnotation.bind(this);
    this.session.on("changeAnnotation", this.$onChangeAnnotation);

    this.$onCursorChange = this.onCursorChange.bind(this);
    this.session.on("changeOverwrite", this.$onCursorChange);

    this.$onScrollTopChange = this.onScrollTopChange.bind(this);
    this.session.on("changeScrollTop", this.$onScrollTopChange);

    this.$onScrollLeftChange = this.onScrollLeftChange.bind(this);
    this.session.on("changeScrollLeft", this.$onScrollLeftChange);

    this.selection = session.getSelection();
    this.selection.on("changeCursor", this.$onCursorChange);

    this.$onSelectionChange = this.onSelectionChange.bind(this);
    this.selection.on("changeSelection", this.$onSelectionChange);

    this.onChangeMode();

    this.onCursorChange();

    this.onScrollTopChange();
    this.onScrollLeftChange();
    this.onSelectionChange();
    this.onChangeFrontMarker();
    this.onChangeBackMarker();
    this.onChangeBreakpoint();
    this.onChangeAnnotation();
    this.session.getUseWrapMode() && this.renderer.adjustWrapLimit();
    this.renderer.updateFull();
  } else {
    this.selection = null;
    this.renderer.setSession(session);
  }

  this._signal("changeSession", {
    session: session,
    oldSession: oldSession
  });

  this.curOp = null;

  oldSession && oldSession._signal("changeEditor", { oldEditor: this });
  session && session._signal("changeEditor", { editor: this });

  if (session && session.bgTokenizer)
    session.bgTokenizer.scheduleStart();
};

export const getSession = function () {
  return this.session;
};

export const setValue = function (val, cursorPos) {
  this.session.doc.setValue(val);

  if (!cursorPos)
    this.selectAll();
  else if (cursorPos == 1)
    this.navigateFileEnd();
  else if (cursorPos == -1)
    this.navigateFileStart();

  return val;
};

export const getValue = function () {
  return this.session.getValue();
};

export const getSelection = function () {
  return this.selection;
};

export const resize = function (force) {
  this.renderer.onResize(force);
};

export const setTheme = function (theme, cb) {
  this.renderer.setTheme(theme, cb);
};

export const getTheme = function () {
  return this.renderer.getTheme();
};

export const setStyle = function (style) {
  this.renderer.setStyle(style);
};

export const unsetStyle = function (style) {
  this.renderer.unsetStyle(style);
};

export const getFontSize = function () {
  return this.getOption("fontSize") ||
    dom.computedStyle(this.container).fontSize;
};

export const setFontSize = function (size) {
  this.setOption("fontSize", size);
};

export const $highlightBrackets = function () {
  if (this.$highlightPending) {
    return;
  }

  // perform highlight async to not block the browser during navigation
  var self = this;
  this.$highlightPending = true;
  setTimeout(function () {
    self.$highlightPending = false;
    var session = self.session;
    if (!session || !session.bgTokenizer) return;
    if (session.$bracketHighlight) {
      session.$bracketHighlight.markerIds.forEach(function (id) {
        session.removeMarker(id);
      });
      session.$bracketHighlight = null;
    }
    var ranges = session.getMatchingBracketRanges(self.getCursorPosition());
    if (!ranges && session.$mode.getMatching)
      ranges = session.$mode.getMatching(self.session);
    if (!ranges)
      return;

    var markerType = "ace_bracket";
    if (!Array.isArray(ranges)) {
      ranges = [ranges];
    } else if (ranges.length == 1) {
      markerType = "ace_error_bracket";
    }

    // show adjacent ranges as one
    if (ranges.length == 2) {
      if (Range.comparePoints(ranges[0].end, ranges[1].start) == 0)
        ranges = [Range.fromPoints(ranges[0].start, ranges[1].end)];
      else if (Range.comparePoints(ranges[0].start, ranges[1].end) == 0)
        ranges = [Range.fromPoints(ranges[1].start, ranges[0].end)];
    }

    session.$bracketHighlight = {
      ranges: ranges,
      markerIds: ranges.map(function (range) {
        return session.addMarker(range, markerType, "text");
      })
    };
  }, 50);
};

export const $highlightTags = function () {
  if (this.$highlightTagPending)
    return;

  // perform highlight async to not block the browser during navigation
  var self = this;
  this.$highlightTagPending = true;
  setTimeout(function () {
    self.$highlightTagPending = false;

    var session = self.session;
    if (!session || !session.bgTokenizer) return;

    var pos = self.getCursorPosition();
    var iterator = new TokenIterator(self.session, pos.row, pos.column);
    var token = iterator.getCurrentToken();

    if (!token || !/\b(?:tag-open|tag-name)/.test(token.type)) {
      session.removeMarker(session.$tagHighlight);
      session.$tagHighlight = null;
      return;
    }

    if (token.type.indexOf("tag-open") !== -1) {
      token = iterator.stepForward();
      if (!token)
        return;
    }

    var tag = token.value;
    var currentTag = token.value;
    var depth = 0;
    var prevToken = iterator.stepBackward();

    if (prevToken.value === '<') {
      //find closing tag
      do {
        prevToken = token;
        token = iterator.stepForward();

        if (token) {
          if (token.type.indexOf('tag-name') !== -1) {
            currentTag = token.value;
            if (tag === currentTag) {
              if (prevToken.value === '<') {
                depth++;
              } else if (prevToken.value === '</') {
                depth--;
              }
            }
          } else if (tag === currentTag && token.value === '/>') { // self closing tag
            depth--;
          }
        }

      } while (token && depth >= 0);
    } else {
      //find opening tag
      do {
        token = prevToken;
        prevToken = iterator.stepBackward();

        if (token) {
          if (token.type.indexOf('tag-name') !== -1) {
            if (tag === token.value) {
              if (prevToken.value === '<') {
                depth++;
              } else if (prevToken.value === '</') {
                depth--;
              }
            }
          } else if (token.value === '/>') { // self closing tag
            var stepCount = 0;
            var tmpToken = prevToken;
            while (tmpToken) {
              if (tmpToken.type.indexOf('tag-name') !== -1 && tmpToken.value === tag) {
                depth--;
                break;
              } else if (tmpToken.value === '<') {
                break;
              }
              tmpToken = iterator.stepBackward();
              stepCount++;
            }
            for (var i = 0; i < stepCount; i++) {
              iterator.stepForward();
            }
          }
        }
      } while (prevToken && depth <= 0);

      //select tag again
      iterator.stepForward();
    }

    if (!token) {
      session.removeMarker(session.$tagHighlight);
      session.$tagHighlight = null;
      return;
    }

    var row = iterator.getCurrentTokenRow();
    var column = iterator.getCurrentTokenColumn();
    var range = new Range(row, column, row, column + token.value.length);

    //remove range if different
    var sbm = session.$backMarkers[session.$tagHighlight];
    if (session.$tagHighlight && sbm != undefined && range.compareRange(sbm.range) !== 0) {
      session.removeMarker(session.$tagHighlight);
      session.$tagHighlight = null;
    }

    if (!session.$tagHighlight)
      session.$tagHighlight = session.addMarker(range, "ace_bracket", "text");
  }, 50);
};

export const focus = function () {
  // focusing after timeout is not needed now, but some code using ace
  // depends on being able to call focus when textarea is not visible, 
  // so to keep backwards compatibility we keep this until the next major release
  var _self = this;
  setTimeout(function () {
    if (!_self.isFocused())
      _self.textInput.focus();
  });
  this.textInput.focus();
};

export const isFocused = function () {
  return this.textInput.isFocused();
};

export const blur = function () {
  this.textInput.blur();
};

export const onFocus = function (e) {
  if (this.$isFocused)
    return;
  this.$isFocused = true;
  this.renderer.showCursor();
  this.renderer.visualizeFocus();
  this._emit("focus", e);
};

export const onBlur = function (e) {
  if (!this.$isFocused)
    return;
  this.$isFocused = false;
  this.renderer.hideCursor();
  this.renderer.visualizeBlur();
  this._emit("blur", e);
};

export const $cursorChange = function () {
  this.renderer.updateCursor();
  this.$highlightBrackets();
  this.$highlightTags();
  this.$updateHighlightActiveLine();
};

export const onDocumentChange = function (delta) {
  // Rerender and emit "change" event.
  var wrap = this.session.$useWrapMode;
  var lastRow = (delta.start.row == delta.end.row ? delta.end.row : Infinity);
  this.renderer.updateLines(delta.start.row, lastRow, wrap);

  this._signal("change", delta);

  // Update cursor because tab characters can influence the cursor position.
  this.$cursorChange();
};

export const onTokenizerUpdate = function (e) {
  var rows = e.data;
  this.renderer.updateLines(rows.first, rows.last);
};


export const onScrollTopChange = function () {
  this.renderer.scrollToY(this.session.getScrollTop());
};

export const onScrollLeftChange = function () {
  this.renderer.scrollToX(this.session.getScrollLeft());
};

export const onCursorChange = function () {
  this.$cursorChange();
  this._signal("changeSelection");
};

export const $updateHighlightActiveLine = function () {
  var session = this.getSession();

  var highlight;
  if (this.$highlightActiveLine) {
    if (this.$selectionStyle != "line" || !this.selection.isMultiLine())
      highlight = this.getCursorPosition();
    if (this.renderer.theme && this.renderer.theme.$selectionColorConflict && !this.selection.isEmpty())
      highlight = false;
    if (this.renderer.$maxLines && this.session.getLength() === 1 && !(this.renderer.$minLines > 1))
      highlight = false;
  }

  if (session.$highlightLineMarker && !highlight) {
    session.removeMarker(session.$highlightLineMarker.id);
    session.$highlightLineMarker = null;
  } else if (!session.$highlightLineMarker && highlight) {
    var range = new Range(highlight.row, highlight.column, highlight.row, Infinity);
    range.id = session.addMarker(range, "ace_active-line", "screenLine");
    session.$highlightLineMarker = range;
  } else if (highlight) {
    session.$highlightLineMarker.start.row = highlight.row;
    session.$highlightLineMarker.end.row = highlight.row;
    session.$highlightLineMarker.start.column = highlight.column;
    session._signal("changeBackMarker");
  }
};

export const onSelectionChange = function (e) {
  var session = this.session;

  if (session.$selectionMarker) {
    session.removeMarker(session.$selectionMarker);
  }
  session.$selectionMarker = null;

  if (!this.selection.isEmpty()) {
    var range = this.selection.getRange();
    var style = this.getSelectionStyle();
    session.$selectionMarker = session.addMarker(range, "ace_selection", style);
  } else {
    this.$updateHighlightActiveLine();
  }

  var re = this.$highlightSelectedWord && this.$getSelectionHighLightRegexp();
  this.session.highlight(re);

  this._signal("changeSelection");
};

export const $getSelectionHighLightRegexp = function () {
  var session = this.session;

  var selection = this.getSelectionRange();
  if (selection.isEmpty() || selection.isMultiLine())
    return;

  var startColumn = selection.start.column;
  var endColumn = selection.end.column;
  var line = session.getLine(selection.start.row);

  var needle = line.substring(startColumn, endColumn);
  // maximum allowed size for regular expressions in 32000, 
  // but getting close to it has significant impact on the performance
  if (needle.length > 5000 || !/[\w\d]/.test(needle))
    return;

  var re = this.$search.$assembleRegExp({
    wholeWord: true,
    caseSensitive: true,
    needle: needle
  });

  var wordWithBoundary = line.substring(startColumn - 1, endColumn + 1);
  if (!re.test(wordWithBoundary))
    return;

  return re;
};

export const onChangeFrontMarker = function () {
  this.renderer.updateFrontMarkers();
};

export const onChangeBackMarker = function () {
  this.renderer.updateBackMarkers();
};

export const onChangeBreakpoint = function () {
  this.renderer.updateBreakpoints();
};

export const onChangeAnnotation = function () {
  this.renderer.setAnnotations(this.session.getAnnotations());
};

export const onChangeMode = function (e) {
  this.renderer.updateText();
  this._emit("changeMode", e);
};

export const onChangeWrapLimit = function () {
  this.renderer.updateFull();
};

export const onChangeWrapMode = function () {
  this.renderer.onResize(true);
};

export const onChangeFold = function () {
  // Update the active line marker as due to folding changes the current
  // line range on the screen might have changed.
  this.$updateHighlightActiveLine();
  // TODO: This might be too much updating. Okay for now.
  this.renderer.updateFull();
};

export const getSelectedText = function () {
  return this.session.getTextRange(this.getSelectionRange());
};

export const getCopyText = function () {
  var text = this.getSelectedText();
  var nl = this.session.doc.getNewLineCharacter();
  var copyLine = false;
  if (!text && this.$copyWithEmptySelection) {
    copyLine = true;
    var ranges = this.selection.getAllRanges();
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (i && ranges[i - 1].start.row == range.start.row)
        continue;
      text += this.session.getLine(range.start.row) + nl;
    }
  }
  var e = { text: text };
  this._signal("copy", e);
  clipboard.lineMode = copyLine ? e.text : false;
  return e.text;
};

export const onCopy = function () {
  this.commands.exec("copy", this);
};

export const onCut = function () {
  this.commands.exec("cut", this);
};

export const onPaste = function (text, event) {
  var e = { text: text, event: event };
  this.commands.exec("paste", this, e);
};

export const $handlePaste = function (e) {
  if (typeof e == "string")
    e = { text: e };
  this._signal("paste", e);
  var text = e.text;

  var lineMode = text === clipboard.lineMode;
  var session = this.session;
  if (!this.inMultiSelectMode || this.inVirtualSelectionMode) {
    if (lineMode)
      session.insert({ row: this.selection.lead.row, column: 0 }, text);
    else
      this.insert(text);
  } else if (lineMode) {
    this.selection.rangeList.ranges.forEach(function (range) {
      session.insert({ row: range.start.row, column: 0 }, text);
    });
  } else {
    var lines = text.split(/\r\n|\r|\n/);
    var ranges = this.selection.rangeList.ranges;

    var isFullLine = lines.length == 2 && (!lines[0] || !lines[1]);
    if (lines.length != ranges.length || isFullLine)
      return this.commands.exec("insertstring", this, text);

    for (var i = ranges.length; i--;) {
      var range = ranges[i];
      if (!range.isEmpty())
        session.remove(range);

      session.insert(range.start, lines[i]);
    }
  }
};

export const execCommand = function (command, args) {
  return this.commands.exec(command, this, args);
};

export const insert = function (text, pasted) {
  var session = this.session;
  var mode = session.getMode();
  var cursor = this.getCursorPosition();

  if (this.getBehavioursEnabled() && !pasted) {
    // Get a transform if the current mode wants one.
    var transform = mode.transformAction(session.getState(cursor.row), 'insertion', this, session, text);
    if (transform) {
      if (text !== transform.text) {
        // keep automatic insertion in a separate delta, unless it is in multiselect mode
        if (!this.inVirtualSelectionMode) {
          this.session.mergeUndoDeltas = false;
          this.mergeNextCommand = false;
        }
      }
      text = transform.text;

    }
  }

  if (text == "\t")
    text = this.session.getTabString();

  // remove selected text
  if (!this.selection.isEmpty()) {
    var range = this.getSelectionRange();
    cursor = this.session.remove(range);
    this.clearSelection();
  }
  else if (this.session.getOverwrite() && text.indexOf("\n") == -1) {
    var range = new Range.fromPoints(cursor, cursor);
    range.end.column += text.length;
    this.session.remove(range);
  }

  if (text == "\n" || text == "\r\n") {
    var line = session.getLine(cursor.row);
    if (cursor.column > line.search(/\S|$/)) {
      var d = line.substr(cursor.column).search(/\S|$/);
      session.doc.removeInLine(cursor.row, cursor.column, cursor.column + d);
    }
  }
  this.clearSelection();

  var start = cursor.column;
  var lineState = session.getState(cursor.row);
  var line = session.getLine(cursor.row);
  var shouldOutdent = mode.checkOutdent(lineState, line, text);
  session.insert(cursor, text);

  if (transform && transform.selection) {
    if (transform.selection.length == 2) { // Transform relative to the current column
      this.selection.setSelectionRange(
        new Range(cursor.row, start + transform.selection[0],
          cursor.row, start + transform.selection[1]));
    } else { // Transform relative to the current row.
      this.selection.setSelectionRange(
        new Range(cursor.row + transform.selection[0],
          transform.selection[1],
          cursor.row + transform.selection[2],
          transform.selection[3]));
    }
  }
  if (this.$enableAutoIndent) {
    if (session.getDocument().isNewLine(text)) {
      var lineIndent = mode.getNextLineIndent(lineState, line.slice(0, cursor.column), session.getTabString());

      session.insert({ row: cursor.row + 1, column: 0 }, lineIndent);
    }
    if (shouldOutdent)
      mode.autoOutdent(lineState, session, cursor.row);
  }
};

export const autoIndent = function () {
  var session = this.session;
  var mode = session.getMode();

  var startRow, endRow;
  if (this.selection.isEmpty()) {
    startRow = 0;
    endRow = session.doc.getLength() - 1;
  } else {
    var selectedRange = this.getSelectionRange();

    startRow = selectedRange.start.row;
    endRow = selectedRange.end.row;
  }

  var prevLineState = "";
  var prevLine = "";
  var lineIndent = "";
  var line, currIndent, range;
  var tab = session.getTabString();

  for (var row = startRow; row <= endRow; row++) {
    if (row > 0) {
      prevLineState = session.getState(row - 1);
      prevLine = session.getLine(row - 1);
      lineIndent = mode.getNextLineIndent(prevLineState, prevLine, tab);
    }

    line = session.getLine(row);
    currIndent = mode.$getIndent(line);
    if (lineIndent !== currIndent) {
      if (currIndent.length > 0) {
        range = new Range(row, 0, row, currIndent.length);
        session.remove(range);
      }
      if (lineIndent.length > 0) {
        session.insert({ row: row, column: 0 }, lineIndent);
      }
    }

    mode.autoOutdent(prevLineState, session, row);
  }
};


export const onTextInput = function (text, composition) {
  if (!composition)
    return this.keyBinding.onTextInput(text);

  this.startOperation({ command: { name: "insertstring" } });
  var applyComposition = this.applyComposition.bind(this, text, composition);
  if (this.selection.rangeCount)
    this.forEachSelection(applyComposition);
  else
    applyComposition();
  this.endOperation();
};

export const applyComposition = function (text, composition) {
  if (composition.extendLeft || composition.extendRight) {
    var r = this.selection.getRange();
    r.start.column -= composition.extendLeft;
    r.end.column += composition.extendRight;
    if (r.start.column < 0) {
      r.start.row--;
      r.start.column += this.session.getLine(r.start.row).length + 1;
    }
    this.selection.setRange(r);
    if (!text && !r.isEmpty())
      this.remove();
  }
  if (text || !this.selection.isEmpty())
    this.insert(text, true);
  if (composition.restoreStart || composition.restoreEnd) {
    var r = this.selection.getRange();
    r.start.column -= composition.restoreStart;
    r.end.column -= composition.restoreEnd;
    this.selection.setRange(r);
  }
};

export const onCommandKey = function (e, hashId, keyCode) {
  return this.keyBinding.onCommandKey(e, hashId, keyCode);
};

export const setOverwrite = function (overwrite) {
  this.session.setOverwrite(overwrite);
};

export const getOverwrite = function () {
  return this.session.getOverwrite();
};

export const toggleOverwrite = function () {
  this.session.toggleOverwrite();
};

export const setScrollSpeed = function (speed) {
  this.setOption("scrollSpeed", speed);
};

export const getScrollSpeed = function () {
  return this.getOption("scrollSpeed");
};

export const setDragDelay = function (dragDelay) {
  this.setOption("dragDelay", dragDelay);
};

export const getDragDelay = function () {
  return this.getOption("dragDelay");
};

export const setSelectionStyle = function (val) {
  this.setOption("selectionStyle", val);
};

export const getSelectionStyle = function () {
  return this.getOption("selectionStyle");
};

export const setHighlightActiveLine = function (shouldHighlight) {
  this.setOption("highlightActiveLine", shouldHighlight);
};

export const getHighlightActiveLine = function () {
  return this.getOption("highlightActiveLine");
};

export const setHighlightGutterLine = function (shouldHighlight) {
  this.setOption("highlightGutterLine", shouldHighlight);
};

export const getHighlightGutterLine = function () {
  return this.getOption("highlightGutterLine");
};

export const setHighlightSelectedWord = function (shouldHighlight) {
  this.setOption("highlightSelectedWord", shouldHighlight);
};

export const getHighlightSelectedWord = function () {
  return this.$highlightSelectedWord;
};

export const setAnimatedScroll = function (shouldAnimate) {
  this.renderer.setAnimatedScroll(shouldAnimate);
};

export const getAnimatedScroll = function () {
  return this.renderer.getAnimatedScroll();
};

export const setShowInvisibles = function (showInvisibles) {
  this.renderer.setShowInvisibles(showInvisibles);
};

export const getShowInvisibles = function () {
  return this.renderer.getShowInvisibles();
};

export const setDisplayIndentGuides = function (display) {
  this.renderer.setDisplayIndentGuides(display);
};

export const getDisplayIndentGuides = function () {
  return this.renderer.getDisplayIndentGuides();
};

export const setShowPrintMargin = function (showPrintMargin) {
  this.renderer.setShowPrintMargin(showPrintMargin);
};

export const getShowPrintMargin = function () {
  return this.renderer.getShowPrintMargin();
};

export const setPrintMarginColumn = function (showPrintMargin) {
  this.renderer.setPrintMarginColumn(showPrintMargin);
};

export const getPrintMarginColumn = function () {
  return this.renderer.getPrintMarginColumn();
};

export const setReadOnly = function (readOnly) {
  this.setOption("readOnly", readOnly);
};

export const getReadOnly = function () {
  return this.getOption("readOnly");
};

export const setBehavioursEnabled = function (enabled) {
  this.setOption("behavioursEnabled", enabled);
};

export const getBehavioursEnabled = function () {
  return this.getOption("behavioursEnabled");
};

export const setWrapBehavioursEnabled = function (enabled) {
  this.setOption("wrapBehavioursEnabled", enabled);
};

export const getWrapBehavioursEnabled = function () {
  return this.getOption("wrapBehavioursEnabled");
};

export const setShowFoldWidgets = function (show) {
  this.setOption("showFoldWidgets", show);

};

export const getShowFoldWidgets = function () {
  return this.getOption("showFoldWidgets");
};

export const setFadeFoldWidgets = function (fade) {
  this.setOption("fadeFoldWidgets", fade);
};

export const getFadeFoldWidgets = function () {
  return this.getOption("fadeFoldWidgets");
};

export const remove = function (dir) {
  if (this.selection.isEmpty()) {
    if (dir == "left")
      this.selection.selectLeft();
    else
      this.selection.selectRight();
  }

  var range = this.getSelectionRange();
  if (this.getBehavioursEnabled()) {
    var session = this.session;
    var state = session.getState(range.start.row);
    var new_range = session.getMode().transformAction(state, 'deletion', this, session, range);

    if (range.end.column === 0) {
      var text = session.getTextRange(range);
      if (text[text.length - 1] == "\n") {
        var line = session.getLine(range.end.row);
        if (/^\s+$/.test(line)) {
          range.end.column = line.length;
        }
      }
    }
    if (new_range)
      range = new_range;
  }

  this.session.remove(range);
  this.clearSelection();
};

export const removeWordRight = function () {
  if (this.selection.isEmpty())
    this.selection.selectWordRight();

  this.session.remove(this.getSelectionRange());
  this.clearSelection();
};

export const removeWordLeft = function () {
  if (this.selection.isEmpty())
    this.selection.selectWordLeft();

  this.session.remove(this.getSelectionRange());
  this.clearSelection();
};

export const removeToLineStart = function () {
  if (this.selection.isEmpty())
    this.selection.selectLineStart();
  if (this.selection.isEmpty())
    this.selection.selectLeft();
  this.session.remove(this.getSelectionRange());
  this.clearSelection();
};

export const removeToLineEnd = function () {
  if (this.selection.isEmpty())
    this.selection.selectLineEnd();

  var range = this.getSelectionRange();
  if (range.start.column == range.end.column && range.start.row == range.end.row) {
    range.end.column = 0;
    range.end.row++;
  }

  this.session.remove(range);
  this.clearSelection();
};

export const splitLine = function () {
  if (!this.selection.isEmpty()) {
    this.session.remove(this.getSelectionRange());
    this.clearSelection();
  }

  var cursor = this.getCursorPosition();
  this.insert("\n");
  this.moveCursorToPosition(cursor);
};

export const transposeLetters = function () {
  if (!this.selection.isEmpty()) {
    return;
  }

  var cursor = this.getCursorPosition();
  var column = cursor.column;
  if (column === 0)
    return;

  var line = this.session.getLine(cursor.row);
  var swap, range;
  if (column < line.length) {
    swap = line.charAt(column) + line.charAt(column - 1);
    range = new Range(cursor.row, column - 1, cursor.row, column + 1);
  }
  else {
    swap = line.charAt(column - 1) + line.charAt(column - 2);
    range = new Range(cursor.row, column - 2, cursor.row, column);
  }
  this.session.replace(range, swap);
  this.session.selection.moveToPosition(range.end);
};

export const toLowerCase = function () {
  var originalRange = this.getSelectionRange();
  if (this.selection.isEmpty()) {
    this.selection.selectWord();
  }

  var range = this.getSelectionRange();
  var text = this.session.getTextRange(range);
  this.session.replace(range, text.toLowerCase());
  this.selection.setSelectionRange(originalRange);
};

export const toUpperCase = function () {
  var originalRange = this.getSelectionRange();
  if (this.selection.isEmpty()) {
    this.selection.selectWord();
  }

  var range = this.getSelectionRange();
  var text = this.session.getTextRange(range);
  this.session.replace(range, text.toUpperCase());
  this.selection.setSelectionRange(originalRange);
};

export const indent = function () {
  var session = this.session;
  var range = this.getSelectionRange();

  if (range.start.row < range.end.row) {
    var rows = this.$getSelectedRows();
    session.indentRows(rows.first, rows.last, "\t");
    return;
  } else if (range.start.column < range.end.column) {
    var text = session.getTextRange(range);
    if (!/^\s+$/.test(text)) {
      var rows = this.$getSelectedRows();
      session.indentRows(rows.first, rows.last, "\t");
      return;
    }
  }

  var line = session.getLine(range.start.row);
  var position = range.start;
  var size = session.getTabSize();
  var column = session.documentToScreenColumn(position.row, position.column);

  if (this.session.getUseSoftTabs()) {
    var count = (size - column % size);
    var indentString = lang.stringRepeat(" ", count);
  } else {
    var count = column % size;
    while (line[range.start.column - 1] == " " && count) {
      range.start.column--;
      count--;
    }
    this.selection.setSelectionRange(range);
    indentString = "\t";
  }
  return this.insert(indentString);
};

export const blockIndent = function () {
  var rows = this.$getSelectedRows();
  this.session.indentRows(rows.first, rows.last, "\t");
};

export const blockOutdent = function () {
  var selection = this.session.getSelection();
  this.session.outdentRows(selection.getRange());
};

export const sortLines = function () {
  var rows = this.$getSelectedRows();
  var session = this.session;

  var lines = [];
  for (var i = rows.first; i <= rows.last; i++)
    lines.push(session.getLine(i));

  lines.sort(function (a, b) {
    if (a.toLowerCase() < b.toLowerCase()) return -1;
    if (a.toLowerCase() > b.toLowerCase()) return 1;
    return 0;
  });

  var deleteRange = new Range(0, 0, 0, 0);
  for (var i = rows.first; i <= rows.last; i++) {
    var line = session.getLine(i);
    deleteRange.start.row = i;
    deleteRange.end.row = i;
    deleteRange.end.column = line.length;
    session.replace(deleteRange, lines[i - rows.first]);
  }
};

export const toggleCommentLines = function () {
  var state = this.session.getState(this.getCursorPosition().row);
  var rows = this.$getSelectedRows();
  this.session.getMode().toggleCommentLines(state, this.session, rows.first, rows.last);
};

export const toggleBlockComment = function () {
  var cursor = this.getCursorPosition();
  var state = this.session.getState(cursor.row);
  var range = this.getSelectionRange();
  this.session.getMode().toggleBlockComment(state, this.session, range, cursor);
};

export const getNumberAt = function (row, column) {
  var _numberRx = /[\-]?[0-9]+(?:\.[0-9]+)?/g;
  _numberRx.lastIndex = 0;

  var s = this.session.getLine(row);
  while (_numberRx.lastIndex < column) {
    var m = _numberRx.exec(s);
    if (m.index <= column && m.index + m[0].length >= column) {
      var number = {
        value: m[0],
        start: m.index,
        end: m.index + m[0].length
      };
      return number;
    }
  }
  return null;
};

export const modifyNumber = function (amount) {
  var row = this.selection.getCursor().row;
  var column = this.selection.getCursor().column;

  // get the char before the cursor
  var charRange = new Range(row, column - 1, row, column);

  var c = this.session.getTextRange(charRange);
  // if the char is a digit
  if (!isNaN(parseFloat(c)) && isFinite(c)) {
    // get the whole number the digit is part of
    var nr = this.getNumberAt(row, column);
    // if number found
    if (nr) {
      var fp = nr.value.indexOf(".") >= 0 ? nr.start + nr.value.indexOf(".") + 1 : nr.end;
      var decimals = nr.start + nr.value.length - fp;

      var t = parseFloat(nr.value);
      t *= Math.pow(10, decimals);


      if (fp !== nr.end && column < fp) {
        amount *= Math.pow(10, nr.end - column - 1);
      } else {
        amount *= Math.pow(10, nr.end - column);
      }

      t += amount;
      t /= Math.pow(10, decimals);
      var nnr = t.toFixed(decimals);

      //update number
      var replaceRange = new Range(row, nr.start, row, nr.end);
      this.session.replace(replaceRange, nnr);

      //reposition the cursor
      this.moveCursorTo(row, Math.max(nr.start + 1, column + nnr.length - nr.value.length));

    }
  } else {
    this.toggleWord();
  }
};

export const $toggleWordPairs = [
  ["first", "last"],
  ["true", "false"],
  ["yes", "no"],
  ["width", "height"],
  ["top", "bottom"],
  ["right", "left"],
  ["on", "off"],
  ["x", "y"],
  ["get", "set"],
  ["max", "min"],
  ["horizontal", "vertical"],
  ["show", "hide"],
  ["add", "remove"],
  ["up", "down"],
  ["before", "after"],
  ["even", "odd"],
  ["in", "out"],
  ["inside", "outside"],
  ["next", "previous"],
  ["increase", "decrease"],
  ["attach", "detach"],
  ["&&", "||"],
  ["==", "!="]
];

export const toggleWord = function () {
  var row = this.selection.getCursor().row;
  var column = this.selection.getCursor().column;
  this.selection.selectWord();
  var currentState = this.getSelectedText();
  var currWordStart = this.selection.getWordRange().start.column;
  var wordParts = currentState.replace(/([a-z]+|[A-Z]+)(?=[A-Z_]|$)/g, '$1 ').split(/\s/);
  var delta = column - currWordStart - 1;
  if (delta < 0) delta = 0;
  var curLength = 0, itLength = 0;
  var that = this;
  if (currentState.match(/[A-Za-z0-9_]+/)) {
    wordParts.forEach(function (item, i) {
      itLength = curLength + item.length;
      if (delta >= curLength && delta <= itLength) {
        currentState = item;
        that.selection.clearSelection();
        that.moveCursorTo(row, curLength + currWordStart);
        that.selection.selectTo(row, itLength + currWordStart);
      }
      curLength = itLength;
    });
  }

  var wordPairs = this.$toggleWordPairs;
  var reg;
  for (var i = 0; i < wordPairs.length; i++) {
    var item = wordPairs[i];
    for (var j = 0; j <= 1; j++) {
      var negate = +!j;
      var firstCondition = currentState.match(new RegExp('^\\s?_?(' + lang.escapeRegExp(item[j]) + ')\\s?$', 'i'));
      if (firstCondition) {
        var secondCondition = currentState.match(new RegExp('([_]|^|\\s)(' + lang.escapeRegExp(firstCondition[1]) + ')($|\\s)', 'g'));
        if (secondCondition) {
          reg = currentState.replace(new RegExp(lang.escapeRegExp(item[j]), 'i'), function (result) {
            var res = item[negate];
            if (result.toUpperCase() == result) {
              res = res.toUpperCase();
            } else if (result.charAt(0).toUpperCase() == result.charAt(0)) {
              res = res.substr(0, 0) + item[negate].charAt(0).toUpperCase() + res.substr(1);
            }
            return res;
          });
          this.insert(reg);
          reg = "";
        }
      }
    }
  }
};

export const removeLines = function () {
  var rows = this.$getSelectedRows();
  this.session.removeFullLines(rows.first, rows.last);
  this.clearSelection();
};

export const duplicateSelection = function () {
  var sel = this.selection;
  var doc = this.session;
  var range = sel.getRange();
  var reverse = sel.isBackwards();
  if (range.isEmpty()) {
    var row = range.start.row;
    doc.duplicateLines(row, row);
  } else {
    var point = reverse ? range.start : range.end;
    var endPoint = doc.insert(point, doc.getTextRange(range), false);
    range.start = point;
    range.end = endPoint;

    sel.setSelectionRange(range, reverse);
  }
};

export const moveLinesDown = function () {
  this.$moveLines(1, false);
};

export const moveLinesUp = function () {
  this.$moveLines(-1, false);
};

export const moveText = function (range, toPosition, copy) {
  return this.session.moveText(range, toPosition, copy);
};

export const copyLinesUp = function () {
  this.$moveLines(-1, true);
};

export const copyLinesDown = function () {
  this.$moveLines(1, true);
};

export const $moveLines = function (dir, copy) {
  var rows, moved;
  var selection = this.selection;
  if (!selection.inMultiSelectMode || this.inVirtualSelectionMode) {
    var range = selection.toOrientedRange();
    rows = this.$getSelectedRows(range);
    moved = this.session.$moveLines(rows.first, rows.last, copy ? 0 : dir);
    if (copy && dir == -1) moved = 0;
    range.moveBy(moved, 0);
    selection.fromOrientedRange(range);
  } else {
    var ranges = selection.rangeList.ranges;
    selection.rangeList.detach(this.session);
    this.inVirtualSelectionMode = true;

    var diff = 0;
    var totalDiff = 0;
    var l = ranges.length;
    for (var i = 0; i < l; i++) {
      var rangeIndex = i;
      ranges[i].moveBy(diff, 0);
      rows = this.$getSelectedRows(ranges[i]);
      var first = rows.first;
      var last = rows.last;
      while (++i < l) {
        if (totalDiff) ranges[i].moveBy(totalDiff, 0);
        var subRows = this.$getSelectedRows(ranges[i]);
        if (copy && subRows.first != last)
          break;
        else if (!copy && subRows.first > last + 1)
          break;
        last = subRows.last;
      }
      i--;
      diff = this.session.$moveLines(first, last, copy ? 0 : dir);
      if (copy && dir == -1) rangeIndex = i + 1;
      while (rangeIndex <= i) {
        ranges[rangeIndex].moveBy(diff, 0);
        rangeIndex++;
      }
      if (!copy) diff = 0;
      totalDiff += diff;
    }

    selection.fromOrientedRange(selection.ranges[0]);
    selection.rangeList.attach(this.session);
    this.inVirtualSelectionMode = false;
  }
};

export const $getSelectedRows = function (range) {
  range = (range || this.getSelectionRange()).collapseRows();

  return {
    first: this.session.getRowFoldStart(range.start.row),
    last: this.session.getRowFoldEnd(range.end.row)
  };
};

export const onCompositionStart = function (compositionState) {
  this.renderer.showComposition(compositionState);
};

export const onCompositionUpdate = function (text) {
  this.renderer.setCompositionText(text);
};

export const onCompositionEnd = function () {
  this.renderer.hideComposition();
};

export const getFirstVisibleRow = function () {
  return this.renderer.getFirstVisibleRow();
};

export const getLastVisibleRow = function () {
  return this.renderer.getLastVisibleRow();
};

export const isRowVisible = function (row) {
  return (row >= this.getFirstVisibleRow() && row <= this.getLastVisibleRow());
};

export const isRowFullyVisible = function (row) {
  return (row >= this.renderer.getFirstFullyVisibleRow() && row <= this.renderer.getLastFullyVisibleRow());
};

export const $getVisibleRowCount = function () {
  return this.renderer.getScrollBottomRow() - this.renderer.getScrollTopRow() + 1;
};

export const $moveByPage = function (dir, select) {
  var renderer = this.renderer;
  var config = this.renderer.layerConfig;
  var rows = dir * Math.floor(config.height / config.lineHeight);

  if (select === true) {
    this.selection.$moveSelection(function () {
      this.moveCursorBy(rows, 0);
    });
  } else if (select === false) {
    this.selection.moveCursorBy(rows, 0);
    this.selection.clearSelection();
  }

  var scrollTop = renderer.scrollTop;

  renderer.scrollBy(0, rows * config.lineHeight);
  if (select != null)
    renderer.scrollCursorIntoView(null, 0.5);

  renderer.animateScrolling(scrollTop);
};

export const selectPageDown = function () {
  this.$moveByPage(1, true);
};

export const selectPageUp = function () {
  this.$moveByPage(-1, true);
};

export const gotoPageDown = function () {
  this.$moveByPage(1, false);
};

export const gotoPageUp = function () {
  this.$moveByPage(-1, false);
};

export const scrollPageDown = function () {
  this.$moveByPage(1);
};

export const scrollPageUp = function () {
  this.$moveByPage(-1);
};

export const scrollToRow = function (row) {
  this.renderer.scrollToRow(row);
};

export const scrollToLine = function (line, center, animate, callback) {
  this.renderer.scrollToLine(line, center, animate, callback);
};

export const centerSelection = function () {
  var range = this.getSelectionRange();
  var pos = {
    row: Math.floor(range.start.row + (range.end.row - range.start.row) / 2),
    column: Math.floor(range.start.column + (range.end.column - range.start.column) / 2)
  };
  this.renderer.alignCursor(pos, 0.5);
};

export const getCursorPosition = function () {
  return this.selection.getCursor();
};

export const getCursorPositionScreen = function () {
  return this.session.documentToScreenPosition(this.getCursorPosition());
};

export const getSelectionRange = function () {
  return this.selection.getRange();
};

export const selectAll = function () {
  this.selection.selectAll();
};

export const clearSelection = function () {
  this.selection.clearSelection();
};

export const moveCursorTo = function (row, column) {
  this.selection.moveCursorTo(row, column);
};

export const moveCursorToPosition = function (pos) {
  this.selection.moveCursorToPosition(pos);
};

export const jumpToMatching = function (select, expand) {
  var cursor = this.getCursorPosition();
  var iterator = new TokenIterator(this.session, cursor.row, cursor.column);
  var prevToken = iterator.getCurrentToken();
  var token = prevToken || iterator.stepForward();

  if (!token) return;

  //get next closing tag or bracket
  var matchType;
  var found = false;
  var depth = {};
  var i = cursor.column - token.start;
  var bracketType;
  var brackets = {
    ")": "(",
    "(": "(",
    "]": "[",
    "[": "[",
    "{": "{",
    "}": "{"
  };

  do {
    if (token.value.match(/[{}()\[\]]/g)) {
      for (; i < token.value.length && !found; i++) {
        if (!brackets[token.value[i]]) {
          continue;
        }

        bracketType = brackets[token.value[i]] + '.' + token.type.replace("rparen", "lparen");

        if (isNaN(depth[bracketType])) {
          depth[bracketType] = 0;
        }

        switch (token.value[i]) {
          case '(':
          case '[':
          case '{':
            depth[bracketType]++;
            break;
          case ')':
          case ']':
          case '}':
            depth[bracketType]--;

            if (depth[bracketType] === -1) {
              matchType = 'bracket';
              found = true;
            }
            break;
        }
      }
    }
    else if (token.type.indexOf('tag-name') !== -1) {
      if (isNaN(depth[token.value])) {
        depth[token.value] = 0;
      }

      if (prevToken.value === '<') {
        depth[token.value]++;
      }
      else if (prevToken.value === '</') {
        depth[token.value]--;
      }

      if (depth[token.value] === -1) {
        matchType = 'tag';
        found = true;
      }
    }

    if (!found) {
      prevToken = token;
      token = iterator.stepForward();
      i = 0;
    }
  } while (token && !found);

  //no match found
  if (!matchType)
    return;

  var range, pos;
  if (matchType === 'bracket') {
    range = this.session.getBracketRange(cursor);
    if (!range) {
      range = new Range(
        iterator.getCurrentTokenRow(),
        iterator.getCurrentTokenColumn() + i - 1,
        iterator.getCurrentTokenRow(),
        iterator.getCurrentTokenColumn() + i - 1
      );
      pos = range.start;
      if (expand || pos.row === cursor.row && Math.abs(pos.column - cursor.column) < 2)
        range = this.session.getBracketRange(pos);
    }
  }
  else if (matchType === 'tag') {
    if (token && token.type.indexOf('tag-name') !== -1)
      var tag = token.value;
    else
      return;

    range = new Range(
      iterator.getCurrentTokenRow(),
      iterator.getCurrentTokenColumn() - 2,
      iterator.getCurrentTokenRow(),
      iterator.getCurrentTokenColumn() - 2
    );

    //find matching tag
    if (range.compare(cursor.row, cursor.column) === 0) {
      found = false;
      do {
        token = prevToken;
        prevToken = iterator.stepBackward();

        if (prevToken) {
          if (prevToken.type.indexOf('tag-close') !== -1) {
            range.setEnd(iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn() + 1);
          }

          if (token.value === tag && token.type.indexOf('tag-name') !== -1) {
            if (prevToken.value === '<') {
              depth[tag]++;
            }
            else if (prevToken.value === '</') {
              depth[tag]--;
            }

            if (depth[tag] === 0)
              found = true;
          }
        }
      } while (prevToken && !found);
    }

    //we found it
    if (token && token.type.indexOf('tag-name')) {
      pos = range.start;
      if (pos.row == cursor.row && Math.abs(pos.column - cursor.column) < 2)
        pos = range.end;
    }
  }

  pos = range && range.cursor || pos;
  if (pos) {
    if (select) {
      if (range && expand) {
        this.selection.setRange(range);
      } else if (range && range.isEqual(this.getSelectionRange())) {
        this.clearSelection();
      } else {
        this.selection.selectTo(pos.row, pos.column);
      }
    } else {
      this.selection.moveTo(pos.row, pos.column);
    }
  }
};

export const gotoLine = function (lineNumber, column, animate) {
  this.selection.clearSelection();
  this.session.unfold({ row: lineNumber - 1, column: column || 0 });

  // todo: find a way to automatically exit multiselect mode
  this.exitMultiSelectMode && this.exitMultiSelectMode();
  this.moveCursorTo(lineNumber - 1, column || 0);

  if (!this.isRowFullyVisible(lineNumber - 1))
    this.scrollToLine(lineNumber - 1, true, animate);
};

export const navigateTo = function (row, column) {
  this.selection.moveTo(row, column);
};

export const navigateUp = function (times) {
  if (this.selection.isMultiLine() && !this.selection.isBackwards()) {
    var selectionStart = this.selection.anchor.getPosition();
    return this.moveCursorToPosition(selectionStart);
  }
  this.selection.clearSelection();
  this.selection.moveCursorBy(-times || -1, 0);
};

export const navigateDown = function (times) {
  if (this.selection.isMultiLine() && this.selection.isBackwards()) {
    var selectionEnd = this.selection.anchor.getPosition();
    return this.moveCursorToPosition(selectionEnd);
  }
  this.selection.clearSelection();
  this.selection.moveCursorBy(times || 1, 0);
};

export const navigateLeft = function (times) {
  if (!this.selection.isEmpty()) {
    var selectionStart = this.getSelectionRange().start;
    this.moveCursorToPosition(selectionStart);
  }
  else {
    times = times || 1;
    while (times--) {
      this.selection.moveCursorLeft();
    }
  }
  this.clearSelection();
};

export const navigateRight = function (times) {
  if (!this.selection.isEmpty()) {
    var selectionEnd = this.getSelectionRange().end;
    this.moveCursorToPosition(selectionEnd);
  }
  else {
    times = times || 1;
    while (times--) {
      this.selection.moveCursorRight();
    }
  }
  this.clearSelection();
};

export const navigateLineStart = function () {
  this.selection.moveCursorLineStart();
  this.clearSelection();
};

export const navigateLineEnd = function () {
  this.selection.moveCursorLineEnd();
  this.clearSelection();
};

export const navigateFileEnd = function () {
  this.selection.moveCursorFileEnd();
  this.clearSelection();
};

export const navigateFileStart = function () {
  this.selection.moveCursorFileStart();
  this.clearSelection();
};

export const navigateWordRight = function () {
  this.selection.moveCursorWordRight();
  this.clearSelection();
};

export const navigateWordLeft = function () {
  this.selection.moveCursorWordLeft();
  this.clearSelection();
};

export const replace = function (replacement, options) {
  if (options)
    this.$search.set(options);

  var range = this.$search.find(this.session);
  var replaced = 0;
  if (!range)
    return replaced;

  if (this.$tryReplace(range, replacement)) {
    replaced = 1;
  }

  this.selection.setSelectionRange(range);
  this.renderer.scrollSelectionIntoView(range.start, range.end);

  return replaced;
};

export const replaceAll = function (replacement, options) {
  if (options) {
    this.$search.set(options);
  }

  var ranges = this.$search.findAll(this.session);
  var replaced = 0;
  if (!ranges.length)
    return replaced;

  var selection = this.getSelectionRange();
  this.selection.moveTo(0, 0);

  for (var i = ranges.length - 1; i >= 0; --i) {
    if (this.$tryReplace(ranges[i], replacement)) {
      replaced++;
    }
  }

  this.selection.setSelectionRange(selection);

  return replaced;
};

export const $tryReplace = function (range, replacement) {
  var input = this.session.getTextRange(range);
  replacement = this.$search.replace(input, replacement);
  if (replacement !== null) {
    range.end = this.session.replace(range, replacement);
    return range;
  } else {
    return null;
  }
};

export const getLastSearchOptions = function () {
  return this.$search.getOptions();
};

export const find = function (needle, options, animate) {
  if (!options)
    options = {};

  if (typeof needle == "string" || needle instanceof RegExp)
    options.needle = needle;
  else if (typeof needle == "object")
    oop.mixin(options, needle);

  var range = this.selection.getRange();
  if (options.needle == null) {
    needle = this.session.getTextRange(range)
      || this.$search.$options.needle;
    if (!needle) {
      range = this.session.getWordRange(range.start.row, range.start.column);
      needle = this.session.getTextRange(range);
    }
    this.$search.set({ needle: needle });
  }

  this.$search.set(options);
  if (!options.start)
    this.$search.set({ start: range });

  var newRange = this.$search.find(this.session);
  if (options.preventScroll)
    return newRange;
  if (newRange) {
    this.revealRange(newRange, animate);
    return newRange;
  }
  // clear selection if nothing is found
  if (options.backwards)
    range.start = range.end;
  else
    range.end = range.start;
  this.selection.setRange(range);
};

export const findNext = function (options, animate) {
  this.find({ skipCurrent: true, backwards: false }, options, animate);
};

export const findPrevious = function (options, animate) {
  this.find(options, { skipCurrent: true, backwards: true }, animate);
};

export const revealRange = function (range, animate) {
  this.session.unfold(range);
  this.selection.setSelectionRange(range);

  var scrollTop = this.renderer.scrollTop;
  this.renderer.scrollSelectionIntoView(range.start, range.end, 0.5);
  if (animate !== false)
    this.renderer.animateScrolling(scrollTop);
};

export const undo = function () {
  this.session.getUndoManager().undo(this.session);
  this.renderer.scrollCursorIntoView(null, 0.5);
};

export const redo = function () {
  this.session.getUndoManager().redo(this.session);
  this.renderer.scrollCursorIntoView(null, 0.5);
};

export const destroy = function () {
  if (this.$toDestroy) {
    this.$toDestroy.forEach(function (el) {
      el.destroy();
    });
    this.$toDestroy = null;
  }
  if (this.$mouseHandler)
    this.$mouseHandler.destroy();
  this.renderer.destroy();
  this._signal("destroy", this);
  if (this.session)
    this.session.destroy();
  if (this._$emitInputEvent)
    this._$emitInputEvent.cancel();
  this.removeAllListeners();
};

export const setAutoScrollEditorIntoView = function (enable) {
  if (!enable)
    return;
  var rect;
  var self = this;
  var shouldScroll = false;
  if (!this.$scrollAnchor)
    this.$scrollAnchor = document.createElement("div");
  var scrollAnchor = this.$scrollAnchor;
  scrollAnchor.style.cssText = "position:absolute";
  this.container.insertBefore(scrollAnchor, this.container.firstChild);
  var onChangeSelection = this.on("changeSelection", function () {
    shouldScroll = true;
  });
  // needed to not trigger sync reflow
  var onBeforeRender = this.renderer.on("beforeRender", function () {
    if (shouldScroll)
      rect = self.renderer.container.getBoundingClientRect();
  });
  var onAfterRender = this.renderer.on("afterRender", function () {
    if (shouldScroll && rect && (self.isFocused()
      || self.searchBox && self.searchBox.isFocused())
    ) {
      var renderer = self.renderer;
      var pos = renderer.$cursorLayer.$pixelPos;
      var config = renderer.layerConfig;
      var top = pos.top - config.offset;
      if (pos.top >= 0 && top + rect.top < 0) {
        shouldScroll = true;
      } else if (pos.top < config.height &&
        pos.top + rect.top + config.lineHeight > window.innerHeight) {
        shouldScroll = false;
      } else {
        shouldScroll = null;
      }
      if (shouldScroll != null) {
        scrollAnchor.style.top = top + "px";
        scrollAnchor.style.left = pos.left + "px";
        scrollAnchor.style.height = config.lineHeight + "px";
        scrollAnchor.scrollIntoView(shouldScroll);
      }
      shouldScroll = rect = null;
    }
  });
  this.setAutoScrollEditorIntoView = function (enable) {
    if (enable)
      return;
    delete this.setAutoScrollEditorIntoView;
    this.off("changeSelection", onChangeSelection);
    this.renderer.off("afterRender", onAfterRender);
    this.renderer.off("beforeRender", onBeforeRender);
  };
};


export const $resetCursorStyle = function () {
  var style = this.$cursorStyle || "ace";
  var cursorLayer = this.renderer.$cursorLayer;
  if (!cursorLayer)
    return;
  cursorLayer.setSmoothBlinking(/smooth/.test(style));
  cursorLayer.isBlinking = !this.$readOnly && style != "wide";
  dom.setCssClass(cursorLayer.element, "ace_slim-cursors", /slim/.test(style));
};

export const prompt = function (message, options, callback) {
  var editor = this;
  config.loadModule("./ext/prompt", function (module) {
    module.prompt(editor, message, options, callback);
  });
};