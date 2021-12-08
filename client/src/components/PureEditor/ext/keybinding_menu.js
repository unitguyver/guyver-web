import Editor from '../editor';
import overlayPage from './menu_tools/overlay_page';
import getEditorKeybordShortcuts from './menu_tools/get_editor_keyboard_shortcuts';

function showKeyboardShortcuts(editor) {
    // make sure the menu isn't open already.
    if (!document.getElementById('kbshortcutmenu')) {
        const kb = getEditorKeybordShortcuts(editor);
        const el = document.createElement('div');
        const commands = kb.reduce(function (previous, current) {
            return previous + '<div class="ace_optionsMenuEntry"><span class="ace_optionsMenuCommand">'
                + current.command + '</span> : '
                + '<span class="ace_optionsMenuKey">' + current.key + '</span></div>';
        }, '');

        el.id = 'kbshortcutmenu';
        el.innerHTML = '<h1>Keyboard Shortcuts</h1>' + commands + '</div>';
        overlayPage(editor, el);
    }
}

export default function init(editor) {
    Editor.prototype.showKeyboardShortcuts = function () {
        showKeyboardShortcuts(this);
    };
    editor.commands.addCommands([{
        name: "showKeyboardShortcuts",
        bindKey: { win: "Ctrl-Alt-h", mac: "Command-Alt-h" },
        exec: function (editor, line) {
            editor.showKeyboardShortcuts();
        }
    }]);
};
