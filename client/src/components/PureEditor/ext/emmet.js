import config from "../editor/config";
import Range from "../editor/tools/Range";
import Editor from "../editor";
import HashHandler from "../lib/event/keyboard/HashHandler";
import snippetManager from "../snippets"

let emmet, emmetPath;

export class AceEmmetEditor {
    setupContext(editor) {
        this.ace = editor;
        this.indentation = editor.session.getTabString();
        if (!emmet)
            emmet = window.emmet;
        var resources = emmet.resources || emmet.require("resources");
        resources.setVariable("indentation", this.indentation);
        this.$syntax = null;
        this.$syntax = this.getSyntax();
    };

    getSelectionRange() {
        // TODO should start be caret position instead?
        var range = this.ace.getSelectionRange();
        var doc = this.ace.session.doc;
        return {
            start: doc.positionToIndex(range.start),
            end: doc.positionToIndex(range.end)
        };
    };

    createSelection(start, end) {
        var doc = this.ace.session.doc;
        this.ace.selection.setRange({
            start: doc.indexToPosition(start),
            end: doc.indexToPosition(end)
        });
    };

    getCurrentLineRange() {
        var ace = this.ace;
        var row = ace.getCursorPosition().row;
        var lineLength = ace.session.getLine(row).length;
        var index = ace.session.doc.positionToIndex({ row: row, column: 0 });
        return {
            start: index,
            end: index + lineLength
        };
    };

    getCaretPos() {
        var pos = this.ace.getCursorPosition();
        return this.ace.session.doc.positionToIndex(pos);
    };

    setCaretPos(index) {
        var pos = this.ace.session.doc.indexToPosition(index);
        this.ace.selection.moveToPosition(pos);
    };

    getCurrentLine() {
        var row = this.ace.getCursorPosition().row;
        return this.ace.session.getLine(row);
    };

    replaceContent(value, start, end, noIndent) {
        if (end == null)
            end = start == null ? this.getContent().length : start;
        if (start == null)
            start = 0;

        var editor = this.ace;
        var doc = editor.session.doc;
        var range = Range.fromPoints(doc.indexToPosition(start), doc.indexToPosition(end));
        editor.session.remove(range);

        range.end = range.start;
        //editor.selection.setRange(range);

        value = this.$updateTabstops(value);
        snippetManager.insertSnippet(editor, value);
    };

    getContent() {
        return this.ace.getValue();
    };

    getSyntax() {
        if (this.$syntax)
            return this.$syntax;
        var syntax = this.ace.session.$modeId.split("/").pop();
        if (syntax == "html" || syntax == "php") {
            var cursor = this.ace.getCursorPosition();
            var state = this.ace.session.getState(cursor.row);
            if (typeof state != "string")
                state = state[0];
            if (state) {
                state = state.split("-");
                if (state.length > 1)
                    syntax = state[0];
                else if (syntax == "php")
                    syntax = "html";
            }
        }
        return syntax;
    };

    getProfileName() {
        var resources = emmet.resources || emmet.require("resources");
        switch (this.getSyntax()) {
            case "css": return "css";
            case "xml":
            case "xsl":
                return "xml";
            case "html":
                var profile = resources.getVariable("profile");
                // no forced profile, guess from content html or xhtml?
                if (!profile)
                    profile = this.ace.session.getLines(0, 2).join("").search(/<!DOCTYPE[^>]+XHTML/i) != -1 ? "xhtml" : "html";
                return profile;
            default:
                var mode = this.ace.session.$mode;
                return mode.emmetConfig && mode.emmetConfig.profile || "xhtml";
        }
    };

    prompt(title) {
        return prompt(title); // eslint-disable-line no-alert
    };

    getSelection() {
        return this.ace.session.getTextRange();
    };

    getFilePath() {
        return "";
    };

    $updateTabstops(value) {
        var base = 1000;
        var zeroBase = 0;
        var lastZero = null;
        var ts = emmet.tabStops || emmet.require('tabStops');
        var resources = emmet.resources || emmet.require("resources");
        var settings = resources.getVocabulary("user");
        var tabstopOptions = {
            tabstop: function (data) {
                var group = parseInt(data.group, 10);
                var isZero = group === 0;
                if (isZero)
                    group = ++zeroBase;
                else
                    group += base;

                var placeholder = data.placeholder;
                if (placeholder) {
                    // recursively update nested tabstops
                    placeholder = ts.processText(placeholder, tabstopOptions);
                }

                var result = '${' + group + (placeholder ? ':' + placeholder : '') + '}';

                if (isZero) {
                    lastZero = [data.start, result];
                }

                return result;
            },
            escape: function (ch) {
                if (ch == '$') return '\\$';
                if (ch == '\\') return '\\\\';
                return ch;
            }
        };

        value = ts.processText(value, tabstopOptions);

        if (settings.variables['insert_final_tabstop'] && !/\$\{0\}$/.test(value)) {
            value += '${0}';
        } else if (lastZero) {
            var common = emmet.utils ? emmet.utils.common : emmet.require('utils');
            value = common.replaceSubstring(value, '${0}', lastZero[0], lastZero[1]);
        }

        return value;
    }
}

