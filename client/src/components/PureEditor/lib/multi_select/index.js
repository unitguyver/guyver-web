import Editor from "../../editor";
import EditSession from "../../editor/session";
import * as editorUtils from "./editorUtils";
import * as selectionUtils from "./selectionUtils";
import config from "../../editor/config";
import Selection from "../../editor/tools/Selection";
import * as commands from "../commands/multi_select_commands";
import event from "../event/event";

const { onMouseDown } = require("../event/mouse/multi_select_handler");

for (let editorUtilName in editorUtils) {
  Editor.prototype[editorUtilName] = editorUtils[editorUtilName];
}

for (let selectionUtilName in selectionUtils) {
  Selection.prototype[selectionUtilName] = selectionUtils[selectionUtilName];
}

const _commands = commands.defaultCommands.concat(commands.multiSelectCommands);
export { _commands as commands };

EditSession.prototype.getSelectionMarkers = function () {
  return this.$selectionMarkers;
};

export const onSessionChange = function (e) {
  var session = e.session;
  if (session && !session.multiSelect) {
    session.$selectionMarkers = [];
    session.selection.$initRangeList();
    session.multiSelect = session.selection;
  }
  this.multiSelect = session && session.multiSelect;

  var oldSession = e.oldSession;
  if (oldSession) {
    oldSession.multiSelect.off("addRange", this.$onAddRange);
    oldSession.multiSelect.off("removeRange", this.$onRemoveRange);
    oldSession.multiSelect.off("multiSelect", this.$onMultiSelect);
    oldSession.multiSelect.off("singleSelect", this.$onSingleSelect);
    oldSession.multiSelect.lead.off("change", this.$checkMultiselectChange);
    oldSession.multiSelect.anchor.off("change", this.$checkMultiselectChange);
  }

  if (session) {
    session.multiSelect.on("addRange", this.$onAddRange);
    session.multiSelect.on("removeRange", this.$onRemoveRange);
    session.multiSelect.on("multiSelect", this.$onMultiSelect);
    session.multiSelect.on("singleSelect", this.$onSingleSelect);
    session.multiSelect.lead.on("change", this.$checkMultiselectChange);
    session.multiSelect.anchor.on("change", this.$checkMultiselectChange);
  }

  if (session && this.inMultiSelectMode != session.selection.inMultiSelectMode) {
    if (session.selection.inMultiSelectMode)
      this.$onMultiSelect();
    else
      this.$onSingleSelect();
  }
};

export const MultiSelect = function (editor) {
  if (editor.$multiselectOnSessionChange)
    return;
  editor.$onAddRange = editor.$onAddRange.bind(editor);
  editor.$onRemoveRange = editor.$onRemoveRange.bind(editor);
  editor.$onMultiSelect = editor.$onMultiSelect.bind(editor);
  editor.$onSingleSelect = editor.$onSingleSelect.bind(editor);
  editor.$multiselectOnSessionChange = onSessionChange.bind(editor);
  editor.$checkMultiselectChange = editor.$checkMultiselectChange.bind(editor);

  editor.$multiselectOnSessionChange(editor);
  editor.on("changeSession", editor.$multiselectOnSessionChange);

  editor.on("mousedown", onMouseDown);
  editor.commands.addCommands(commands.defaultCommands);

  addAltCursorListeners(editor);
}

function addAltCursorListeners(editor) {
  if (!editor.textInput) return;
  var el = editor.textInput.getElement();
  var altCursor = false;
  event.addListener(el, "keydown", function (e) {
    var altDown = e.keyCode == 18 && !(e.ctrlKey || e.shiftKey || e.metaKey);
    if (editor.$blockSelectEnabled && altDown) {
      if (!altCursor) {
        editor.renderer.setMouseCursor("crosshair");
        altCursor = true;
      }
    } else if (altCursor) {
      reset();
    }
  }, editor);

  event.addListener(el, "keyup", reset, editor);
  event.addListener(el, "blur", reset, editor);
  function reset(e) {
    if (altCursor) {
      editor.renderer.setMouseCursor("");
      altCursor = false;
      // TODO disable menu popping up
      // e && e.preventDefault()
    }
  }
}

config.defineOptions(Editor.prototype, "editor", {
  enableMultiselect: {
    set: function (val) {
      MultiSelect(this);
      if (val) {
        this.on("changeSession", this.$multiselectOnSessionChange);
        this.on("mousedown", onMouseDown);
      } else {
        this.off("changeSession", this.$multiselectOnSessionChange);
        this.off("mousedown", onMouseDown);
      }
    },
    value: true
  },
  enableBlockSelect: {
    set: function (val) {
      this.$blockSelectEnabled = val;
    },
    value: true
  }
});