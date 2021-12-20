import CircularJumpList from "./lib/CircularJumpList";
import MacroModeState from "./lib/MacroModeState";
import RegisterController from "./lib/RegisterController";
import HistoryController from "./lib/HistoryController";
import ExCommandDispatcher from "../ExCommandDispatcher";
import exCommands from "./utils/exCommands";

const defaultKeymap = require("../../map/defaultKeymap.json")

const exCommandDispatcher = new ExCommandDispatcher();

function lastChar(keys) {
  var match = /^.*(<[^>]+>)$/.exec(keys);
  var selectedCharacter = match ? match[1] : keys.slice(-1);
  if (selectedCharacter.length > 1) {
    switch (selectedCharacter) {
      case '<CR>':
        selectedCharacter = '\n';
        break;
      case '<Space>':
        selectedCharacter = ' ';
        break;
      default:
        selectedCharacter = '';
        break;
    }
  }
  return selectedCharacter;
}

function commandMatches(keys, keyMap, context, inputState) {
  // Partial matches are not applied. They inform the key handler
  // that the current key sequence is a subsequence of a valid key
  // sequence, so that the key buffer is not cleared.
  var match, partial = [], full = [];
  for (var i = 0; i < keyMap.length; i++) {
    var command = keyMap[i];
    if (context == 'insert' && command.context != 'insert' ||
      command.context && command.context != context ||
      inputState.operator && command.type == 'action' ||
      !(match = commandMatch(keys, command.keys))) { continue; }
    if (match == 'partial') { partial.push(command); }
    if (match == 'full') { full.push(command); }
  }
  return {
    partial: partial.length && partial,
    full: full.length && full
  };
}

function commandMatch(pressed, mapped) {
  if (mapped.slice(-11) == '<character>') {
    // Last character matches anything.
    var prefixLen = mapped.length - 11;
    var pressedPrefix = pressed.slice(0, prefixLen);
    var mappedPrefix = mapped.slice(0, prefixLen);
    return pressedPrefix == mappedPrefix && pressed.length > prefixLen ? 'full' :
      mappedPrefix.indexOf(pressedPrefix) == 0 ? 'partial' : false;
  } else {
    return pressed == mapped ? 'full' :
      mapped.indexOf(pressed) == 0 ? 'partial' : false;
  }
}


function matchCommand(keys, keyMap, inputState, context) {
  var matches = commandMatches(keys, keyMap, context, inputState);
  if (!matches.full && !matches.partial) {
    return { type: 'none' };
  } else if (!matches.full && matches.partial) {
    return { type: 'partial' };
  }

  var bestMatch;
  for (var i = 0; i < matches.full.length; i++) {
    var match = matches.full[i];
    if (!bestMatch) {
      bestMatch = match;
    }
  }
  if (bestMatch.keys.slice(-11) == '<character>') {
    var character = lastChar(keys);
    if (!character || character.length > 1) return { type: 'clear' }; //ace_patch
    inputState.selectedCharacter = character;
  }
  return { type: 'full', command: bestMatch };
}

export default class Vim {
  state = {};
  options = {};
  suppressErrorLogging = false;

  constructor() {
    this.resetVimGlobalState_();
  };

  handleKey = function (cm, key, origin) {
    let command = this.findKey(cm, key, origin);
    if (typeof command === 'function') {
      return command();
    }
  }

  buildKeyMap = function () {
    // TODO: Convert keymap into dictionary format for fast lookup.
  };

  getRegisterController = function () {
    return this.state.registerController;
  };

  resetVimGlobalState_ = function () {
    this.state = {
      searchQuery: null,
      searchIsReversed: false,
      lastSubstituteReplacePart: undefined,
      jumpList: new CircularJumpList,
      macroModeState: new MacroModeState(this),
      lastCharacterSearch: {
        increment: 0,
        forward: true,
        selectedCharacter: ''
      },
      registerController: new RegisterController({}),
      searchHistoryController: new HistoryController(),
      exCommandHistoryController: new HistoryController()
    };
    for (let optionName in this.options) {
      const option = this.options[optionName];
      option.value = option.defaultValue;
    }
  };

  createCircularJumpList = function () {
    return new CircularJumpList();
  };

  getVimGlobalState_ = function () {
    return this.state;
  };

