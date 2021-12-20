import Pos from "../../../Pos";
import Mirror from "../../lib/Mirror";

function onChange(cm, changeObj) {
  var macroModeState = cm.vimApi.state.macroModeState;
  var lastChange = macroModeState.lastInsertModeChanges;
  if (!macroModeState.isPlaying) {
    while (changeObj) {
      lastChange.expectCursorActivityForChange = true;
      if (lastChange.ignoreCount > 1) {
        lastChange.ignoreCount--;
      } else if (changeObj.origin == '+input' || changeObj.origin == 'paste'
        || changeObj.origin === undefined /* only in testing */) {
        var selectionCount = cm.listSelections().length;
        if (selectionCount > 1)
          lastChange.ignoreCount = selectionCount;
        var text = changeObj.text.join('\n');
        if (lastChange.maybeReset) {
          lastChange.changes = [];
          lastChange.maybeReset = false;
        }
        if (text) {
          if (cm.state.overwrite && !/\n/.test(text)) {
            lastChange.changes.push([text]);
          } else {
            lastChange.changes.push(text);
          }
        }
      }
      // Change objects may be chained with next.
      changeObj = changeObj.next;
    }
  }
}

function offsetCursor(cur, offsetLine, offsetCh) {
  if (typeof offsetLine === 'object') {
    offsetCh = offsetLine.ch;
    offsetLine = offsetLine.line;
  }
  return new Pos(cur.line + offsetLine, cur.ch + offsetCh);
}

function delayedExecAceCommand(op, ace) {
  ace.off("beforeEndOperation", delayedExecAceCommand);
  var cmd = ace.state.this.vimCmd;
  if (cmd) {
    ace.execCommand(cmd.exec ? cmd : cmd.name, cmd.args);
  }
  ace.curOp = ace.prevOp;
}

