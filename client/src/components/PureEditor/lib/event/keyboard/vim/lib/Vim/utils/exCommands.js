import Mirror from "../../CodeMirror/lib/Mirror";
import StringStream from "../../CodeMirror/lib/StringStream";
import Pos from "../../Pos";

export default {
  colorscheme: function (cm, params) {
    if (!params.args || params.args.length < 1) {
      showConfirm(cm, cm.getOption('theme'));
      return;
    }
    cm.setOption('theme', params.args[0]);
  },
  map: function (cm, params, ctx) {
    var mapArgs = params.args;
    if (!mapArgs || mapArgs.length < 2) {
      if (cm) {
        showConfirm(cm, 'Invalid mapping: ' + params.input);
      }
      return;
    }
    exCommandDispatcher.map(mapArgs[0], mapArgs[1], ctx);
  },
  imap: function (cm, params) { this.map(cm, params, 'insert'); },
  nmap: function (cm, params) { this.map(cm, params, 'normal'); },
  vmap: function (cm, params) { this.map(cm, params, 'visual'); },
  unmap: function (cm, params, ctx) {
    var mapArgs = params.args;
    if (!mapArgs || mapArgs.length < 1 || !exCommandDispatcher.unmap(mapArgs[0], ctx)) {
      if (cm) {
        showConfirm(cm, 'No such mapping: ' + params.input);
      }
    }
  },
  move: function (cm, params) {
    cm.processCommand(cm.state.vim, {
      type: 'motion',
      motion: 'moveToLineOrEdgeOfDocument',
      motionArgs: {
        forward: false, explicitRepeat: true,
        linewise: true
      },
      repeatOverride: params.line + 1
    });
  },
  set: function (cm, params) {
    var setArgs = params.args;
    // Options passed through to the setOption/getOption calls. May be passed in by the
    // local/global versions of the set command
    var setCfg = params.setCfg || {};
    if (!setArgs || setArgs.length < 1) {
      if (cm) {
        showConfirm(cm, 'Invalid mapping: ' + params.input);
      }
      return;
    }
    var expr = setArgs[0].split('=');
    var optionName = expr[0];
    var value = expr[1];
    var forceGet = false;

    if (optionName.charAt(optionName.length - 1) == '?') {
      // If post-fixed with ?, then the set is actually a get.
      if (value) { throw Error('Trailing characters: ' + params.argString); }
      optionName = optionName.substring(0, optionName.length - 1);
      forceGet = true;
    }
    if (value === undefined && optionName.substring(0, 2) == 'no') {
      // To set boolean options to false, the option name is prefixed with
      // 'no'.
      optionName = optionName.substring(2);
      value = false;
    }

    var optionIsBoolean = options[optionName] && options[optionName].type == 'boolean';
    if (optionIsBoolean && value == undefined) {
      // Calling set with a boolean option sets it to true.
      value = true;
    }
    // If no value is provided, then we assume this is a get.
    if (!optionIsBoolean && value === undefined || forceGet) {
      var oldValue = getOption(optionName, cm, setCfg);
      if (oldValue instanceof Error) {
        showConfirm(cm, oldValue.message);
      } else if (oldValue === true || oldValue === false) {
        showConfirm(cm, ' ' + (oldValue ? '' : 'no') + optionName);
      } else {
        showConfirm(cm, '  ' + optionName + '=' + oldValue);
      }
    } else {
      var setOptionReturn = setOption(optionName, value, cm, setCfg);
      if (setOptionReturn instanceof Error) {
        showConfirm(cm, setOptionReturn.message);
      }
    }
  },
  setlocal: function (cm, params) {
    // setCfg is passed through to setOption
    params.setCfg = { scope: 'local' };
    this.set(cm, params);
  },
  setglobal: function (cm, params) {
    // setCfg is passed through to setOption
    params.setCfg = { scope: 'global' };
    this.set(cm, params);
  },
  registers: function (cm, params) {
    var regArgs = params.args;
    var registers = this.state.registerController.registers;
    var regInfo = '----------Registers----------\n\n';
    if (!regArgs) {
      for (var registerName in registers) {
        var text = registers[registerName].toString();
        if (text.length) {
          regInfo += '"' + registerName + '    ' + text + '\n'
        }
      }
    } else {
      var registerName;
      regArgs = regArgs.join('');
      for (var i = 0; i < regArgs.length; i++) {
        registerName = regArgs.charAt(i);
        if (!this.state.registerController.isValidRegister(registerName)) {
          continue;
        }
        var register = registers[registerName] || new Register();
        regInfo += '"' + registerName + '    ' + register.toString() + '\n'
      }
    }
    showConfirm(cm, regInfo);
  },
  sort: function (cm, params) {
    var reverse, ignoreCase, unique, number, pattern;
    function parseArgs() {
      if (params.argString) {
        var args = new StringStream(params.argString);
        if (args.eat('!')) { reverse = true; }
        if (args.eol()) { return; }
        if (!args.eatSpace()) { return 'Invalid arguments'; }
        var opts = args.match(/([dinuox]+)?\s*(\/.+\/)?\s*/);
        if (!opts && !args.eol()) { return 'Invalid arguments'; }
        if (opts[1]) {
          ignoreCase = opts[1].indexOf('i') != -1;
          unique = opts[1].indexOf('u') != -1;
          var decimal = opts[1].indexOf('d') != -1 || opts[1].indexOf('n') != -1 && 1;
          var hex = opts[1].indexOf('x') != -1 && 1;
          var octal = opts[1].indexOf('o') != -1 && 1;
          if (decimal + hex + octal > 1) { return 'Invalid arguments'; }
          number = decimal && 'decimal' || hex && 'hex' || octal && 'octal';
        }
        if (opts[2]) {
          pattern = new RegExp(opts[2].substr(1, opts[2].length - 2), ignoreCase ? 'i' : '');
        }
      }
    }
    var err = parseArgs();
    if (err) {
      showConfirm(cm, err + ': ' + params.argString);
      return;
    }
    var lineStart = params.line || cm.firstLine();
    var lineEnd = params.lineEnd || params.line || cm.lastLine();
    if (lineStart == lineEnd) { return; }
    var curStart = new Pos(lineStart, 0);
    var curEnd = new Pos(lineEnd, lineLength(cm, lineEnd));
    var text = cm.getRange(curStart, curEnd).split('\n');
    var numberRegex = pattern ? pattern :
      (number == 'decimal') ? /(-?)([\d]+)/ :
        (number == 'hex') ? /(-?)(?:0x)?([0-9a-f]+)/i :
          (number == 'octal') ? /([0-7]+)/ : null;
    var radix = (number == 'decimal') ? 10 : (number == 'hex') ? 16 : (number == 'octal') ? 8 : null;
    var numPart = [], textPart = [];
    if (number || pattern) {
      for (var i = 0; i < text.length; i++) {
        var matchPart = pattern ? text[i].match(pattern) : null;
        if (matchPart && matchPart[0] != '') {
          numPart.push(matchPart);
        } else if (!pattern && numberRegex.exec(text[i])) {
          numPart.push(text[i]);
        } else {
          textPart.push(text[i]);
        }
      }
    } else {
      textPart = text;
    }
    function compareFn(a, b) {
      if (reverse) { var tmp; tmp = a; a = b; b = tmp; }
      if (ignoreCase) { a = a.toLowerCase(); b = b.toLowerCase(); }
      var anum = number && numberRegex.exec(a);
      var bnum = number && numberRegex.exec(b);
      if (!anum) { return a < b ? -1 : 1; }
      anum = parseInt((anum[1] + anum[2]).toLowerCase(), radix);
      bnum = parseInt((bnum[1] + bnum[2]).toLowerCase(), radix);
      return anum - bnum;
    }
    function comparePatternFn(a, b) {
      if (reverse) { var tmp; tmp = a; a = b; b = tmp; }
      if (ignoreCase) { a[0] = a[0].toLowerCase(); b[0] = b[0].toLowerCase(); }
      return (a[0] < b[0]) ? -1 : 1;
    }
    numPart.sort(pattern ? comparePatternFn : compareFn);
    if (pattern) {
      for (var i = 0; i < numPart.length; i++) {
        numPart[i] = numPart[i].input;
      }
    } else if (!number) { textPart.sort(compareFn); }
    text = (!reverse) ? textPart.concat(numPart) : numPart.concat(textPart);
    if (unique) { // Remove duplicate lines
      var textOld = text;
      var lastLine;
      text = [];
      for (var i = 0; i < textOld.length; i++) {
        if (textOld[i] != lastLine) {
          text.push(textOld[i]);
        }
        lastLine = textOld[i];
      }
    }
    cm.replaceRange(text.join('\n'), curStart, curEnd);
  },
  vglobal: function (cm, params) {
    // global inspects params.commandName
    this.global(cm, params);
  },
  global: function (cm, params) {
    // a global command is of the form
    // :[range]g/pattern/[cmd]
    // argString holds the string /pattern/[cmd]
    var argString = params.argString;
    if (!argString) {
      showConfirm(cm, 'Regular Expression missing from global');
      return;
    }
    var inverted = params.commandName[0] === 'v';
    // range is specified here
    var lineStart = (params.line !== undefined) ? params.line : cm.firstLine();
    var lineEnd = params.lineEnd || params.line || cm.lastLine();
    // get the tokens from argString
    var tokens = splitBySlash(argString);
    var regexPart = argString, cmd;
    if (tokens.length) {
      regexPart = tokens[0];
      cmd = tokens.slice(1, tokens.length).join('/');
    }
    if (regexPart) {
      // If regex part is empty, then use the previous query. Otherwise
      // use the regex part as the new query.
      try {
        updateSearchQuery(cm, regexPart, true /** ignoreCase */,
          true /** smartCase */);
      } catch (e) {
        console.log(e);
        showConfirm(cm, 'Invalid regex: ' + regexPart);
        return;
      }
    }
    // now that we have the regexPart, search for regex matches in the
    // specified range of lines
    var query = getSearchState(cm).getQuery();
    var matchedLines = [];
    for (var i = lineStart; i <= lineEnd; i++) {
      var line = cm.getLineHandle(i);
      var matched = query.test(line.text);
      if (matched !== inverted) {
        matchedLines.push(cmd ? line : line.text);
      }
    }
    // if there is no [cmd], just display the list of matched lines
    if (!cmd) {
      showConfirm(cm, matchedLines.join('\n'));
      return;
    }
    var index = 0;
    var nextCommand = function () {
      if (index < matchedLines.length) {
        var line = matchedLines[index++];
        var lineNum = cm.getLineNumber(line);
        if (lineNum == null) {
          nextCommand();
          return;
        }
        var command = (lineNum + 1) + cmd;
        exCommandDispatcher.processCommand(cm, command, {
          callback: nextCommand
        });
      }
    };
    nextCommand();
  },
  substitute: function (cm, params) {
    if (!cm.getSearchCursor) {
      throw new Error('Search feature not available. Requires searchcursor.js or ' +
        'any other getSearchCursor implementation.');
    }
    var argString = params.argString;
    var tokens = argString ? splitBySeparator(argString, argString[0]) : [];
    var regexPart, replacePart = '', trailing, flagsPart, count;
    var confirm = false; // Whether to confirm each replace.
    var global = false; // True to replace all instances on a line, false to replace only 1.
    if (tokens.length) {
      regexPart = tokens[0];
      if (getOption('pcre') && regexPart !== '') {
        regexPart = new RegExp(regexPart).source; //normalize not escaped characters
      }
      replacePart = tokens[1];
      if (replacePart !== undefined) {
        if (getOption('pcre')) {
          replacePart = unescapeRegexReplace(replacePart.replace(/([^\\])&/g, "$1$$&"));
        } else {
          replacePart = translateRegexReplace(replacePart);
        }
        this.state.lastSubstituteReplacePart = replacePart;
      }
      trailing = tokens[2] ? tokens[2].split(' ') : [];
    } else {
      // either the argString is empty or its of the form ' hello/world'
      // actually splitBySlash returns a list of tokens
      // only if the string starts with a '/'
      if (argString && argString.length) {
        showConfirm(cm, 'Substitutions should be of the form ' +
          ':s/pattern/replace/');
        return;
      }
    }
    // After the 3rd slash, we can have flags followed by a space followed
    // by count.
    if (trailing) {
      flagsPart = trailing[0];
      count = parseInt(trailing[1]);
      if (flagsPart) {
        if (flagsPart.indexOf('c') != -1) {
          confirm = true;
        }
        if (flagsPart.indexOf('g') != -1) {
          global = true;
        }
        if (getOption('pcre')) {
          regexPart = regexPart + '/' + flagsPart;
        } else {
          regexPart = regexPart.replace(/\//g, "\\/") + '/' + flagsPart;
        }
      }
    }
    if (regexPart) {
      // If regex part is empty, then use the previous query. Otherwise use
      // the regex part as the new query.
      try {
        updateSearchQuery(cm, regexPart, true /** ignoreCase */,
          true /** smartCase */);
      } catch (e) {
        console.log(e);
        showConfirm(cm, 'Invalid regex: ' + regexPart);
        return;
      }
    }
    replacePart = replacePart || this.state.lastSubstituteReplacePart;
    if (replacePart === undefined) {
      showConfirm(cm, 'No previous substitute regular expression');
      return;
    }
    var state = getSearchState(cm);
    var query = state.getQuery();
    var lineStart = (params.line !== undefined) ? params.line : cm.getCursor().line;
    var lineEnd = params.lineEnd || lineStart;
    if (lineStart == cm.firstLine() && lineEnd == cm.lastLine()) {
      lineEnd = Infinity;
    }
    if (count) {
      lineStart = lineEnd;
      lineEnd = lineStart + count - 1;
    }
    var startPos = cm.clipCursorToContent(new Pos(lineStart, 0));
    var cursor = cm.getSearchCursor(query, startPos);
    doReplace(cm, confirm, global, lineStart, lineEnd, cursor, query, replacePart, params.callback);
  },
  redo: Mirror.commands.redo,
  undo: Mirror.commands.undo,
  write: function (cm) {
    if (Mirror.commands.save) {
      // If a save command is defined, call it.
      Mirror.commands.save(cm);
    } else if (cm.save) {
      // Saves to text area if no save command is defined and cm.save() is available.
      cm.save();
    }
  },
  nohlsearch: function (cm) {
    clearSearchHighlight(cm);
  },
  yank: function (cm) {
    var cur = copyCursor(cm.getCursor());
    var line = cur.line;
    var lineText = cm.getLine(line);
    this.state.registerController.pushText(
      '0', 'yank', lineText, true, true);
  },
  delmarks: function (cm, params) {
    if (!params.argString || !trim(params.argString)) {
      showConfirm(cm, 'Argument required');
      return;
    }

    var state = cm.state.vim;
    var stream = new StringStream(trim(params.argString));
    while (!stream.eol()) {
      stream.eatSpace();

      // Record the streams position at the beginning of the loop for use
      // in error messages.
      var count = stream.pos;

      if (!stream.match(/[a-zA-Z]/, false)) {
        showConfirm(cm, 'Invalid argument: ' + params.argString.substring(count));
        return;
      }

      var sym = stream.next();
      // Check if this symbol is part of a range
      if (stream.match('-', true)) {
        // This symbol is part of a range.

        // The range must terminate at an alphabetic character.
        if (!stream.match(/[a-zA-Z]/, false)) {
          showConfirm(cm, 'Invalid argument: ' + params.argString.substring(count));
          return;
        }

        var startMark = sym;
        var finishMark = stream.next();
        // The range must terminate at an alphabetic character which
        // shares the same case as the start of the range.
        if (isLowerCase(startMark) && isLowerCase(finishMark) ||
          isUpperCase(startMark) && isUpperCase(finishMark)) {
          var start = startMark.charCodeAt(0);
          var finish = finishMark.charCodeAt(0);
          if (start >= finish) {
            showConfirm(cm, 'Invalid argument: ' + params.argString.substring(count));
            return;
          }

          // Because marks are always ASCII values, and we have
          // determined that they are the same case, we can use
          // their char codes to iterate through the defined range.
          for (var j = 0; j <= finish - start; j++) {
            var mark = String.fromCharCode(start + j);
            delete state.marks[mark];
          }
        } else {
          showConfirm(cm, 'Invalid argument: ' + startMark + '-');
          return;
        }
      } else {
        // This symbol is a valid mark, and is not part of a range.
        delete state.marks[sym];
      }
    }
  }
};