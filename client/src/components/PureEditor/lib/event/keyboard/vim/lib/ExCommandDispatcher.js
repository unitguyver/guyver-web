import StringStream from "./CodeMirror/lib/StringStream";
import Pos from "./Pos";

const defaultExCommandMap = require("../map/defaultExCommandMap.json");

export default class ExCommandDispatcher {

  constructor(vim) {
    this.vim = vim;
    this.buildCommandMap_();
  };

  processCommand = function (cm, input, opt_params) {
    const that = this;
    cm.operation(function () {
      cm.curOp.isVimOp = true;
      that._processCommand(cm, input, opt_params);
    });
  };

  _processCommand = function (cm, input, opt_params) {
    const vim = cm.state.vim;
    const commandHistoryRegister = this.vim.state.registerController.getRegister(':');
    const previousCommand = commandHistoryRegister.toString();
    if (vim.visualMode) {
      cm.exist();
    }
    const inputStream = new StringStream(input);
    commandHistoryRegister.setText(input);

    let params = opt_params || {};
    params.input = input;
    try {
      this.parseInput_(cm, inputStream, params);
    } catch (e) {
      cm.showConfirm(e.toString());
      throw e;
    }

    let command, commandName;
    if (!params.commandName) {
      if (params.line !== undefined) {
        commandName = 'move';
      }
    } else {
      command = this.matchCommand_(params.commandName);
      if (command) {
        commandName = command.name;
        if (command.excludeFromCommandHistory) {
          commandHistoryRegister.setText(previousCommand);
        }
        this.parseCommandArgs_(inputStream, params, command);
        if (command.type == 'exToKey') {
          for (var i = 0; i < command.toKeys.length; i++) {
            vimApi.handleKey(cm, command.toKeys[i], 'mapping');
          }
          return;
        } else if (command.type == 'exToEx') {
          this.processCommand(cm, command.toInput);
          return;
        }
      }
    }
    if (!commandName) {
      showConfirm(cm, 'Not an editor command ":' + input + '"');
      return;
    }
    try {
      exCommands[commandName](cm, params);
      if ((!command || !command.possiblyAsync) && params.callback) {
        params.callback();
      }
    } catch (e) {
      showConfirm(cm, e.toString());
      throw e;
    }
  };

  parseInput_ = function (cm, inputStream, result) {
    inputStream.eatWhile(':');
    if (inputStream.eat('%')) {
      result.line = cm.firstLine();
      result.lineEnd = cm.lastLine();
    } else {
      result.line = this.parseLineSpec_(cm, inputStream);
      if (result.line !== undefined && inputStream.eat(',')) {
        result.lineEnd = this.parseLineSpec_(cm, inputStream);
      }
    }

    var commandMatch = inputStream.match(/^(\w+|!!|@@|[!#&*<=>@~])/);
    if (commandMatch) {
      result.commandName = commandMatch[1];
    } else {
      result.commandName = inputStream.match(/.*/)[0];
    }

    return result;
  };

  parseLineSpec_ = function (cm, inputStream) {
    var numberMatch = inputStream.match(/^(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10) - 1;
    }
    switch (inputStream.next()) {
      case '.':
        return this.parseLineSpecOffset_(inputStream, cm.getCursor().line);
      case '$':
        return this.parseLineSpecOffset_(inputStream, cm.lastLine());
      case '\'':
        var markName = inputStream.next();
        var markPos = Pos.getMarkPos(cm, cm.state.vim, markName);
        if (!markPos) throw new Error('Mark not set');
        return this.parseLineSpecOffset_(inputStream, markPos.line);
      case '-':
      case '+':
        inputStream.backUp(1);
        return this.parseLineSpecOffset_(inputStream, cm.getCursor().line);
      default:
        inputStream.backUp(1);
        return undefined;
    }
  };

  parseLineSpecOffset_ = function (inputStream, line) {
    var offsetMatch = inputStream.match(/^([+-])?(\d+)/);
    if (offsetMatch) {
      var offset = parseInt(offsetMatch[2], 10);
      if (offsetMatch[1] == "-") {
        line -= offset;
      } else {
        line += offset;
      }
    }
    return line;
  };

  parseCommandArgs_ = function (inputStream, params, command) {
    if (inputStream.eol()) {
      return;
    }
    params.argString = inputStream.match(/.*/)[0];
    // Parse command-line arguments
    var delim = command.argDelimiter || /\s+/;
    var args = trim(params.argString).split(delim);
    if (args.length && args[0]) {
      params.args = args;
    }
  };

  matchCommand_ = function (commandName) {
    for (var i = commandName.length; i > 0; i--) {
      var prefix = commandName.substring(0, i);
      if (this.commandMap_[prefix]) {
        var command = this.commandMap_[prefix];
        if (command.name.indexOf(commandName) === 0) {
          return command;
        }
      }
    }
    return null;
  };

  buildCommandMap_ = function () {
    this.commandMap_ = {};
    for (var i = 0; i < defaultExCommandMap.length; i++) {
      var command = defaultExCommandMap[i];
      var key = command.shortName || command.name;
      this.commandMap_[key] = command;
    }
  };

  map = function (lhs, rhs, ctx) {
    if (lhs != ':' && lhs.charAt(0) == ':') {
      if (ctx) { throw Error('Mode not supported for ex mappings'); }
      var commandName = lhs.substring(1);
      if (rhs != ':' && rhs.charAt(0) == ':') {
        // Ex to Ex mapping
        this.commandMap_[commandName] = {
          name: commandName,
          type: 'exToEx',
          toInput: rhs.substring(1),
          user: true
        };
      } else {
        // Ex to key mapping
        this.commandMap_[commandName] = {
          name: commandName,
          type: 'exToKey',
          toKeys: rhs,
          user: true
        };
      }
    } else {
      if (rhs != ':' && rhs.charAt(0) == ':') {
        // Key to Ex mapping.
        var mapping = {
          keys: lhs,
          type: 'keyToEx',
          exArgs: { input: rhs.substring(1) }
        };
        if (ctx) { mapping.context = ctx; }
        defaultKeymap.unshift(mapping);
      } else {
        // Key to key mapping
        var mapping = {
          keys: lhs,
          type: 'keyToKey',
          toKeys: rhs
        };
        if (ctx) { mapping.context = ctx; }
        defaultKeymap.unshift(mapping);
      }
    }
  };

  unmap = function (lhs, ctx) {
    if (lhs != ':' && lhs.charAt(0) == ':') {
      // Ex to Ex or Ex to key mapping
      if (ctx) { throw Error('Mode not supported for ex mappings'); }
      var commandName = lhs.substring(1);
      if (this.commandMap_[commandName] && this.commandMap_[commandName].user) {
        delete this.commandMap_[commandName];
        return true;
      }
    } else {
      // Key to Ex or key to key mapping
      var keys = lhs;
      for (var i = 0; i < defaultKeymap.length; i++) {
        if (keys == defaultKeymap[i].keys
          && defaultKeymap[i].context === ctx) {
          defaultKeymap.splice(i, 1);
          return true;
        }
      }
    }
  }
}