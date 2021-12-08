import oop from "../utils/oop";

const { Occur } = require("../occur");
const { HashHandler } = require("../event/keyboard/HashHandler");

const occurStartCommand = {
    name: "occur",
    exec: function (editor, options) {
        var alreadyInOccur = !!editor.session.$occur;
        var occurSessionActive = new Occur().enter(editor, options);
        if (occurSessionActive && !alreadyInOccur)
            OccurKeyboardHandler.installIn(editor);
    },
    readOnly: true
};

const occurCommands = [
    {
        name: "occurexit",
        bindKey: 'esc|Ctrl-G',
        exec: function (editor) {
            var occur = editor.session.$occur;
            if (!occur) return;
            occur.exit(editor, {});
            if (!editor.session.$occur) OccurKeyboardHandler.uninstallFrom(editor);
        },
        readOnly: true
    }, {
        name: "occuraccept",
        bindKey: 'enter',
        exec: function (editor) {
            var occur = editor.session.$occur;
            if (!occur) return;
            occur.exit(editor, { translatePosition: true });
            if (!editor.session.$occur) OccurKeyboardHandler.uninstallFrom(editor);
        },
        readOnly: true
    }];


const OccurKeyboardHandler = function () { }

oop.inherits(OccurKeyboardHandler, HashHandler);

(function () {

    this.isOccurHandler = true;

    this.attach = function (editor) {
        HashHandler.call(this, occurCommands, editor.commands.platform);
        this.$editor = editor;
    };

    var handleKeyboard$super = this.handleKeyboard;
    this.handleKeyboard = function (data, hashId, key, keyCode) {
        var cmd = handleKeyboard$super.call(this, data, hashId, key, keyCode);
        return (cmd && cmd.command) ? cmd : undefined;
    };

}).call(OccurKeyboardHandler.prototype);

OccurKeyboardHandler.installIn = function (editor) {
    var handler = new this();
    editor.keyBinding.addKeyboardHandler(handler);
    editor.commands.addCommands(occurCommands);
};

OccurKeyboardHandler.uninstallFrom = function (editor) {
    editor.commands.removeCommands(occurCommands);
    var handler = editor.getKeyboardHandler();
    if (handler.isOccurHandler)
        editor.keyBinding.removeKeyboardHandler(handler);
};

export default occurStartCommand;