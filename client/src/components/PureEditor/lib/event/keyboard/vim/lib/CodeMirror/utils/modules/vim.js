import InputState from "../../lib/InputState";
import VimKeyMap from "../../lib/KeyMap/Vim";
import Mirror from "../../lib/Mirror";

const keyMap = new VimKeyMap();

export default {

  maybeInitVimState() {
    if (!this.state.vim) {
      this.state.vim = {
        inputState: new InputState(),
        lastEditInputState: undefined,
        lastEditActionCommand: undefined,
        lastHPos: -1,
        lastHSPos: -1,
        lastMotion: null,
        marks: {},
        insertMode: false,
        insertModeRepeat: undefined,
        visualMode: false,
        visualLine: false,
        visualBlock: false,
        lastSelection: null,
        lastPastedText: null,
        sel: {},
        options: {}
      };
    }
    return this.state.vim;
  },

  attachVimMap(prev) {
    if (this == keyMap.vim) {
      if (this.curOp) {
        this.curOp.selectionChanged = true;
      }
      this.options.$customCursor = transformCursor;
      Mirror.addClass(this.getWrapperElement(), "cm-fat-cursor");
    }

    if (!prev || prev.attach != attachVimMap)
      this.enterVimMode();
  },

  detachVimMap(next) {
    if (this == keyMap.vim) {
      this.options.$customCursor = null;
      Mirror.rmClass(this.getWrapperElement(), "cm-fat-cursor");
    }

    if (!next || next.attach != attachVimMap)
      this.leaveVimMode();
  },

  enterVimMode() {
    this.setOption('disableInput', true);
    this.setOption('showCursorWhenSelecting', false);
    Mirror.signal(this, "vim-mode-change", { mode: "normal" });
    this.on('cursorActivity', this.onCursorActivity.bind(this));
    this.maybeInitVimState();
    Mirror.on(this.getInputField(), 'paste', this.getOnPasteFn());
  },

  leaveVimMode() {
    this.setOption('disableInput', false);
    this.off('cursorActivity', this.onCursorActivity.bind(this));
    Mirror.off(this.getInputField(), 'paste', this.getOnPasteFn());
    this.state.vim = null;
  },

  clearInputState(reason) {
    this.state.vim.inputState = new InputState();
    Mirror.signal(this, 'vim-command-done', reason);
  },
}