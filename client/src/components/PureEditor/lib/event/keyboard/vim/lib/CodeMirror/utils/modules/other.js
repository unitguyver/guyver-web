import Pos from "../../../Pos";

function cloneVimState(state) {
  var n = new state.constructor();
  Object.keys(state).forEach(function (key) {
    var o = state[key];
    if (Array.isArray(o))
      o = o.slice();
    else if (o && typeof o == "object" && o.constructor != Object)
      o = cloneVimState(o);
    n[key] = o;
  });
  if (state.sel) {
    n.sel = {
      head: state.sel.head && Pos.copyCursor(state.sel.head),
      anchor: state.sel.anchor && Pos.copyCursor(state.sel.anchor)
    };
  }
  return n;
}

export default {
  multiSelectHandleKey(key, origin) {
    let isHandled = false;
    let vim = this.maybeInitVimState();
    let visualBlock = vim.visualBlock || vim.wasInVisualBlock;

    let wasMultiselect = this.ace.inMultiSelectMode;
    if (vim.wasInVisualBlock && !wasMultiselect) {
      vim.wasInVisualBlock = false;
    } else if (wasMultiselect && vim.visualBlock) {
      vim.wasInVisualBlock = true;
    }

    if (key == '<Esc>' && !vim.insertMode && !vim.visualMode && wasMultiselect) {
      this.ace.exitMultiSelectMode();
    } else if (visualBlock || !wasMultiselect || this.ace.inVirtualSelectionMode) {

      isHandled = this.vimApi.handleKey(this, key, origin);
    } else {
      let old = cloneVimState(vim);
      this.operation(function () {
        this.ace.forEachSelection(function () {
          var sel = this.ace.selection;
          this.state.vim.lastHPos = sel.$desiredColumn == null ? sel.lead.column : sel.$desiredColumn;
          var head = this.getCursor("head");
          var anchor = this.getCursor("anchor");
          var headOffset = !Pos.cursorIsBefore(head, anchor) ? -1 : 0;
          var anchorOffset = Pos.cursorIsBefore(head, anchor) ? -1 : 0;
          head = offsetCursor(head, 0, headOffset);
          anchor = offsetCursor(anchor, 0, anchorOffset);
          this.state.vim.sel.head = head;
          this.state.vim.sel.anchor = anchor;

          isHandled = this.vimApi.handleKey(this, key, origin);
          sel.$desiredColumn = this.state.vim.lastHPos == -1 ? null : this.state.vim.lastHPos;
          if (this.virtualSelectionMode()) {
            this.state.vim = cloneVimState(old);
          }
        });
        if (this.curOp.cursorActivity && !isHandled)
          this.curOp.cursorActivity = false;
      }, true);
    }
    if (isHandled && !vim.visualMode && !vim.insert && vim.visualMode != this.somethingSelected()) {
      this.handleExternalSelection(vim, true);
    }
    return isHandled;
  }
}