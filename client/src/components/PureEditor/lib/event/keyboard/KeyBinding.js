import keyUtil from "../../utils/keys";
import event from "../event";

export default class KeyBinding {
    $handlers = [];

    constructor(editor) {
        this.$editor = editor;
        this.$data = { editor: editor };
        this.setDefaultHandler(editor.commands);
    };

    setDefaultHandler = function (kb) {
        this.removeKeyboardHandler(this.$defaultHandler);
        this.$defaultHandler = kb;
        this.addKeyboardHandler(kb, 0);
    };

    setKeyboardHandler = function (kb) {
        var h = this.$handlers;
        if (h[h.length - 1] == kb)
            return;

        while (h[h.length - 1] && h[h.length - 1] != this.$defaultHandler)
            this.removeKeyboardHandler(h[h.length - 1]);

        this.addKeyboardHandler(kb, 1);
    };

    addKeyboardHandler = function (kb, pos) {
        if (!kb)
            return;
        if (typeof kb == "function" && !kb.handleKeyboard)
            kb.handleKeyboard = kb;
        var i = this.$handlers.indexOf(kb);
        if (i != -1)
            this.$handlers.splice(i, 1);

        if (pos == undefined)
            this.$handlers.push(kb);
        else
            this.$handlers.splice(pos, 0, kb);

        if (i == -1 && kb.attach)
            kb.attach(this.$editor);
    };

    removeKeyboardHandler = function (kb) {
        var i = this.$handlers.indexOf(kb);
        if (i == -1)
            return false;
        this.$handlers.splice(i, 1);
        kb.detach && kb.detach(this.$editor);
        return true;
    };

    getKeyboardHandler = function () {
        return this.$handlers[this.$handlers.length - 1];
    };

    getStatusText = function () {
        var data = this.$data;
        var editor = data.editor;
        return this.$handlers.map(function (h) {
            return h.getStatusText && h.getStatusText(editor, data) || "";
        }).filter(Boolean).join(" ");
    };

    $callKeyboardHandlers = function (hashId, keyString, keyCode, e) {
        var toExecute;
        var success = false;
        var commands = this.$editor.commands;

        for (var i = this.$handlers.length; i--;) {
            toExecute = this.$handlers[i].handleKeyboard(
                this.$data, hashId, keyString, keyCode, e
            );
            if (!toExecute || !toExecute.command)
                continue;

            // allow keyboardHandler to consume keys
            if (toExecute.command == "null") {
                success = true;
            } else {
                success = commands.exec(toExecute.command, this.$editor, toExecute.args, e);
            }
            // do not stop input events to not break repeating
            if (success && e && hashId != -1 &&
                toExecute.passEvent != true && toExecute.command.passEvent != true
            ) {
                event.stopEvent(e);
            }
            if (success)
                break;
        }

        if (!success && hashId == -1) {
            toExecute = { command: "insertstring" };
            success = commands.exec("insertstring", this.$editor, keyString);
        }

        if (success && this.$editor._signal)
            this.$editor._signal("keyboardActivity", toExecute);

        return success;
    };

    onCommandKey = function (e, hashId, keyCode) {
        var keyString = keyUtil.keyCodeToString(keyCode);
        return this.$callKeyboardHandlers(hashId, keyString, keyCode, e);
    };

    onTextInput = function (text) {
        return this.$callKeyboardHandlers(-1, text);
    };
}
