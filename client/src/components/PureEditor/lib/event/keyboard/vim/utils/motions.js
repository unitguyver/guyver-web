import Pos from "../lib/Pos";

function findFirstNonWhiteSpaceCharacter(text) {
  if (!text) {
    return 0;
  }
  var firstNonWS = text.search(/\S/);
  return firstNonWS == -1 ? text.length : firstNonWS;
}

function moveToEol(cm, head, motionArgs, vim, keepHPos) {
  var cur = head;
  var retval = new Pos(cur.line + motionArgs.repeat - 1, Infinity);
  var end = cm.clipPos(retval);
  end.ch--;
  if (!keepHPos) {
    vim.lastHPos = Infinity;
    vim.lastHSPos = cm.charCoords(end, 'div').left;
  }
  return retval;
}

export default {
  moveToTopLine: function (cm, _head, motionArgs) {
    var line = getUserVisibleLines(cm).top + motionArgs.repeat - 1;
    return new Pos(line, findFirstNonWhiteSpaceCharacter(cm.getLine(line)));
  },
  moveToMiddleLine: function (cm) {
    var range = getUserVisibleLines(cm);
    var line = Math.floor((range.top + range.bottom) * 0.5);
    return new Pos(line, findFirstNonWhiteSpaceCharacter(cm.getLine(line)));
  },
  moveToBottomLine: function (cm, _head, motionArgs) {
    var line = getUserVisibleLines(cm).bottom - motionArgs.repeat + 1;
    return new Pos(line, findFirstNonWhiteSpaceCharacter(cm.getLine(line)));
  },
  expandToLine: function (_cm, head, motionArgs) {
    // Expands forward to end of line, and then to next line if repeat is
    // >1. Does not handle backward motion!
    var cur = head;
    return new Pos(cur.line + motionArgs.repeat - 1, Infinity);
  },
  findNext: function (cm, _head, motionArgs) {
    var state = getSearchState(cm);
    var query = state.getQuery();
    if (!query) {
      return;
    }
    var prev = !motionArgs.forward;
    // If search is initiated with ? instead of /, negate direction.
    prev = (state.isReversed()) ? !prev : prev;
    highlightSearchMatches(cm, query);
    return findNext(cm, prev/** prev */, query, motionArgs.repeat);
  },
  /**
   * Find and select the next occurrence of the search query. If the cursor is currently
   * within a match, then find and select the current match. Otherwise, find the next occurrence in the
   * appropriate direction.
   *
   * This differs from `findNext` in the following ways:
   *
   * 1. Instead of only returning the "from", this returns a "from", "to" range.
   * 2. If the cursor is currently inside a search match, this selects the current match
   *    instead of the next match.
   * 3. If there is no associated operator, this will turn on visual mode.
   */
  findAndSelectNextInclusive: function (cm, _head, motionArgs, vim, prevInputState) {
    var state = getSearchState(cm);
    var query = state.getQuery();

    if (!query) {
      return;
    }

    var prev = !motionArgs.forward;
    prev = (state.isReversed()) ? !prev : prev;

    // next: [from, to] | null
    var next = findNextFromAndToInclusive(cm, prev, query, motionArgs.repeat, vim);

    // No matches.
    if (!next) {
      return;
    }

    // If there's an operator that will be executed, return the selection.
    if (prevInputState.operator) {
      return next;
    }

    // At this point, we know that there is no accompanying operator -- let's
    // deal with visual mode in order to select an appropriate match.

    var from = next[0];
    // For whatever reason, when we use the "to" as returned by searchcursor.js directly,
    // the resulting selection is extended by 1 char. Let's shrink it so that only the
    // match is selected.
    var to = new Pos(next[1].line, next[1].ch - 1);

    if (vim.visualMode) {
      // If we were in visualLine or visualBlock mode, get out of it.
      if (vim.visualLine || vim.visualBlock) {
        vim.visualLine = false;
        vim.visualBlock = false;
        CodeMirror.signal(cm, "vim-mode-change", { mode: "visual", subMode: "" });
      }

      // If we're currently in visual mode, we should extend the selection to include
      // the search result.
      var anchor = vim.sel.anchor;
      if (anchor) {
        if (state.isReversed()) {
          if (motionArgs.forward) {
            return [anchor, from];
          }

          return [anchor, to];
        } else {
          if (motionArgs.forward) {
            return [anchor, to];
          }

          return [anchor, from];
        }
      }
    } else {
      // Let's turn visual mode on.
      vim.visualMode = true;
      vim.visualLine = false;
      vim.visualBlock = false;
      CodeMirror.signal(cm, "vim-mode-change", { mode: "visual", subMode: "" });
    }

    return prev ? [to, from] : [from, to];
  },
  goToMark: function (cm, _head, motionArgs, vim) {
    var pos = Pos.getMarkPos(cm, vim, motionArgs.selectedCharacter);
    if (pos) {
      return motionArgs.linewise ? { line: pos.line, ch: findFirstNonWhiteSpaceCharacter(cm.getLine(pos.line)) } : pos;
    }
    return null;
  },
  moveToOtherHighlightedEnd: function (cm, _head, motionArgs, vim) {
    if (vim.visualBlock && motionArgs.sameLine) {
      var sel = vim.sel;
      return [
        cm.clipCursorToContent(new Pos(sel.anchor.line, sel.head.ch)),
        cm.clipCursorToContent(new Pos(sel.head.line, sel.anchor.ch))
      ];
    } else {
      return ([vim.sel.head, vim.sel.anchor]);
    }
  },
  jumpToMark: function (cm, head, motionArgs, vim) {
    var best = head;
    for (var i = 0; i < motionArgs.repeat; i++) {
      var cursor = best;
      for (var key in vim.marks) {
        if (!isLowerCase(key)) {
          continue;
        }
        var mark = vim.marks[key].find();
        var isWrongDirection = (motionArgs.forward) ?
          Pos.cursorIsBefore(mark, cursor) : Pos.cursorIsBefore(cursor, mark);

        if (isWrongDirection) {
          continue;
        }
        if (motionArgs.linewise && (mark.line == cursor.line)) {
          continue;
        }

        var equal = cursorEqual(cursor, best);
        var between = (motionArgs.forward) ?
          cursorIsBetween(cursor, mark, best) :
          cursorIsBetween(best, mark, cursor);

        if (equal || between) {
          best = mark;
        }
      }
    }

    if (motionArgs.linewise) {
      // Vim places the cursor on the first non-whitespace character of
      // the line if there is one, else it places the cursor at the end
      // of the line, regardless of whether a mark was found.
      best = new Pos(best.line, findFirstNonWhiteSpaceCharacter(cm.getLine(best.line)));
    }
    return best;
  },
  moveByCharacters: function (_cm, head, motionArgs) {
    var cur = head;
    var repeat = motionArgs.repeat;
    var ch = motionArgs.forward ? cur.ch + repeat : cur.ch - repeat;
    return new Pos(cur.line, ch);
  },
  moveByLines: function (cm, head, motionArgs, vim) {
    var cur = head;
    var endCh = cur.ch;
    // Depending what our last motion was, we may want to do different
    // things. If our last motion was moving vertically, we want to
    // preserve the HPos from our last horizontal move.  If our last motion
    // was going to the end of a line, moving vertically we should go to
    // the end of the line, etc.
    switch (vim.lastMotion) {
      case this.moveByLines:
      case this.moveByDisplayLines:
      case this.moveByScroll:
      case this.moveToColumn:
      case this.moveToEol:
        endCh = vim.lastHPos;
        break;
      default:
        vim.lastHPos = endCh;
    }
    var repeat = motionArgs.repeat + (motionArgs.repeatOffset || 0);
    var line = motionArgs.forward ? cur.line + repeat : cur.line - repeat;
    var first = cm.firstLine();
    var last = cm.lastLine();
    // Vim go to line begin or line end when cursor at first/last line and
    // move to previous/next line is triggered.
    if (line < first && cur.line == first) {
      return this.moveToStartOfLine(cm, head, motionArgs, vim);
    } else if (line > last && cur.line == last) {
      return moveToEol(cm, head, motionArgs, vim, true);
    }
    // ace_patch{
    var fold = cm.ace.session.getFoldLine(line);
    if (fold) {
      if (motionArgs.forward) {
        if (line > fold.start.row)
          line = fold.end.row + 1;
      } else {
        line = fold.start.row;
      }
    }
    // ace_patch}
    if (motionArgs.toFirstChar) {
      endCh = findFirstNonWhiteSpaceCharacter(cm.getLine(line));
      vim.lastHPos = endCh;
    }
    vim.lastHSPos = cm.charCoords(new Pos(line, endCh), 'div').left;
    return new Pos(line, endCh);
  },
  moveByDisplayLines: function (cm, head, motionArgs, vim) {
    var cur = head;
    switch (vim.lastMotion) {
      case this.moveByDisplayLines:
      case this.moveByScroll:
      case this.moveByLines:
      case this.moveToColumn:
      case this.moveToEol:
        break;
      default:
        vim.lastHSPos = cm.charCoords(cur, 'div').left;
    }
    var repeat = motionArgs.repeat;
    var res = cm.findPosV(cur, (motionArgs.forward ? repeat : -repeat), 'line', vim.lastHSPos);
    if (res.hitSide) {
      if (motionArgs.forward) {
        var lastCharCoords = cm.charCoords(res, 'div');
        var goalCoords = { top: lastCharCoords.top + 8, left: vim.lastHSPos };
        var res = cm.coordsChar(goalCoords, 'div');
      } else {
        var resCoords = cm.charCoords(new Pos(cm.firstLine(), 0), 'div');
        resCoords.left = vim.lastHSPos;
        res = cm.coordsChar(resCoords, 'div');
      }
    }
    vim.lastHPos = res.ch;
    return res;
  },
  moveByPage: function (cm, head, motionArgs) {
    // CodeMirror only exposes functions that move the cursor page down, so
    // doing this bad hack to move the cursor and move it back. evalInput
    // will move the cursor to where it should be in the end.
    var curStart = head;
    var repeat = motionArgs.repeat;
    return cm.findPosV(curStart, (motionArgs.forward ? repeat : -repeat), 'page');
  },
  moveByParagraph: function (cm, head, motionArgs) {
    var dir = motionArgs.forward ? 1 : -1;
    return findParagraph(cm, head, motionArgs.repeat, dir);
  },
  moveBySentence: function (cm, head, motionArgs) {
    var dir = motionArgs.forward ? 1 : -1;
    return findSentence(cm, head, motionArgs.repeat, dir);
  },
  moveByScroll: function (cm, head, motionArgs, vim) {
    var scrollbox = cm.getScrollInfo();
    var curEnd = null;
    var repeat = motionArgs.repeat;
    if (!repeat) {
      repeat = scrollbox.clientHeight / (2 * cm.defaultTextHeight());
    }
    var orig = cm.charCoords(head, 'local');
    motionArgs.repeat = repeat;
    var curEnd = motions.moveByDisplayLines(cm, head, motionArgs, vim);
    if (!curEnd) {
      return null;
    }
    var dest = cm.charCoords(curEnd, 'local');
    cm.scrollTo(null, scrollbox.top + dest.top - orig.top);
    return curEnd;
  },
  moveByWords: function (cm, head, motionArgs) {
    return moveToWord(cm, head, motionArgs.repeat, !!motionArgs.forward,
      !!motionArgs.wordEnd, !!motionArgs.bigWord);
  },
  moveTillCharacter: function (cm, _head, motionArgs) {
    var repeat = motionArgs.repeat;
    var curEnd = moveToCharacter(cm, repeat, motionArgs.forward,
      motionArgs.selectedCharacter);
    var increment = motionArgs.forward ? -1 : 1;
    recordLastCharacterSearch(increment, motionArgs);
    if (!curEnd) return null;
    curEnd.ch += increment;
    return curEnd;
  },
  moveToCharacter: function (cm, head, motionArgs) {
    var repeat = motionArgs.repeat;
    recordLastCharacterSearch(0, motionArgs);
    return moveToCharacter(cm, repeat, motionArgs.forward,
      motionArgs.selectedCharacter) || head;
  },
  moveToSymbol: function (cm, head, motionArgs) {
    var repeat = motionArgs.repeat;
    return findSymbol(cm, repeat, motionArgs.forward,
      motionArgs.selectedCharacter) || head;
  },
  moveToColumn: function (cm, head, motionArgs, vim) {
    var repeat = motionArgs.repeat;
    // repeat is equivalent to which column we want to move to!
    vim.lastHPos = repeat - 1;
    vim.lastHSPos = cm.charCoords(head, 'div').left;
    return moveToColumn(cm, repeat);
  },
  moveToEol: function (cm, head, motionArgs, vim) {
    return moveToEol(cm, head, motionArgs, vim, false);
  },
  moveToFirstNonWhiteSpaceCharacter: function (cm, head) {
    // Go to the start of the line where the text begins, or the end for
    // whitespace-only lines
    var cursor = head;
    return new Pos(cursor.line,
      findFirstNonWhiteSpaceCharacter(cm.getLine(cursor.line)));
  },
  moveToMatchedSymbol: function (cm, head) {
    var cursor = head;
    var line = cursor.line;
    var ch = cursor.ch;
    var lineText = cm.getLine(line);
    var symbol;
    for (; ch < lineText.length; ch++) {
      symbol = lineText.charAt(ch);
      if (symbol && isMatchableSymbol(symbol)) {
        var style = cm.getTokenTypeAt(new Pos(line, ch + 1));
        if (style !== "string" && style !== "comment") {
          break;
        }
      }
    }
    if (ch < lineText.length) {
      // Only include angle brackets in analysis if they are being matched.
      var re = /[<>]/.test(lineText[ch]) ? /[(){}[\]<>]/ : /[(){}[\]]/; //ace_patch?
      var matched = cm.findMatchingBracket(new Pos(line, ch + 1), { bracketRegex: re });
      return matched.to;
    } else {
      return cursor;
    }
  },
  moveToStartOfLine: function (_cm, head) {
    return new Pos(head.line, 0);
  },
  moveToLineOrEdgeOfDocument: function (cm, _head, motionArgs) {
    var lineNum = motionArgs.forward ? cm.lastLine() : cm.firstLine();
    if (motionArgs.repeatIsExplicit) {
      lineNum = motionArgs.repeat - cm.getOption('firstLineNumber');
    }
    return new Pos(lineNum,
      findFirstNonWhiteSpaceCharacter(cm.getLine(lineNum)));
  },
  textObjectManipulation: function (cm, head, motionArgs, vim) {
    // TODO: lots of possible exceptions that can be thrown here. Try da(
    //     outside of a () block.
    var mirroredPairs = {
      '(': ')', ')': '(',
      '{': '}', '}': '{',
      '[': ']', ']': '[',
      '<': '>', '>': '<'
    };
    var selfPaired = { '\'': true, '"': true, '`': true };

    var character = motionArgs.selectedCharacter;
    // 'b' refers to  '()' block.
    // 'B' refers to  '{}' block.
    if (character == 'b') {
      character = '(';
    } else if (character == 'B') {
      character = '{';
    }

    // Inclusive is the difference between a and i
    // TODO: Instead of using the additional text object map to perform text
    //     object operations, merge the map into the defaultKeyMap and use
    //     motionArgs to define behavior. Define separate entries for 'aw',
    //     'iw', 'a[', 'i[', etc.
    var inclusive = !motionArgs.textObjectInner;

    var tmp;
    if (mirroredPairs[character]) {
      tmp = selectCompanionObject(cm, head, character, inclusive);
    } else if (selfPaired[character]) {
      tmp = findBeginningAndEnd(cm, head, character, inclusive);
    } else if (character === 'W') {
      tmp = expandWordUnderCursor(cm, inclusive, true /** forward */,
        true /** bigWord */);
    } else if (character === 'w') {
      tmp = expandWordUnderCursor(cm, inclusive, true /** forward */,
        false /** bigWord */);
    } else if (character === 'p') {
      tmp = findParagraph(cm, head, motionArgs.repeat, 0, inclusive);
      motionArgs.linewise = true;
      if (vim.visualMode) {
        if (!vim.visualLine) { vim.visualLine = true; }
      } else {
        var operatorArgs = vim.inputState.operatorArgs;
        if (operatorArgs) { operatorArgs.linewise = true; }
        tmp.end.line--;
      }
    } else if (character === 't') {
      tmp = expandTagUnderCursor(cm, head, inclusive);
    } else {
      // No text object defined for this, don't move.
      return null;
    }

    if (!cm.state.vim.visualMode) {
      return [tmp.start, tmp.end];
    } else {
      return expandSelection(cm, tmp.start, tmp.end);
    }
  },

  repeatLastCharacterSearch: function (cm, head, motionArgs) {
    var lastSearch = this.state.lastCharacterSearch;
    var repeat = motionArgs.repeat;
    var forward = motionArgs.forward === lastSearch.forward;
    var increment = (lastSearch.increment ? 1 : 0) * (forward ? -1 : 1);
    cm.moveH(-increment, 'char');
    motionArgs.inclusive = forward ? true : false;
    var curEnd = moveToCharacter(cm, repeat, forward, lastSearch.selectedCharacter);
    if (!curEnd) {
      cm.moveH(increment, 'char');
      return head;
    }
    curEnd.ch += increment;
    return curEnd;
  }
};