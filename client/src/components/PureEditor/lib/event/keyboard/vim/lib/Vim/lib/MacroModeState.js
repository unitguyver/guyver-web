

const createInsertModeChanges = function (c) {
  return c ? {
    changes: c.changes,
    expectCursorActivityForChange: c.expectCursorActivityForChange
  } : {
    changes: [],
    expectCursorActivityForChange: false
  };
}

export default class MacroModeState {
  latestRegister = undefined;
  isPlaying = false;
  isRecording = false;
  replaySearchQueries = [];
  onRecordingDone = undefined;

  constructor(vim) {
    this.vim = vim;
    this.lastInsertModeChanges = createInsertModeChanges();
  };

  exitMacroRecordMode = function () {
    var macroModeState = this.vim.state.macroModeState;
    if (macroModeState.onRecordingDone) {
      macroModeState.onRecordingDone(); // close dialog
    }
    macroModeState.onRecordingDone = undefined;
    macroModeState.isRecording = false;
  };

  enterMacroRecordMode = function (cm, registerName) {
    const register =
      this.vim.state.registerController.getRegister(registerName);
    if (register) {
      register.clear();
      this.latestRegister = registerName;
      if (cm.openDialog) {
        this.onRecordingDone = cm.openDialog(
          document.createTextNode('(recording)[' + registerName + ']'), null, { bottom: true });
      }
      this.isRecording = true;
    }
  }
}