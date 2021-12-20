import Pos from "../../../Pos";
import motions from "../../../../utils/motions";
import Mirror from "../../lib/Mirror";

function copyArgs(args) {
  var ret = {};
  for (var prop in args) {
    if (args.hasOwnProperty(prop)) {
      ret[prop] = args[prop];
    }
  }
  return ret;
}

function copyCursor(cur) {
  return new Pos(cur.line, cur.ch);
}

export default {
  processCommand: function (vim, command) {
    vim.inputState.repeatOverride = command.repeatOverride;
    switch (command.type) {
      case 'motion':
        this.processMotion(vim, command);
        break;
      case 'operator':
        this.processOperator(vim, command);
        break;
      case 'operatorMotion':
        this.processOperatorMotion(vim, command);
        break;
      case 'action':
        this.processAction(vim, command);
        break;
      case 'search':
        this.processSearch(vim, command);
        break;
      case 'ex':
      case 'keyToEx':
        this.processEx(vim, command);
        break;
      default:
        break;
    }
  },
  processMotion: function (vim, command) {
    vim.inputState.motion = command.motion;
    vim.inputState.motionArgs = copyArgs(command.motionArgs);
    this.evalInput(vim);
  },
  processOperator: function (vim, command) {
    var inputState = vim.inputState;
    if (inputState.operator) {
      if (inputState.operator == command.operator) {
        // Typing an operator twice like 'dd' makes the operator operate
        // linewise
        inputState.motion = 'expandToLine';
        inputState.motionArgs = { linewise: true };
        this.evalInput(vim);
        return;
      } else {
        // 2 different operators in a row doesn't make sense.
        this.clearInputState();
      }
    }
    inputState.operator = command.operator;
    inputState.operatorArgs = copyArgs(command.operatorArgs);
    if (command.keys.length > 1) {
      inputState.operatorShortcut = command.keys;
    }
    if (command.exitVisualBlock) {
      vim.visualBlock = false;
      this.updateCmSelection();
    }
    if (vim.visualMode) {
      // Operating on a selection in visual mode. We don't need a motion.
      this.evalInput(vim);
    }
  },
  processOperatorMotion: function (vim, command) {
    var visualMode = vim.visualMode;
    var operatorMotionArgs = copyArgs(command.operatorMotionArgs);
    if (operatorMotionArgs) {
      // Operator motions may have special behavior in visual mode.
      if (visualMode && operatorMotionArgs.visualLine) {
        vim.visualLine = true;
      }
    }
    this.processOperator(vim, command);
    if (!visualMode) {
      this.processMotion(vim, command);
    }
  },
  processAction: function (vim, command) {
    var inputState = vim.inputState;
    var repeat = inputState.getRepeat();
    var repeatIsExplicit = !!repeat;
    var actionArgs = copyArgs(command.actionArgs) || {};
    if (inputState.selectedCharacter) {
      actionArgs.selectedCharacter = inputState.selectedCharacter;
    }
    // Actions may or may not have motions and operators. Do these first.
    if (command.operator) {
      this.processOperator(vim, command);
    }
    if (command.motion) {
      this.processMotion(vim, command);
    }
    if (command.motion || command.operator) {
      this.evalInput(vim);
    }
    actionArgs.repeat = repeat || 1;
    actionArgs.repeatIsExplicit = repeatIsExplicit;
    actionArgs.registerName = inputState.registerName;
    this.clearInputState();
    vim.lastMotion = null;
    if (command.isEdit) {
      this.recordLastEdit(vim, inputState, command);
    }
    this[command.action](actionArgs, vim);
  },
  processSearch: function (vim, command) {
    const _self = this;
    if (!this.getSearchCursor) {
      // Search depends on SearchCursor.
      return;
    }
    var forward = command.searchArgs.forward;
    var wholeWordOnly = command.searchArgs.wholeWordOnly;
    this.getSearchState().setReversed(!forward);
    var promptPrefix = (forward) ? '/' : '?';
    var originalQuery = this.getSearchState().getQuery();
    var originalScrollPos = this.getScrollInfo();
    function handleQuery(query, ignoreCase, smartCase) {
      _self.vimApi.state.searchHistoryController.pushInput(query);
      _self.vimApi.state.searchHistoryController.reset();
      try {
        this.updateSearchQuery(query, ignoreCase, smartCase);
      } catch (e) {
        console.log(e)
        this.showConfirm('Invalid regex: ' + query);
        this.clearInputState();
        return;
      }
      _self.processMotion(vim, {
        type: 'motion',
        motion: 'findNext',
        motionArgs: { forward: true, toJumplist: command.searchArgs.toJumplist }
      });
    }
    function onPromptClose(query) {
      //ace_patch this.scrollTo(originalScrollPos.left, originalScrollPos.top);
      handleQuery(query, true /** ignoreCase */, true /** smartCase */);
      var macroModeState = _self.vimApi.state.macroModeState;
      if (macroModeState.isRecording) {
        logSearchQuery(macroModeState, query);
      }
    }
    function onPromptKeyUp(e, query, close) {
      var keyName = Mirror.keyName(e), up, offset;
      if (keyName == 'Up' || keyName == 'Down') {
        up = keyName == 'Up' ? true : false;
        offset = e.target ? e.target.selectionEnd : 0;
        query = _self.vimApi.state.searchHistoryController.nextMatch(query, up) || '';
        close(query);
        if (offset && e.target) e.target.selectionEnd = e.target.selectionStart = Math.min(offset, e.target.value.length);
      } else {
        if (keyName != 'Left' && keyName != 'Right' && keyName != 'Ctrl' && keyName != 'Alt' && keyName != 'Shift')
          _self.vimApi.state.searchHistoryController.reset();
      }
      var parsedQuery;
      try {
        parsedQuery = this.updateSearchQuery(query,
          true /** ignoreCase */, true /** smartCase */);
      } catch (e) {
        console.log(e)
        // Swallow bad regexes for incremental search.
      }
      if (parsedQuery) {
        this.scrollIntoView(findNext(!forward, parsedQuery), 30);
      } else {
        this.clearSearchHighlight();
        this.scrollTo(originalScrollPos.left, originalScrollPos.top);
      }
    }
    function onPromptKeyDown(e, query, close) {
      console.log(e)

      var keyName = Mirror.keyName(e);
      if (keyName == 'Esc' || keyName == 'Ctrl-C' || keyName == 'Ctrl-[' ||
        (keyName == 'Backspace' && query == '')) {
        _self.vimApi.state.searchHistoryController.pushInput(query);
        _self.vimApi.state.searchHistoryController.reset();
        this.updateSearchQuery(originalQuery);
        this.clearSearchHighlight();
        this.scrollTo(originalScrollPos.left, originalScrollPos.top);
        Mirror.e_stop(e);
        this.clearInputState();
        close();
        this.focus();
      } else if (keyName == 'Up' || keyName == 'Down') {
        Mirror.e_stop(e);
      } else if (keyName == 'Ctrl-U') {
        // Ctrl-U clears input.
        Mirror.e_stop(e);
        close('');
      }
    }
    switch (command.searchArgs.querySrc) {
      case 'prompt':
        var macroModeState = _self.vimApi.state.macroModeState;
        if (macroModeState.isPlaying) {
          var query = macroModeState.replaySearchQueries.shift();
          handleQuery(query, true /** ignoreCase */, false /** smartCase */);
        } else {
          this.showPrompt({
            onClose: onPromptClose,
            prefix: promptPrefix,
            desc: '(JavaScript regexp)',
            onKeyUp: onPromptKeyUp,
            onKeyDown: onPromptKeyDown
          });
        }
        break;
      case 'wordUnderCursor':
        var word = this.expandWordUnderCursor(false /** inclusive */,
          true /** forward */, false /** bigWord */,
          true /** noSymbol */);
        var isKeyword = true;
        if (!word) {
          word = this.expandWordUnderCursor(false /** inclusive */,
            true /** forward */, false /** bigWord */,
            false /** noSymbol */);
          isKeyword = false;
        }
        if (!word) {
          return;
        }
        var query = this.getLine(word.start.line).substring(word.start.ch,
          word.end.ch);
        if (isKeyword && wholeWordOnly) {
          query = '\\b' + query + '\\b';
        } else {
          query = escapeRegex(query);
        }

        // cachedCursor is used to save the old position of the cursor
        // when * or # causes vim to seek for the nearest word and shift
        // the cursor before entering the motion.
        _self.vimApi.state.jumpList.cachedCursor = this.getCursor();
        this.setCursor(word.start);

        handleQuery(query, true /** ignoreCase */, false /** smartCase */);
        break;
    }
  },
  processEx: function (vim, command) {
    const _self = this;

    function onPromptClose(input) {
      // Give the prompt some time to close so that if processCommand shows
      // an error, the elements don't overlap.
      _self.vimApi.state.exCommandHistoryController.pushInput(input);
      _self.vimApi.state.exCommandHistoryController.reset();
      // exCommandDispatcher.processCommand( input);
    }
    function onPromptKeyDown(e, input, close) {
      var keyName = Mirror.keyName(e), up, offset;
      if (keyName == 'Esc' || keyName == 'Ctrl-C' || keyName == 'Ctrl-[' ||
        (keyName == 'Backspace' && input == '')) {
        _self.vimApi.state.exCommandHistoryController.pushInput(input);
        _self.vimApi.state.exCommandHistoryController.reset();
        Mirror.e_stop(e);
        this.clearInputState();
        close();
        this.focus();
      }
      if (keyName == 'Up' || keyName == 'Down') {
        Mirror.e_stop(e);
        up = keyName == 'Up' ? true : false;
        offset = e.target ? e.target.selectionEnd : 0;
        input = _self.vimApi.state.exCommandHistoryController.nextMatch(input, up) || '';
        close(input);
        if (offset && e.target) e.target.selectionEnd = e.target.selectionStart = Math.min(offset, e.target.value.length);
      } else if (keyName == 'Ctrl-U') {
        // Ctrl-U clears input.
        Mirror.e_stop(e);
        close('');
      } else {
        if (keyName != 'Left' && keyName != 'Right' && keyName != 'Ctrl' && keyName != 'Alt' && keyName != 'Shift')
          _self.vimApi.state.exCommandHistoryController.reset();
      }
    }
    if (command.type == 'keyToEx') {
      // Handle user defined Ex to Ex mappings
      // exCommandDispatcher.processCommand(cm, command.exArgs.input);
    } else {
      if (vim.visualMode) {
        this.showPrompt({
          onClose: onPromptClose, prefix: ':', value: '\'<,\'>',
          onKeyDown: onPromptKeyDown, selectValueOnOpen: false
        });
      } else {
        this.showPrompt({
          onClose: onPromptClose, prefix: ':',
          onKeyDown: onPromptKeyDown
        });
      }
    }
  },
  evalInput: function (vim) {
    // If the motion command is set, execute both the operator and motion.
    // Otherwise return.
    var inputState = vim.inputState;
    var motion = inputState.motion;
    var motionArgs = inputState.motionArgs || {};
    var operator = inputState.operator;
    var operatorArgs = inputState.operatorArgs || {};
    var registerName = inputState.registerName;
    var sel = vim.sel;
    // TODO: Make sure cm and vim selections are identical outside visual mode.
    var origHead = copyCursor(vim.visualMode ? this.clipCursorToContent(sel.head) : this.getCursor('head'));
    var origAnchor = copyCursor(vim.visualMode ? this.clipCursorToContent(sel.anchor) : this.getCursor('anchor'));
    var oldHead = copyCursor(origHead);
    var oldAnchor = copyCursor(origAnchor);
    var newHead, newAnchor;
    var repeat;
    if (operator) {
      this.recordLastEdit(vim, inputState);
    }
    if (inputState.repeatOverride !== undefined) {
      // If repeatOverride is specified, that takes precedence over the
      // input state's repeat. Used by Ex mode and can be user defined.
      repeat = inputState.repeatOverride;
    } else {
      repeat = inputState.getRepeat();
    }
    if (repeat > 0 && motionArgs.explicitRepeat) {
      motionArgs.repeatIsExplicit = true;
    } else if (motionArgs.noRepeat ||
      (!motionArgs.explicitRepeat && repeat === 0)) {
      repeat = 1;
      motionArgs.repeatIsExplicit = false;
    }
    if (inputState.selectedCharacter) {
      // If there is a character input, stick it in all of the arg arrays.
      motionArgs.selectedCharacter = operatorArgs.selectedCharacter =
        inputState.selectedCharacter;
    }
    motionArgs.repeat = repeat;
    this.clearInputState();
    if (motion) {
      var motionResult = motions[motion](this, origHead, motionArgs, vim, inputState);
      vim.lastMotion = motions[motion];
      if (!motionResult) {
        return;
      }
      if (motionArgs.toJumplist) {
        if (!operator && this.ace.curOp != null)
          this.ace.curOp.command.scrollIntoView = "center-animate"; // ace_patch
        var jumpList = this.vimApi.state.jumpList;
        // if the current motion is # or *, use cachedCursor
        var cachedCursor = jumpList.cachedCursor;
        if (cachedCursor) {
          this.recordJumpPosition(cachedCursor, motionResult);
          delete jumpList.cachedCursor;
        } else {
          this.recordJumpPosition(origHead, motionResult);
        }
      }
      if (motionResult instanceof Array) {
        newAnchor = motionResult[0];
        newHead = motionResult[1];
      } else {
        newHead = motionResult;
      }
      // TODO: Handle null returns from motion commands better.
      if (!newHead) {
        newHead = copyCursor(origHead);
      }
      if (vim.visualMode) {
        if (!(vim.visualBlock && newHead.ch === Infinity)) {
          newHead = this.clipCursorToContent(newHead);
        }
        if (newAnchor) {
          newAnchor = this.clipCursorToContent(newAnchor);
        }
        newAnchor = newAnchor || oldAnchor;
        sel.anchor = newAnchor;
        sel.head = newHead;
        this.updateCmSelection();
        this.updateMark(vim, '<',
          Pos.cursorIsBefore(newAnchor, newHead) ? newAnchor
            : newHead);
        this.updateMark(vim, '>',
          Pos.cursorIsBefore(newAnchor, newHead) ? newHead
            : newAnchor);
      } else if (!operator) {
        newHead = this.clipCursorToContent(newHead);
        this.setCursor(newHead.line, newHead.ch);
      }
    }
    if (operator) {
      if (operatorArgs.lastSel) {
        // Replaying a visual mode operation
        newAnchor = oldAnchor;
        var lastSel = operatorArgs.lastSel;
        var lineOffset = Math.abs(lastSel.head.line - lastSel.anchor.line);
        var chOffset = Math.abs(lastSel.head.ch - lastSel.anchor.ch);
        if (lastSel.visualLine) {
          // Linewise Visual mode: The same number of lines.
          newHead = new Pos(oldAnchor.line + lineOffset, oldAnchor.ch);
        } else if (lastSel.visualBlock) {
          // Blockwise Visual mode: The same number of lines and columns.
          newHead = new Pos(oldAnchor.line + lineOffset, oldAnchor.ch + chOffset);
        } else if (lastSel.head.line == lastSel.anchor.line) {
          // Normal Visual mode within one line: The same number of characters.
          newHead = new Pos(oldAnchor.line, oldAnchor.ch + chOffset);
        } else {
          // Normal Visual mode with several lines: The same number of lines, in the
          // last line the same number of characters as in the last line the last time.
          newHead = new Pos(oldAnchor.line + lineOffset, oldAnchor.ch);
        }
        vim.visualMode = true;
        vim.visualLine = lastSel.visualLine;
        vim.visualBlock = lastSel.visualBlock;
        sel = vim.sel = {
          anchor: newAnchor,
          head: newHead
        };
        this.updateCmSelection();
      } else if (vim.visualMode) {
        operatorArgs.lastSel = {
          anchor: copyCursor(sel.anchor),
          head: copyCursor(sel.head),
          visualBlock: vim.visualBlock,
          visualLine: vim.visualLine
        };
      }
      var curStart, curEnd, linewise, mode;
      var cmSel;
      if (vim.visualMode) {
        // Init visual op
        curStart = cursorMin(sel.head, sel.anchor);
        curEnd = cursorMax(sel.head, sel.anchor);
        linewise = vim.visualLine || operatorArgs.linewise;
        mode = vim.visualBlock ? 'block' :
          linewise ? 'line' :
            'char';
        cmSel = this.makeCmSelection({
          anchor: curStart,
          head: curEnd
        }, mode);
        if (linewise) {
          var ranges = cmSel.ranges;
          if (mode == 'block') {
            // Linewise operators in visual block mode extend to end of line
            for (var i = 0; i < ranges.length; i++) {
              ranges[i].head.ch = this.lineLength(ranges[i].head.line);
            }
          } else if (mode == 'line') {
            ranges[0].head = new Pos(ranges[0].head.line + 1, 0);
          }
        }
      } else {
        // Init motion op
        curStart = copyCursor(newAnchor || oldAnchor);
        curEnd = copyCursor(newHead || oldHead);
        if (Pos.cursorIsBefore(curEnd, curStart)) {
          var tmp = curStart;
          curStart = curEnd;
          curEnd = tmp;
        }
        linewise = motionArgs.linewise || operatorArgs.linewise;
        if (linewise) {
          // Expand selection to entire line.
          this.expandSelectionToLine(curStart, curEnd);
        } else if (motionArgs.forward) {
          // Clip to trailing newlines only if the motion goes forward.
          this.clipToLine(curStart, curEnd);
        }
        mode = 'char';
        var exclusive = !motionArgs.inclusive || linewise;
        cmSel = this.makeCmSelection({
          anchor: curStart,
          head: curEnd
        }, mode, exclusive);
      }
      this.setSelections(cmSel.ranges, cmSel.primary);
      vim.lastMotion = null;
      operatorArgs.repeat = repeat; // For indent in visual mode.
      operatorArgs.registerName = registerName;
      // Keep track of linewise as it affects how paste and change behave.
      operatorArgs.linewise = linewise;
      var operatorMoveTo = operators[operator](
        this, operatorArgs, cmSel.ranges, oldAnchor, newHead);
      if (vim.visualMode) {
        this.exitVisualMode(operatorMoveTo != null);
      }
      if (operatorMoveTo) {
        this.setCursor(operatorMoveTo);
      }
    }
  },
  clipToLine(curStart, curEnd) {
    var selection = this.getRange(curStart, curEnd);
    if (/\n\s*$/.test(selection)) {
      var lines = selection.split('\n');
      // We know this is all whitespace.
      lines.pop();
      var line;
      for (var line = lines.pop(); lines.length > 0 && line && isWhiteSpaceString(line); line = lines.pop()) {
        curEnd.line--;
        curEnd.ch = 0;
      }
      if (line) {
        curEnd.line--;
        curEnd.ch = this.lineLength(curEnd.line);
      } else {
        curEnd.ch = 0;
      }
    }
  },
  recordLastEdit: function (vim, inputState, actionCommand) {
    var macroModeState = this.vimApi.state.macroModeState;
    if (macroModeState.isPlaying) { return; }
    vim.lastEditInputState = inputState;
    vim.lastEditActionCommand = actionCommand;
    macroModeState.lastInsertModeChanges.changes = [];
    macroModeState.lastInsertModeChanges.expectCursorActivityForChange = false;
    macroModeState.lastInsertModeChanges.visualBlock = vim.visualBlock ? vim.sel.head.line - vim.sel.anchor.line : 0;
  }
};