  InsertModeKey(keyName) {
    this.keyName = keyName;
  };

  map = function (lhs, rhs, ctx) {
    exCommandDispatcher.map(lhs, rhs, ctx);
  };

  unmap = function (lhs, ctx) {
    return exCommandDispatcher.unmap(lhs, ctx);
  };

  noremap = function (lhs, rhs, ctx) {
    function toCtxArray(ctx) {
      return ctx ? [ctx] : ['normal', 'insert', 'visual'];
    }
    var ctxsToMap = toCtxArray(ctx);
    var actualLength = defaultKeymap.length, origLength = defaultKeymapLength;
    for (var i = actualLength - origLength;
      i < actualLength && ctxsToMap.length;
      i++) {
      var mapping = defaultKeymap[i];
      if (mapping.keys == rhs &&
        (!ctx || !mapping.context || mapping.context === ctx) &&
        mapping.type.substr(0, 2) !== 'ex' &&
        mapping.type.substr(0, 3) !== 'key') {
        var newMapping = {};
        for (var key in mapping) {
          newMapping[key] = mapping[key];
        }
        newMapping.keys = lhs;
        if (ctx && !newMapping.context) {
          newMapping.context = ctx;
        }
        this._mapCommand(newMapping);
        var mappedCtxs = toCtxArray(mapping.context);
        ctxsToMap = ctxsToMap.filter(function (el) { return mappedCtxs.indexOf(el) === -1; });
      }
    }
  };

  mapclear = function (ctx) {
    var actualLength = defaultKeymap.length,
      origLength = defaultKeymapLength;
    var userKeymap = defaultKeymap.slice(0, actualLength - origLength);
    // 这行有问题
    defaultKeymap = defaultKeymap.slice(actualLength - origLength);
    if (ctx) {
      for (var i = userKeymap.length - 1; i >= 0; i--) {
        var mapping = userKeymap[i];
        if (ctx !== mapping.context) {
          if (mapping.context) {
            this._mapCommand(mapping);
          } else {
            var contexts = ['normal', 'insert', 'visual'];
            for (var j in contexts) {
              if (contexts[j] !== ctx) {
                var newMapping = {};
                for (var key in mapping) {
                  newMapping[key] = mapping[key];
                }
                newMapping.context = contexts[j];
                this._mapCommand(newMapping);
              }
            }
          }
        }
      }
    }
  };

  setOption(name, value, cm, cfg) {
    var option = this.options[name];
    cfg = cfg || {};
    var scope = cfg.scope;
    if (!option) {
      return new Error('Unknown option: ' + name);
    }
    if (option.type == 'boolean') {
      if (value && value !== true) {
        return new Error('Invalid argument: ' + name + '=' + value);
      } else if (value !== false) {
        // Boolean options are set to true if value is not defined.
        value = true;
      }
    }
    if (option.callback) {
      if (scope !== 'local') {
        option.callback(value, undefined);
      }
      if (scope !== 'global' && cm) {
        option.callback(value, cm);
      }
    } else {
      if (scope !== 'local') {
        option.value = option.type == 'boolean' ? !!value : value;
      }
      if (scope !== 'global' && cm) {
        cm.state.vim.options[name] = { value: value };
      }
    }
  };

  getOption(name, cm, cfg) {
    var option = this.options[name];
    cfg = cfg || {};
    var scope = cfg.scope;
    if (!option) {
      return new Error('Unknown option: ' + name);
    }
    if (option.callback) {
      var local = cm && option.callback(undefined, cm);
      if (scope !== 'global' && local !== undefined) {
        return local;
      }
      if (scope !== 'local') {
        return option.callback();
      }
      return;
    } else {
      var local = (scope !== 'global') && (cm && cm.state.vim.options[name]);
      return (local || (scope !== 'local') && option || {}).value;
    }
  };

  defineOption(name, defaultValue, type, aliases, callback) {
    if (defaultValue === undefined && !callback) {
      throw Error('defaultValue is required unless callback is provided');
    }
    if (!type) { type = 'string'; }
    this.options[name] = {
      type: type,
      defaultValue: defaultValue,
      callback: callback
    };
    if (aliases) {
      for (var i = 0; i < aliases.length; i++) {
        this.options[aliases[i]] = this.options[name];
      }
    }
    if (defaultValue) {
      setOption(name, defaultValue);
    }
  };

