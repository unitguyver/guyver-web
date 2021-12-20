import dom from "../../../../../utils/dom";
import CodeMirror from "../CodeMirror";


// handler.defaultKeymap = defaultKeymap;
// handler.actions = actions;

let specialKey = {
  'return': 'CR', backspace: 'BS', 'delete': 'Del', esc: 'Esc',
  left: 'Left', right: 'Right', up: 'Up', down: 'Down', space: 'Space', insert: 'Ins',
  home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown', enter: 'CR'
};

function lookupKey(hashId, key, e) {
  if (key.length > 1 && key[0] == "n") {
    key = key.replace("numpad", "");
  }
  key = specialKey[key] || key;
  var name = '';
  if (e.ctrlKey) { name += 'C-'; }
  if (e.altKey) { name += 'A-'; }
  if ((name || key.length > 1) && e.shiftKey) { name += 'S-'; }

  name += key;
  if (name.length > 1) { name = '<' + name + '>'; }
  return name;
}

export default class Handler {
  $id = "ace/keyboard/vim";

  constructor() {
    //
  };

  attach = function (editor) {
    if (!editor.state) {
      editor.state = {};
    }
    const cm = new CodeMirror(editor);
    editor.state.cm = cm;
    editor.$vimModeHandler = this;
    cm.attachVimMap();
    cm.maybeInitVimState().status = null;
    cm.on('vim-command-done', function () {
      if (cm.virtualSelectionMode()) return;
      cm.maybeInitVimState().status = null;
      cm.ace._signal("changeStatus");
      cm.ace.session.markUndoGroup();
    });
    cm.on("changeStatus", function () {
      cm.ace.renderer.updateCursor();
      cm.ace._signal("changeStatus");
    });
    cm.on("vim-mode-change", function () {
      if (cm.virtualSelectionMode()) return;
      updateInputMode();
      cm._signal("changeStatus");
    });
    function updateInputMode() {
      var isIntsert = cm.maybeInitVimState().insertMode;
      cm.ace.renderer.setStyle("normal-mode", !isIntsert);
      editor.textInput.setCommandMode(!isIntsert);
      // without this press and hodl popup in mac is shown in normal mode
      editor.renderer.$keepTextAreaAtCursor = isIntsert;
      editor.renderer.$blockCursor = !isIntsert;
    }
    updateInputMode();
    editor.renderer.$cursorLayer.drawCursor = this.drawCursor.bind(cm);
  };

  detach = function (editor) {
    var cm = editor.state.cm;
    CodeMirror.keyMap.vim.detach(cm);
    cm.destroy();
    editor.state.cm = null;
    editor.$vimModeHandler = null;
    editor.renderer.$cursorLayer.drawCursor = null;
    editor.renderer.setStyle("normal-mode", false);
    editor.textInput.setCommandMode(false);
    editor.renderer.$keepTextAreaAtCursor = true;
  };

  drawCursor = function (element, pixelPos, config, sel, session) {
    var vim = this.state.vim || {};
    var w = config.characterWidth;
    var h = config.lineHeight;
    var top = pixelPos.top;
    var left = pixelPos.left;
    if (!vim.insertMode) {
      var isbackwards = !sel.cursor
        ? session.selection.isBackwards() || session.selection.isEmpty()
        : Range.comparePoints(sel.cursor, sel.start) <= 0;
      if (!isbackwards && left > w)
        left -= w;
    }
    if (!vim.insertMode && vim.status) {
      h = h / 2;
      top += h;
    }
    dom.translate(element, left, top);
    dom.setStyle(element.style, "width", w + "px");
    dom.setStyle(element.style, "height", h + "px");
  };

  handleKeyboard = function (data, hashId, key, keyCode, e) {
    let editor = data.editor;
    let cm = editor.state.cm;
    let vim = cm.maybeInitVimState();
    if (keyCode == -1) return;
    if (!vim.insertMode) {
      if (hashId == -1) {
        if (key.charCodeAt(0) > 0xFF) {
          if (data.inputKey) {
            key = data.inputKey;
            if (key && data.inputHash == 4)
              key = key.toUpperCase();
          }
        }
        data.inputChar = key;
      }
      else if (hashId == 4 || hashId == 0) {
        if (data.inputKey == key && data.inputHash == hashId && data.inputChar) {
          // on mac text input doesn't repeat
          key = data.inputChar;
          hashId = -1
        }
        else {
          data.inputChar = null;
          data.inputKey = key;
          data.inputHash = hashId;
        }
      }
      else {
        data.inputChar = data.inputKey = null;
      }
    }

    if (cm.state.overwrite && vim.insertMode && key == "backspace" && hashId == 0) {
      return { command: "gotoleft" }
    }

    // ctrl-c is special it both exits mode and copies text
    if (key == "c" && hashId == 1) { // key == "ctrl-c"
      if (!useragent.isMac && editor.getCopyText()) {
        editor.once("copy", function () {
          if (vim.insertMode) editor.selection.clearSelection();
          else cm.operation(function () { exitVisualMode(cm); });
        });
        return { command: "null", passEvent: true };
      }
    }

    if (key == "esc" && !vim.insertMode && !vim.visualMode && !cm.ace.inMultiSelectMode) {
      var searchState = getSearchState(cm);
      var overlay = searchState.getOverlay();
      if (overlay) cm.removeOverlay(overlay);
    }

    if (hashId == -1 || hashId & 1 || hashId === 0 && key.length > 1) {
      var insertMode = vim.insertMode;
      var name = lookupKey(hashId, key, e || {});
      if (vim.status == null)
        vim.status = "";
      var isHandled = cm.multiSelectHandleKey(name, 'user');
      vim = cm.maybeInitVimState();
      if (isHandled && vim.status != null)
        vim.status += name;
      else if (vim.status == null)
        vim.status = "";
      cm._signal("changeStatus");
      if (!isHandled && (hashId != -1 || insertMode))
        return;
      return { command: "null", passEvent: !isHandled };
    }
  };

  getStatusText = function (editor) {
    let cm = editor.state.cm;
    let vim = cm.maybeInitVimState();
    if (vim.insertMode) {
      return "INSERT";
    }
    let status = "";
    if (vim.visualMode) {
      status += "VISUAL";
      if (vim.visualLine) {
        status += " LINE";
      }
      if (vim.visualBlock) {
        status += " BLOCK";
      }
    }
    if (vim.status) {
      status += (status ? " " : "") + vim.status;
    }
    return status;
  }
}