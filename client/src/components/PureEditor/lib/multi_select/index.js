import EditSession from "../../editor/session";
import * as SelectionUtils from "./SelectionUtils";
import * as EditorUtils from "./EditorUtils";
import config from "../../editor/config";
import Selection from "../../editor/tools/Selection";
import * as _commands from "../commands/multi_select_commands";
import event from "../event/event";

const { onMouseDown } = require("../event/mouse/multi_select_handler");

const commands = _commands.defaultCommands.concat(_commands.multiSelectCommands);

const onSessionChange = function (e) {
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

const MultiSelect = function (editor) {
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

const addAltCursorListeners = function (editor) {
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

export default function multiSelect(Sub) {
  for (let editorUtilName in EditorUtils) {
    Sub.prototype[editorUtilName] = EditorUtils[editorUtilName];
  }

  for (let selectionUtilName in SelectionUtils) {
    Selection.prototype[selectionUtilName] = SelectionUtils[selectionUtilName];
  }

  EditSession.prototype.getSelectionMarkers = function () {
    return this.$selectionMarkers;
  };
  config.defineOptions(Sub.prototype, "editor", {
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

  return Sub;
}