  defineEx = function (name, prefix, func) {
    if (!prefix) {
      prefix = name;
    } else if (name.indexOf(prefix) !== 0) {
      throw new Error('(Vim.defineEx) "' + prefix + '" is not a prefix of "' + name + '", command not registered');
    }
    exCommands[name] = func;
    exCommandDispatcher.commandMap_[prefix] = {
      name: name,
      shortName: prefix,
      type: 'api'
    };
  };

  handleEx = function (cm, input) {
    exCommandDispatcher.processCommand(cm, input);
  };

  // 这后面没改

  defineMotion = function (name, fn) {
    motions[name] = fn;
  };

  defineAction(name, fn) {
    actions[name] = fn;
  };

  defineOperator(name, fn) {
    operators[name] = fn;
  };

  mapCommand(keys, type, name, args, extra) {
    var command = { keys: keys, type: type };
    command[type] = name;
    command[type + "Args"] = args;
    for (var key in extra)
      command[key] = extra[key];
    _mapCommand(command);
  };

  _mapCommand(command) {
    defaultKeymap.unshift(command);
  };

  defineRegister(name, register) {
    var registers = this.state.registerController.registers;
    if (!name || name.length != 1) {
      throw Error('Register name must be 1 character');
    }
    // ace_patch
    registers[name] = register;
    validRegisters.push(name);
  };

  exitVisualMode(cm, moveHead) {
    var vim = cm.state.vim;
    if (moveHead !== false) {
      cm.setCursor(clipCursorToContent(cm, vim.sel.head));
    }
    updateLastSelection(cm, vim);
    vim.visualMode = false;
    vim.visualLine = false;
    vim.visualBlock = false;
    if (!vim.insertMode) CodeMirror.signal(cm, "vim-mode-change", { mode: "normal" });
  };

  exitInsertMode(cm) {
    var vim = cm.state.vim;
    var macroModeState = this.state.macroModeState;
    var insertModeChangeRegister = this.state.registerController.getRegister('.');
    var isPlaying = macroModeState.isPlaying;
    var lastChange = macroModeState.lastInsertModeChanges;
    if (!isPlaying) {
      cm.off('change', cm.onChange.bind(cm));
      CodeMirror.off(cm.getInputField(), 'keydown', cm.onKeyEventTargetKeyDown.bind(cm));
    }
    if (!isPlaying && vim.insertModeRepeat > 1) {
      // Perform insert mode repeat for commands like 3,a and 3,o.
      repeatLastEdit(cm, vim, vim.insertModeRepeat - 1,
        true /** repeatForInsert */);
      vim.lastEditInputState.repeatOverride = vim.insertModeRepeat;
    }
    delete vim.insertModeRepeat;
    vim.insertMode = false;
    cm.setCursor(cm.getCursor().line, cm.getCursor().ch - 1);
    cm.setOption('keyMap', 'vim');
    cm.setOption('disableInput', true);
    cm.toggleOverwrite(false); // exit replace mode if we were in it.
    // update the ". register before exiting insert mode
    insertModeChangeRegister.setText(lastChange.changes.join(''));
    CodeMirror.signal(cm, "vim-mode-change", { mode: "normal" });
    if (macroModeState.isRecording) {
      logInsertModeChange(macroModeState);
    }
  };

