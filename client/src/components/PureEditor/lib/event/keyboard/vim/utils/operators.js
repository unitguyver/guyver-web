export default operators = {
  change: function (cm, args, ranges) {
    var finalHead, text;
    var vim = cm.state.vim;
    var anchor = ranges[0].anchor,
      head = ranges[0].head;
    if (!vim.visualMode) {
      text = cm.getRange(anchor, head);
      var lastState = vim.lastEditInputState || {};
      if (lastState.motion == "moveByWords" && !isWhiteSpaceString(text)) {
        // Exclude trailing whitespace if the range is not all whitespace.
        var match = (/\s+$/).exec(text);
        if (match && lastState.motionArgs && lastState.motionArgs.forward) {
          head = offsetCursor(head, 0, - match[0].length);
          text = text.slice(0, - match[0].length);
        }
      }
      var prevLineEnd = new Pos(anchor.line - 1, Number.MAX_VALUE);
      var wasLastLine = cm.firstLine() == cm.lastLine();
      if (head.line > cm.lastLine() && args.linewise && !wasLastLine) {
        cm.replaceRange('', prevLineEnd, head);
      } else {
        cm.replaceRange('', anchor, head);
      }
      if (args.linewise) {
        // Push the next line back down, if there is a next line.
        if (!wasLastLine) {
          cm.setCursor(prevLineEnd);
          CodeMirror.commands.newlineAndIndent(cm);
        }
        // make sure cursor ends up at the end of the line.
        anchor.ch = Number.MAX_VALUE;
      }
      finalHead = anchor;
    } else if (args.fullLine) {
      head.ch = Number.MAX_VALUE;
      head.line--;
      cm.setSelection(anchor, head)
      text = cm.getSelection();
      cm.replaceSelection("");
      finalHead = anchor;
    } else {
      text = cm.getSelection();
      var replacement = fillArray('', ranges.length);
      cm.replaceSelections(replacement);
      finalHead = cursorMin(ranges[0].head, ranges[0].anchor);
    }
    this.state.registerController.pushText(
      args.registerName, 'change', text,
      args.linewise, ranges.length > 1);
    cm.enterInsertMode({ head: finalHead }, cm.state.vim);
  },
  // delete is a javascript keyword.
  'delete': function (cm, args, ranges) {
    var finalHead, text;
    var vim = cm.state.vim;
    if (!vim.visualBlock) {
      var anchor = ranges[0].anchor,
        head = ranges[0].head;
      if (args.linewise &&
        head.line != cm.firstLine() &&
        anchor.line == cm.lastLine() &&
        anchor.line == head.line - 1) {
        // Special case for dd on last line (and first line).
        if (anchor.line == cm.firstLine()) {
          anchor.ch = 0;
        } else {
          anchor = new Pos(anchor.line - 1, lineLength(cm, anchor.line - 1));
        }
      }
      text = cm.getRange(anchor, head);
      cm.replaceRange('', anchor, head);
      finalHead = anchor;
      if (args.linewise) {
        finalHead = motions.moveToFirstNonWhiteSpaceCharacter(cm, anchor);
      }
    } else {
      text = cm.getSelection();
      var replacement = fillArray('', ranges.length);
      cm.replaceSelections(replacement);
      finalHead = cursorMin(ranges[0].head, ranges[0].anchor);
    }
    this.state.registerController.pushText(
      args.registerName, 'delete', text,
      args.linewise, vim.visualBlock);
    return cm.clipCursorToContent(finalHead);
  },
  indent: function (cm, args, ranges) {
    var vim = cm.state.vim;
    var startLine = ranges[0].anchor.line;
    var endLine = vim.visualBlock ?
      ranges[ranges.length - 1].anchor.line :
      ranges[0].head.line;
    // In visual mode, n> shifts the selection right n times, instead of
    // shifting n lines right once.
    var repeat = (vim.visualMode) ? args.repeat : 1;
    if (args.linewise) {
      // The only way to delete a newline is to delete until the start of
      // the next line, so in linewise mode evalInput will include the next
      // line. We don't want this in indent, so we go back a line.
      endLine--;
    }
    for (var i = startLine; i <= endLine; i++) {
      for (var j = 0; j < repeat; j++) {
        cm.indentLine(i, args.indentRight);
      }
    }
    return motions.moveToFirstNonWhiteSpaceCharacter(cm, ranges[0].anchor);
  },
  indentAuto: function (cm, _args, ranges) {
    if (ranges.length > 1) { // ace_patch
      cm.setSelection(ranges[0].anchor, ranges[ranges.length - 1].head);
    }
    cm.execCommand("indentAuto");
    return motions.moveToFirstNonWhiteSpaceCharacter(cm, ranges[0].anchor);
  },
  changeCase: function (cm, args, ranges, oldAnchor, newHead) {
    var selections = cm.getSelections();
    var swapped = [];
    var toLower = args.toLower;
    for (var j = 0; j < selections.length; j++) {
      var toSwap = selections[j];
      var text = '';
      if (toLower === true) {
        text = toSwap.toLowerCase();
      } else if (toLower === false) {
        text = toSwap.toUpperCase();
      } else {
        for (var i = 0; i < toSwap.length; i++) {
          var character = toSwap.charAt(i);
          text += isUpperCase(character) ? character.toLowerCase() :
            character.toUpperCase();
        }
      }
      swapped.push(text);
    }
    cm.replaceSelections(swapped);
    if (args.shouldMoveCursor) {
      return newHead;
    } else if (!cm.state.vim.visualMode && args.linewise && ranges[0].anchor.line + 1 == ranges[0].head.line) {
      return motions.moveToFirstNonWhiteSpaceCharacter(cm, oldAnchor);
    } else if (args.linewise) {
      return oldAnchor;
    } else {
      return cursorMin(ranges[0].anchor, ranges[0].head);
    }
  },
  yank: function (cm, args, ranges, oldAnchor) {
    var vim = cm.state.vim;
    var text = cm.getSelection();
    var endPos = vim.visualMode
      ? cursorMin(vim.sel.anchor, vim.sel.head, ranges[0].head, ranges[0].anchor)
      : oldAnchor;
    this.state.registerController.pushText(
      args.registerName, 'yank',
      text, args.linewise, vim.visualBlock);
    return endPos;
  }
};