export default {
  onKeyEventTargetKeyDown(e) {
    var macroModeState = this.vimApi.state.macroModeState;
    var lastChange = macroModeState.lastInsertModeChanges;
    var keyName = Mirror.keyName(e);
    if (!keyName) { return; }
    function onKeyFound() {
      if (lastChange.maybeReset) {
        lastChange.changes = [];
        lastChange.maybeReset = false;
      }
      lastChange.changes.push(new this.vim.InsertModeKey(keyName));
      return true;
    }
    if (keyName.indexOf('Delete') != -1 || keyName.indexOf('Backspace') != -1) {
      Mirror.lookupKey(keyName, 'vim-insert', onKeyFound);
    }
  },
  selectForInsert(head, height) {
    var sel = [];
    for (var i = 0; i < height; i++) {
      var lineHead = offsetCursor(head, i, 0);
      sel.push({ anchor: lineHead, head: lineHead });
    }
    this.setSelections(sel, 0);
  },
  aceCommand: function (actionArgs, vim) {
    this.vimCmd = actionArgs;
    if (this.ace.inVirtualSelectionMode)
      this.ace.on("beforeEndOperation", delayedExecAceCommand);
    else
      delayedExecAceCommand(null, this.ace);
  },
  fold: function (actionArgs, vim) {
    this.ace.execCommand(['toggleFoldWidget', 'toggleFoldWidget', 'foldOther', 'unfoldall'
    ][(actionArgs.all ? 2 : 0) + (actionArgs.open ? 1 : 0)]);
  },
  jumpListWalk: function (actionArgs, vim) {
    if (vim.visualMode) {
      return;
    }
    var repeat = actionArgs.repeat;
    var forward = actionArgs.forward;
    var jumpList = this.state.jumpList;

    var mark = jumpList.move(this, forward ? repeat : -repeat);
    var markPos = mark ? mark.find() : undefined;
    markPos = markPos ? markPos : this.getCursor();
    this.setCursor(markPos);
    this.ace.curOp.command.scrollIntoView = "center-animate"; // ace_patch
  },
  scroll: function (actionArgs, vim) {
    if (vim.visualMode) {
      return;
    }
    var repeat = actionArgs.repeat || 1;
    var lineHeight = this.defaultTextHeight();
    var top = this.getScrollInfo().top;
    var delta = lineHeight * repeat;
    var newPos = actionArgs.forward ? top + delta : top - delta;
    var cursor = copyCursor(this.getCursor());
    var cursorCoords = this.charCoords(cursor, 'local');
    if (actionArgs.forward) {
      if (newPos > cursorCoords.top) {
        cursor.line += (newPos - cursorCoords.top) / lineHeight;
        cursor.line = Math.ceil(cursor.line);
        this.setCursor(cursor);
        cursorCoords = this.charCoords(cursor, 'local');
        this.scrollTo(null, cursorCoords.top);
      } else {
        // Cursor stays within bounds.  Just reposition the scroll window.
        this.scrollTo(null, newPos);
      }
    } else {
      var newBottom = newPos + this.getScrollInfo().clientHeight;
      if (newBottom < cursorCoords.bottom) {
        cursor.line -= (cursorCoords.bottom - newBottom) / lineHeight;
        cursor.line = Math.floor(cursor.line);
        this.setCursor(cursor);
        cursorCoords = this.charCoords(cursor, 'local');
        this.scrollTo(
          null, cursorCoords.bottom - this.getScrollInfo().clientHeight);
      } else {
        // Cursor stays within bounds.  Just reposition the scroll window.
        this.scrollTo(null, newPos);
      }
    }
  },
  scrollToCursor: function (actionArgs) {
    var lineNum = this.getCursor().line;
    var charCoords = this.charCoords(new Pos(lineNum, 0), 'local');
    var height = this.getScrollInfo().clientHeight;
    var y = charCoords.top;
    var lineHeight = charCoords.bottom - y;
    switch (actionArgs.position) {
      case 'center': y = y - (height / 2) + lineHeight;
        break;
      case 'bottom': y = y - height + lineHeight;
        break;
    }
    this.scrollTo(null, y);
  },
  replayMacro: function (actionArgs, vim) {
    var registerName = actionArgs.selectedCharacter;
    var repeat = actionArgs.repeat;
    var macroModeState = this.state.macroModeState;
    if (registerName == '@') {
      registerName = macroModeState.latestRegister;
    } else {
      macroModeState.latestRegister = registerName;
    }
    while (repeat--) {
      this.executeMacroRegister(vim, macroModeState, registerName);
    }
  },
  enterMacroRecordMode: function (actionArgs) {
    var macroModeState = this.state.macroModeState;
    var registerName = actionArgs.selectedCharacter;
    if (this.state.registerController.isValidRegister(registerName)) {
      macroModeState.enterMacroRecordMode(this, registerName);
    }
  },
  toggleOverwrite: function () {
    if (!this.state.overwrite) {
      this.toggleOverwrite(true);
      this.setOption('keyMap', 'vim-replace');
      Mirror.signal(this, "vim-mode-change", { mode: "replace" });
    } else {
      this.toggleOverwrite(false);
      this.setOption('keyMap', 'vim-insert');
      Mirror.signal(this, "vim-mode-change", { mode: "insert" });
    }
  },
  enterInsertMode: function (actionArgs, vim) {
    if (this.getOption('readOnly')) {
      return;
    }
    vim.insertMode = true;
    vim.insertModeRepeat = actionArgs && actionArgs.repeat || 1;
    var insertAt = (actionArgs) ? actionArgs.insertAt : null;
    var sel = vim.sel;
    var head = actionArgs.head || this.getCursor('head');
    var height = this.listSelections().length;
    if (insertAt == 'eol') {
      head = new Pos(head.line, this.lineLength(head.line));
    } else if (insertAt == 'bol') {
      head = new Pos(head.line, 0);
    } else if (insertAt == 'charAfter') {
      head = offsetCursor(head, 0, 1);
    } else if (insertAt == 'firstNonBlank') {
      head = motions.moveToFirstNonWhiteSpaceCharacter(this, head);
    } else if (insertAt == 'startOfSelectedArea') {
      if (!vim.visualMode)
        return;
      if (!vim.visualBlock) {
        if (sel.head.line < sel.anchor.line) {
          head = sel.head;
        } else {
          head = new Pos(sel.anchor.line, 0);
        }
      } else {
        head = new Pos(
          Math.min(sel.head.line, sel.anchor.line),
          Math.min(sel.head.ch, sel.anchor.ch));
        height = Math.abs(sel.head.line - sel.anchor.line) + 1;
      }
    } else if (insertAt == 'endOfSelectedArea') {
      if (!vim.visualMode)
        return;
      if (!vim.visualBlock) {
        if (sel.head.line >= sel.anchor.line) {
          head = offsetCursor(sel.head, 0, 1);
        } else {
          head = new Pos(sel.anchor.line, 0);
        }
      } else {
        head = new Pos(
          Math.min(sel.head.line, sel.anchor.line),
          Math.max(sel.head.ch, sel.anchor.ch) + 1);
        height = Math.abs(sel.head.line - sel.anchor.line) + 1;
      }
    } else if (insertAt == 'inplace') {
      if (vim.visualMode) {
        return;
      }
    } else if (insertAt == 'lastEdit') {
      head = Pos.getLastEditPos(this) || head;
    }
    this.setOption('disableInput', false);
    if (actionArgs && actionArgs.replace) {
      // Handle Replace-mode as a special case of insert mode.
      this.toggleOverwrite(true);
      this.setOption('keyMap', 'vim-replace');
      Mirror.signal(this, "vim-mode-change", { mode: "replace" });
    } else {
      this.toggleOverwrite(false);
      this.setOption('keyMap', 'vim-insert');
      Mirror.signal(this, "vim-mode-change", { mode: "insert" });
    }
    if (!this.vimApi.state.macroModeState.isPlaying) {
      // Only record if not replaying.
      this.on('change', onChange);
      Mirror.on(this.getInputField(), 'keydown', this.onKeyEventTargetKeyDown.bind(this));
    }
    if (vim.visualMode) {
      this.exitVisualMode();
    }
    this.selectForInsert(head, height);
  },
  toggleVisualMode: function (actionArgs, vim) {
    var repeat = actionArgs.repeat;
    var anchor = this.getCursor();
    var head;
    // TODO: The repeat should actually select number of characters/lines
    //     equal to the repeat times the size of the previous visual
    //     operation.
    if (!vim.visualMode) {
      // Entering visual mode
      vim.visualMode = true;
      vim.visualLine = !!actionArgs.linewise;
      vim.visualBlock = !!actionArgs.blockwise;
      head = this.clipCursorToContent(new Pos(anchor.line, anchor.ch + repeat - 1));
      vim.sel = {
        anchor: anchor,
        head: head
      };
      Mirror.signal(this, "vim-mode-change", { mode: "visual", subMode: vim.visualLine ? "linewise" : vim.visualBlock ? "blockwise" : "" });
      this.updateCmSelection();
      this.updateMark(vim, '<', cursorMin(anchor, head));
      this.updateMark(vim, '>', cursorMax(anchor, head));
    } else if (vim.visualLine ^ actionArgs.linewise ||
      vim.visualBlock ^ actionArgs.blockwise) {
      // Toggling between modes
      vim.visualLine = !!actionArgs.linewise;
      vim.visualBlock = !!actionArgs.blockwise;
      Mirror.signal(this, "vim-mode-change", { mode: "visual", subMode: vim.visualLine ? "linewise" : vim.visualBlock ? "blockwise" : "" });
      this.updateCmSelection();
    } else {
      this.exitVisualMode();
    }
  },
  reselectLastSelection: function (_actionArgs, vim) {
    var lastSelection = vim.lastSelection;
    if (vim.visualMode) {
      this.updateLastSelection(vim);
    }
    if (lastSelection) {
      var anchor = lastSelection.anchorMark.find();
      var head = lastSelection.headMark.find();
      if (!anchor || !head) {
        // If the marks have been destroyed due to edits, do nothing.
        return;
      }
      vim.sel = {
        anchor: anchor,
        head: head
      };
      vim.visualMode = true;
      vim.visualLine = lastSelection.visualLine;
      vim.visualBlock = lastSelection.visualBlock;
      this.updateCmSelection();
      this.updateMark(vim, '<', cursorMin(anchor, head));
      this.updateMark(vim, '>', cursorMax(anchor, head));
      Mirror.signal(this, 'vim-mode-change', {
        mode: 'visual',
        subMode: vim.visualLine ? 'linewise' :
          vim.visualBlock ? 'blockwise' : ''
      });
    }
  },
  joinLines: function (actionArgs, vim) {
    var curStart, curEnd;
    if (vim.visualMode) {
      curStart = this.getCursor('anchor');
      curEnd = this.getCursor('head');
      if (Pos.cursorIsBefore(curEnd, curStart)) {
        var tmp = curEnd;
        curEnd = curStart;
        curStart = tmp;
      }
      curEnd.ch = this.lineLength(curEnd.line) - 1;
    } else {
      // Repeat is the number of lines to join. Minimum 2 lines.
      var repeat = Math.max(actionArgs.repeat, 2);
      curStart = this.getCursor();
      curEnd = this.clipCursorToContent(new Pos(curStart.line + repeat - 1,
        Infinity));
    }
    var finalCh = 0;
    for (var i = curStart.line; i < curEnd.line; i++) {
      finalCh = this.lineLength(curStart.line);
      var tmp = new Pos(curStart.line + 1,
        this.lineLength(curStart.line + 1));
      var text = this.getRange(curStart, tmp);
      text = actionArgs.keepSpaces
        ? text.replace(/\n\r?/g, '')
        : text.replace(/\n\s*/g, ' ');
      this.replaceRange(text, curStart, tmp);
    }
    var curFinalPos = new Pos(curStart.line, finalCh);
    if (vim.visualMode) {
      this.exitVisualMode(false);
    }
    this.setCursor(curFinalPos);
  },
  newLineAndEnterInsertMode: function (actionArgs, vim) {
    vim.insertMode = true;
    var insertAt = copyCursor(this.getCursor());
    if (insertAt.line === this.firstLine() && !actionArgs.after) {
      // Special case for inserting newline before start of document.
      this.replaceRange('\n', new Pos(this.firstLine(), 0));
      this.setCursor(this.firstLine(), 0);
    } else {
      insertAt.line = (actionArgs.after) ? insertAt.line :
        insertAt.line - 1;
      insertAt.ch = this.lineLength(insertAt.line);
      this.setCursor(insertAt);
      var newlineFn = Mirror.commands.newlineAndIndentContinueComment ||
        Mirror.commands.newlineAndIndent;
      this.newlineFn();
    }
    this.enterInsertMode({ repeat: actionArgs.repeat }, vim);
  },
  paste: function (actionArgs, vim) {
    var cur = copyCursor(this.getCursor());
    var register = this.state.registerController.getRegister(
      actionArgs.registerName);
    var text = register.toString();
    if (!text) {
      return;
    }
    if (actionArgs.matchIndent) {
      var tabSize = this.getOption("tabSize");
      // length that considers tabs and tabSize
      var whitespaceLength = function (str) {
        var tabs = (str.split("\t").length - 1);
        var spaces = (str.split(" ").length - 1);
        return tabs * tabSize + spaces * 1;
      };
      var currentLine = this.getLine(this.getCursor().line);
      var indent = whitespaceLength(currentLine.match(/^\s*/)[0]);
      // chomp last newline b/c don't want it to match /^\s*/gm
      var chompedText = text.replace(/\n$/, '');
      var wasChomped = text !== chompedText;
      var firstIndent = whitespaceLength(text.match(/^\s*/)[0]);
      var text = chompedText.replace(/^\s*/gm, function (wspace) {
        var newIndent = indent + (whitespaceLength(wspace) - firstIndent);
        if (newIndent < 0) {
          return "";
        }
        else if (this.getOption("indentWithTabs")) {
          var quotient = Math.floor(newIndent / tabSize);
          return Array(quotient + 1).join('\t');
        }
        else {
          return Array(newIndent + 1).join(' ');
        }
      });
      text += wasChomped ? "\n" : "";
    }
    if (actionArgs.repeat > 1) {
      var text = Array(actionArgs.repeat + 1).join(text);
    }
    var linewise = register.linewise;
    var blockwise = register.blockwise;
    if (blockwise) {
      text = text.split('\n');
      if (linewise) {
        text.pop();
      }
      for (var i = 0; i < text.length; i++) {
        text[i] = (text[i] == '') ? ' ' : text[i];
      }
      cur.ch += actionArgs.after ? 1 : 0;
      cur.ch = Math.min(this.lineLength(cur.line), cur.ch);
    } else if (linewise) {
      if (vim.visualMode) {
        text = vim.visualLine ? text.slice(0, -1) : '\n' + text.slice(0, text.length - 1) + '\n';
      } else if (actionArgs.after) {
        // Move the newline at the end to the start instead, and paste just
        // before the newline character of the line we are on right now.
        text = '\n' + text.slice(0, text.length - 1);
        cur.ch = this.lineLength(cur.line);
      } else {
        cur.ch = 0;
      }
    } else {
      cur.ch += actionArgs.after ? 1 : 0;
    }
    var curPosFinal;
    var idx;
    if (vim.visualMode) {
      //  save the pasted text for reselection if the need arises
      vim.lastPastedText = text;
      var lastSelectionCurEnd;
      var selectedArea = this.getSelectedAreaRange(vim);
      var selectionStart = selectedArea[0];
      var selectionEnd = selectedArea[1];
      var selectedText = this.getSelection();
      var selections = this.listSelections();
      var emptyStrings = new Array(selections.length).join('1').split('1');
      // save the curEnd marker before it get cleared due to this.replaceRange.
      if (vim.lastSelection) {
        lastSelectionCurEnd = vim.lastSelection.headMark.find();
      }
      // push the previously selected text to unnamed register
      this.state.registerController.unnamedRegister.setText(selectedText);
      if (blockwise) {
        // first delete the selected text
        this.replaceSelections(emptyStrings);
        // Set new selections as per the block length of the yanked text
        selectionEnd = new Pos(selectionStart.line + text.length - 1, selectionStart.ch);
        this.setCursor(selectionStart);
        this.selectBlock(selectionEnd);
        this.replaceSelections(text);
        curPosFinal = selectionStart;
      } else if (vim.visualBlock) {
        this.replaceSelections(emptyStrings);
        this.setCursor(selectionStart);
        this.replaceRange(text, selectionStart, selectionStart);
        curPosFinal = selectionStart;
      } else {
        this.replaceRange(text, selectionStart, selectionEnd);
        curPosFinal = this.posFromIndex(this.indexFromPos(selectionStart) + text.length - 1);
      }
      // restore the the curEnd marker
      if (lastSelectionCurEnd) {
        vim.lastSelection.headMark = this.setBookmark(lastSelectionCurEnd);
      }
      if (linewise) {
        curPosFinal.ch = 0;
      }
    } else {
      if (blockwise) {
        this.setCursor(cur);
        for (var i = 0; i < text.length; i++) {
          var line = cur.line + i;
          if (line > this.lastLine()) {
            this.replaceRange('\n', new Pos(line, 0));
          }
          var lastCh = this.lineLength(line);
          if (lastCh < cur.ch) {
            this.extendLineToColumn(line, cur.ch);
          }
        }
        this.setCursor(cur);
        this.selectBlock(new Pos(cur.line + text.length - 1, cur.ch));
        this.replaceSelections(text);
        curPosFinal = cur;
      } else {
        this.replaceRange(text, cur);
        // Now fine tune the cursor to where we want it.
        if (linewise && actionArgs.after) {
          curPosFinal = new Pos(
            cur.line + 1,
            findFirstNonWhiteSpaceCharacter(this.getLine(cur.line + 1)));
        } else if (linewise && !actionArgs.after) {
          curPosFinal = new Pos(
            cur.line,
            findFirstNonWhiteSpaceCharacter(this.getLine(cur.line)));
        } else if (!linewise && actionArgs.after) {
          idx = this.indexFromPos(cur);
          curPosFinal = this.posFromIndex(idx + text.length - 1);
        } else {
          idx = this.indexFromPos(cur);
          curPosFinal = this.posFromIndex(idx + text.length);
        }
      }
    }
    if (vim.visualMode) {
      this.exitVisualMode(false);
    }
    this.setCursor(curPosFinal);
  },
  undo: function (actionArgs) {
    const _self = this;
    this.operation(function () {
      _self.repeatFn(Mirror.commands.undo, actionArgs.repeat)();
      _self.setCursor(this.getCursor('anchor'));
    });
  },
  redo: function (actionArgs) {
    this.repeatFn(Mirror.commands.redo, actionArgs.repeat)();
  },
  setRegister: function (_cm, actionArgs, vim) {
    vim.inputState.registerName = actionArgs.selectedCharacter;
  },
  setMark: function (actionArgs, vim) {
    var markName = actionArgs.selectedCharacter;
    this.updateMark(vim, markName, this.getCursor());
  },
  replace: function (actionArgs, vim) {
    var replaceWith = actionArgs.selectedCharacter;
    var curStart = this.getCursor();
    var replaceTo;
    var curEnd;
    var selections = this.listSelections();
    if (vim.visualMode) {
      curStart = this.getCursor('start');
      curEnd = this.getCursor('end');
    } else {
      var line = this.getLine(curStart.line);
      replaceTo = curStart.ch + actionArgs.repeat;
      if (replaceTo > line.length) {
        replaceTo = line.length;
      }
      curEnd = new Pos(curStart.line, replaceTo);
    }
    if (replaceWith == '\n') {
      if (!vim.visualMode) this.replaceRange('', curStart, curEnd);
      // special case, where vim help says to replace by just one line-break
      (Mirror.commands.newlineAndIndentContinueComment || Mirror.commands.newlineAndIndent)(this);
    } else {
      var replaceWithStr = this.getRange(curStart, curEnd);
      //replace all characters in range by selected, but keep linebreaks
      replaceWithStr = replaceWithStr.replace(/[^\n]/g, replaceWith);
      if (vim.visualBlock) {
        // Tabs are split in visua block before replacing
        var spaces = new Array(this.getOption("tabSize") + 1).join(' ');
        replaceWithStr = this.getSelection();
        replaceWithStr = replaceWithStr.replace(/\t/g, spaces).replace(/[^\n]/g, replaceWith).split('\n');
        this.replaceSelections(replaceWithStr);
      } else {
        this.replaceRange(replaceWithStr, curStart, curEnd);
      }
      if (vim.visualMode) {
        curStart = Pos.cursorIsBefore(selections[0].anchor, selections[0].head) ?
          selections[0].anchor : selections[0].head;
        this.setCursor(curStart);
        this.exitVisualMode(false);
      } else {
        this.setCursor(offsetCursor(curEnd, 0, -1));
      }
    }
  },
  incrementNumberToken: function (actionArgs) {
    var cur = this.getCursor();
    var lineStr = this.getLine(cur.line);
    var re = /(-?)(?:(0x)([\da-f]+)|(0b|0|)(\d+))/gi;
    var match;
    var start;
    var end;
    var numberStr;
    while ((match = re.exec(lineStr)) !== null) {
      start = match.index;
      end = start + match[0].length;
      if (cur.ch < end) break;
    }
    if (!actionArgs.backtrack && (end <= cur.ch)) return;
    if (match) {
      var baseStr = match[2] || match[4]
      var digits = match[3] || match[5]
      var increment = actionArgs.increase ? 1 : -1;
      var base = { '0b': 2, '0': 8, '': 10, '0x': 16 }[baseStr.toLowerCase()];
      var number = parseInt(match[1] + digits, base) + (increment * actionArgs.repeat);
      numberStr = number.toString(base);
      var zeroPadding = baseStr ? new Array(digits.length - numberStr.length + 1 + match[1].length).join('0') : ''
      if (numberStr.charAt(0) === '-') {
        numberStr = '-' + baseStr + zeroPadding + numberStr.substr(1);
      } else {
        numberStr = baseStr + zeroPadding + numberStr;
      }
      var from = new Pos(cur.line, start);
      var to = new Pos(cur.line, end);
      this.replaceRange(numberStr, from, to);
    } else {
      return;
    }
    this.setCursor(new Pos(cur.line, start + numberStr.length - 1));
  },
  repeatLastEdit: function (actionArgs, vim) {
    var lastEditInputState = vim.lastEditInputState;
    if (!lastEditInputState) { return; }
    var repeat = actionArgs.repeat;
    if (repeat && actionArgs.repeatIsExplicit) {
      vim.lastEditInputState.repeatOverride = repeat;
    } else {
      repeat = vim.lastEditInputState.repeatOverride || repeat;
    }
    this.repeatLastEdit(vim, repeat, false /** repeatForInsert */);
  },
  indent: function (actionArgs) {
    this.indentLine(this.getCursor().line, actionArgs.indentRight);
  },
  exitInsertMode: function () {
    var vim = this.state.vim;
    var macroModeState = this.vimApi.state.macroModeState;
    var insertModeChangeRegister = this.vim.registerController.getRegister('.');
    var isPlaying = macroModeState.isPlaying;
    var lastChange = macroModeState.lastInsertModeChanges;
    if (!isPlaying) {
      this.off('change', onChange);
      Mirror.off(this.getInputField(), 'keydown', this.onKeyEventTargetKeyDown.bind(this));
    }
    if (!isPlaying && vim.insertModeRepeat > 1) {
      // Perform insert mode repeat for commands like 3,a and 3,o.
      this.repeatLastEdit(vim, vim.insertModeRepeat - 1,
        true /** repeatForInsert */);
      vim.lastEditInputState.repeatOverride = vim.insertModeRepeat;
    }
    delete vim.insertModeRepeat;
    vim.insertMode = false;
    this.setCursor(this.getCursor().line, this.getCursor().ch - 1);
    this.setOption('keyMap', 'vim');
    this.setOption('disableInput', true);
    this.toggleOverwrite(false); // exit replace mode if we were in it.
    // update the ". register before exiting insert mode
    insertModeChangeRegister.setText(lastChange.changes.join(''));
    Mirror.signal(this, "vim-mode-change", { mode: "normal" });
    if (macroModeState.isRecording) {
      logInsertModeChange(macroModeState);
    }
  }
};