  findKey(cm, key, origin) {
    const _self = this;
    var vim = cm.maybeInitVimState();
    function handleMacroRecording() {
      var macroModeState = _self.state.macroModeState;
      if (macroModeState.isRecording) {
        if (key == 'q') {
          macroModeState.exitMacroRecordMode();
          cm.clearInputState();
          return true;
        }
        if (origin != 'mapping') {
          logKey(macroModeState, key);
        }
      }
    }
    function handleEsc() {
      if (key == '<Esc>') {
        // Clear input state and get back to normal mode.
        cm.clearInputState();
        if (vim.visualMode) {
          cm.exitVisualMode();
        } else if (vim.insertMode) {
          cm.exitInsertMode();
        }
        return true;
      }
    }
    function doKeyToKey(keys) {
      // TODO: prevent infinite recursion.
      var match;
      while (keys) {
        // Pull off one command key, which is either a single character
        // or a special sequence wrapped in '<' and '>', e.g. '<Space>'.
        match = (/<\w+-.+?>|<\w+>|./).exec(keys);
        key = match[0];
        keys = keys.substring(match.index + key.length);
        _self.handleKey(cm, key, 'mapping');
      }
    }

    function handleKeyInsertMode() {
      if (handleEsc()) { return true; }
      var keys = vim.inputState.keyBuffer = vim.inputState.keyBuffer + key;
      var keysAreChars = key.length == 1;
      var match = matchCommand(keys, defaultKeymap, vim.inputState, 'insert');
      // Need to check all key substrings in insert mode.
      while (keys.length > 1 && match.type != 'full') {
        var keys = vim.inputState.keyBuffer = keys.slice(1);
        var thisMatch = matchCommand(keys, defaultKeymap, vim.inputState, 'insert');
        if (thisMatch.type != 'none') { match = thisMatch; }
      }
      if (match.type == 'none') {
        cm.clearInputState();
        return false;
      }
      else if (match.type == 'partial') {
        if (lastInsertModeKeyTimer) {
          window.clearTimeout(lastInsertModeKeyTimer);
        }
        lastInsertModeKeyTimer = window.setTimeout(
          function () {
            if (vim.insertMode && vim.inputState.keyBuffer) {
              cm.clearInputState();
            }
          },
          getOption('insertModeEscKeysTimeout'));
        return !keysAreChars;
      }

      if (lastInsertModeKeyTimer) {
        window.clearTimeout(lastInsertModeKeyTimer);
      }
      if (keysAreChars) {
        var selections = cm.listSelections();
        for (var i = 0; i < selections.length; i++) {
          var here = selections[i].head;
          cm.replaceRange('', offsetCursor(here, 0, -(keys.length - 1)), here, '+input');
        }
        this.state.macroModeState.lastInsertModeChanges.changes.pop();
      }
      cm.clearInputState();
      return match.command;
    }

    function handleKeyNonInsertMode() {
      if (handleMacroRecording() || handleEsc()) {
        return true;
      }

      var keys = vim.inputState.keyBuffer = vim.inputState.keyBuffer + key;
      if (/^[1-9]\d*$/.test(keys)) {
        return true;
      }

      var keysMatcher = /^(\d*)(.*)$/.exec(keys);
      if (!keysMatcher) {
        cm.clearInputState();
        return false;
      }
      var context = vim.visualMode
        ? 'visual'
        : 'normal';
      var mainKey = keysMatcher[2] || keysMatcher[1];
      if (vim.inputState.operatorShortcut && vim.inputState.operatorShortcut.slice(-1) == mainKey) {
        // multikey operators act linewise by repeating only the last character
        mainKey = vim.inputState.operatorShortcut;
      }
      var match = matchCommand(mainKey, defaultKeymap, vim.inputState, context);
      if (match.type == 'none') {
        cm.clearInputState();
        return false;
      }
      else if (match.type == 'partial') {
        return true;
      }
      else if (match.type == 'clear') {
        cm.clearInputState();
        return true;
      }

      vim.inputState.keyBuffer = '';
      var keysMatcher = /^(\d*)(.*)$/.exec(keys);
      if (keysMatcher[1] && keysMatcher[1] != '0') {
        vim.inputState.pushRepeatDigit(keysMatcher[1]);
      }
      return match.command;
    }

    let command;
    if (vim.insertMode) {
      command = handleKeyInsertMode();
    } else {
      command = handleKeyNonInsertMode();
    }
    if (command === false) {
      return undefined;
    } else if (command === true) {
      return function () {
        return true;
      };
    } else {
      return function () {
        if ((command.operator || command.isEdit) && cm.getOption('readOnly'))
          return;
        return cm.operation(function () {
          cm.curOp.isVimOp = true;
          try {
            if (command.type == 'keyToKey') {
              doKeyToKey(command.toKeys);
            } else {
              cm.processCommand(vim, command);
            }
          } catch (e) {
            cm.state.vim = undefined;
            cm.maybeInitVimState();
            if (!_self.suppressErrorLogging) {
              console['log'](e);
            }
            throw e;
          }
          return true;
        });
      };
    }
  };
}