const keymap = {
    expand_abbreviation: { "mac": "ctrl+alt+e", "win": "alt+e" },
    match_pair_outward: { "mac": "ctrl+d", "win": "ctrl+," },
    match_pair_inward: { "mac": "ctrl+j", "win": "ctrl+shift+0" },
    matching_pair: { "mac": "ctrl+alt+j", "win": "alt+j" },
    next_edit_point: "alt+right",
    prev_edit_point: "alt+left",
    toggle_comment: { "mac": "command+/", "win": "ctrl+/" },
    split_join_tag: { "mac": "shift+command+'", "win": "shift+ctrl+`" },
    remove_tag: { "mac": "command+'", "win": "shift+ctrl+;" },
    evaluate_math_expression: { "mac": "shift+command+y", "win": "shift+ctrl+y" },
    increment_number_by_1: "ctrl+up",
    decrement_number_by_1: "ctrl+down",
    increment_number_by_01: "alt+up",
    decrement_number_by_01: "alt+down",
    increment_number_by_10: { "mac": "alt+command+up", "win": "shift+alt+up" },
    decrement_number_by_10: { "mac": "alt+command+down", "win": "shift+alt+down" },
    select_next_item: { "mac": "shift+command+.", "win": "shift+ctrl+." },
    select_previous_item: { "mac": "shift+command+,", "win": "shift+ctrl+," },
    reflect_css_value: { "mac": "shift+command+r", "win": "shift+ctrl+r" },

    encode_decode_data_url: { "mac": "shift+ctrl+d", "win": "ctrl+'" },
    // update_image_size: {"mac": "shift+ctrl+i", "win": "ctrl+u"},
    // expand_as_you_type: "ctrl+alt+enter",
    // wrap_as_you_type: {"mac": "shift+ctrl+g", "win": "shift+ctrl+g"},
    expand_abbreviation_with_tab: "Tab",
    wrap_with_abbreviation: { "mac": "shift+ctrl+a", "win": "shift+ctrl+a" }
};

const editorProxy = new AceEmmetEditor();

const onChangeMode = function (e, target) {
    var editor = target;
    if (!editor)
        return;
    var enabled = isSupportedMode(editor.session.$mode);
    if (e.enableEmmet === false)
        enabled = false;
    if (enabled)
        load();
    updateCommands(editor, enabled);
};

export const commands = new HashHandler();
export const runEmmetCommand = function runEmmetCommand(editor) {
    if (this.action == "expand_abbreviation_with_tab") {
        if (!editor.selection.isEmpty())
            return false;
        var pos = editor.selection.lead;
        var token = editor.session.getTokenAt(pos.row, pos.column);
        if (token && /\btag\b/.test(token.type))
            return false;
    }
    try {
        editorProxy.setupContext(editor);
        var actions = emmet.actions || emmet.require("actions");

        if (this.action == "wrap_with_abbreviation") {
            // without setTimeout prompt doesn't work on firefox
            return setTimeout(function () {
                actions.run("wrap_with_abbreviation", editorProxy);
            }, 0);
        }

        var result = actions.run(this.action, editorProxy);
    } catch (e) {
        console.log(e)
        if (!emmet) {
            var loading = load(runEmmetCommand.bind(this, editor));
            if (this.action == "expand_abbreviation_with_tab")
                return false;
            return loading;
        }
        editor._signal("changeStatus", typeof e == "string" ? e : e.message);
        config.warn(e);
        result = false;
    }
    return result;
};

for (var command in keymap) {
    commands.addCommand({
        name: "emmet:" + command,
        action: command,
        bindKey: keymap[command],
        exec: runEmmetCommand,
        multiSelectAction: "forEach"
    });
}

export const updateCommands = function (editor, enabled) {
    if (enabled) {
        editor.keyBinding.addKeyboardHandler(commands);
    } else {
        editor.keyBinding.removeKeyboardHandler(commands);
    }
};

export const isSupportedMode = function (mode) {
    if (!mode) return false;
    if (mode.emmetConfig) return true;
    var id = mode.$id || mode;
    return /css|less|scss|sass|stylus|html|php|twig|ejs|handlebars/.test(id);
};

export const isAvailable = function (editor, command) {
    if (/(evaluate_math_expression|expand_abbreviation)$/.test(command))
        return true;
    var mode = editor.session.$mode;
    var isSupported = isSupportedMode(mode);
    if (isSupported && mode.$modes) {
        // TODO refactor mode delegates to make this simpler
        try {
            editorProxy.setupContext(editor);
            if (/js|php/.test(editorProxy.getSyntax()))
                isSupported = false;
        } catch (e) {
            console.log(e)
        }
    }
    return isSupported;
};

export const load = function (cb) {
    if (typeof emmetPath !== "string") {
        config.warn("script for emmet-core is not loaded");
        return false;
    }
    config.loadModule(emmetPath, function () {
        emmetPath = null;
        cb && cb();
    });
    return true;
};

config.defineOptions(Editor.prototype, "editor", {
    enableEmmet: {
        set: function (val) {
            this[val ? "on" : "removeListener"]("changeMode", onChangeMode);
            onChangeMode({ enableEmmet: !!val }, this);
        },
        value: true
    }
});
