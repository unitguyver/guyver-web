import snippetManager from "../snippets";
import Autocomplete from "../lib/autocomplete/AutoComplete";
import config from "../editor/config";
import lang from "../lib/utils/lang";
import util from "../lib/autocomplete/util";
import textCompleter from "../lib/autocomplete/text_completer";
import Editor from "../editor";

const keyWordCompleter = {
    getCompletions: function (editor, session, pos, prefix, callback) {
        if (session.$mode.completer) {
            return session.$mode.completer.getCompletions(editor, session, pos, prefix, callback);
        }
        var state = editor.session.getState(pos.row);
        var completions = session.$mode.getCompletions(state, session, pos, prefix);
        callback(null, completions);
    }
};

const snippetCompleter = {
    getCompletions: function (editor, session, pos, prefix, callback) {
        var scopes = [];

        // set scope to html-tag if we're inside an html tag
        var token = session.getTokenAt(pos.row, pos.column);
        if (token && token.type.match(/(tag-name|tag-open|tag-whitespace|attribute-name|attribute-value)\.xml$/))
            scopes.push('html-tag');
        else
            scopes = snippetManager.getActiveScopes(editor);

        var snippetMap = snippetManager.snippetMap;
        var completions = [];
        scopes.forEach(function (scope) {
            var snippets = snippetMap[scope] || [];
            for (var i = snippets.length; i--;) {
                var s = snippets[i];
                var caption = s.name || s.tabTrigger;
                if (!caption)
                    continue;
                completions.push({
                    caption: caption,
                    snippet: s.content,
                    meta: s.tabTrigger && !s.name ? s.tabTrigger + "\u21E5 " : "snippet",
                    type: "snippet"
                });
            }
        }, this);
        callback(null, completions);
    },
    getDocTooltip: function (item) {
        if (item.type == "snippet" && !item.docHTML) {
            item.docHTML = [
                "<b>", lang.escapeHTML(item.caption), "</b>", "<hr></hr>",
                lang.escapeHTML(item.snippet)
            ].join("");
        }
    }
};

let completers = [snippetCompleter, textCompleter, keyWordCompleter];

const expandSnippet = {
    name: "expandSnippet",
    exec: function (editor) {
        return snippetManager.expandWithTab(editor);
    },
    bindKey: "Tab"
};

const onChangeMode = function (e, editor) {
    loadSnippetsForMode(editor.session.$mode);
};

const loadSnippetsForMode = function (mode) {
    if (typeof mode == "string")
        mode = config.$modes[mode];
    if (!mode)
        return;
    if (!snippetManager.files)
        snippetManager.files = {};

    loadSnippetFile(mode.$id, mode.snippetFileId);
    if (mode.modes)
        mode.modes.forEach(loadSnippetsForMode);
};

const loadSnippetFile = function (id, snippetFilePath) {
    if (!snippetFilePath || !id || snippetManager.files[id])
        return;
    snippetManager.files[id] = {};
    config.loadModule(snippetFilePath, function (m) {
        if (!m) return;
        snippetManager.files[id] = m;
        if (!m.snippets && m.snippetText)
            m.snippets = snippetManager.parseSnippetFile(m.snippetText);
        snippetManager.register(m.snippets || [], m.scope);
        if (m.includeScopes) {
            snippetManager.snippetMap[m.scope].includeScopes = m.includeScopes;
            m.includeScopes.forEach(function (x) {
                loadSnippetsForMode("ace/mode/" + x);
            });
        }
    });
};

const doLiveAutocomplete = function (e) {
    var editor = e.editor;
    var hasCompleter = editor.completer && editor.completer.activated;

    // We don't want to autocomplete with no prefix
    if (e.command.name === "backspace") {
        if (hasCompleter && !util.getCompletionPrefix(editor))
            editor.completer.detach();
    }
    else if (e.command.name === "insertstring") {
        var prefix = util.getCompletionPrefix(editor);
        // Only autocomplete if there's a prefix that can be matched
        if (prefix && !hasCompleter) {
            var completer = Autocomplete.for(editor);
            // Disable autoInsert
            completer.autoInsert = false;
            completer.showPopup(editor);
        }
    }
};

config.defineOptions(Editor.prototype, "editor", {
    enableBasicAutocompletion: {
        set: function (val) {
            if (val) {
                if (!this.completers)
                    this.completers = Array.isArray(val) ? val : completers;
                this.commands.addCommand(Autocomplete.startCommand);
            } else {
                this.commands.removeCommand(Autocomplete.startCommand);
            }
        },
        value: false
    },

    enableLiveAutocompletion: {
        set: function (val) {
            if (val) {
                if (!this.completers)
                    this.completers = Array.isArray(val) ? val : completers;
                // On each change automatically trigger the autocomplete
                this.commands.on('afterExec', doLiveAutocomplete);
            } else {
                this.commands.removeListener('afterExec', doLiveAutocomplete);
            }
        },
        value: false
    },
    enableSnippets: {
        set: function (val) {
            if (val) {
                this.commands.addCommand(expandSnippet);
                this.on("changeMode", onChangeMode);
                onChangeMode(null, this);
            } else {
                this.commands.removeCommand(expandSnippet);
                this.off("changeMode", onChangeMode);
            }
        },
        value: false
    }
});

const setCompleters = function (val) {
    completers.length = 0;
    if (val) completers.push.apply(completers, val);
};
const addCompleter = function (completer) {
    completers.push(completer);
};

export default {
    setCompleters,
    addCompleter,
    textCompleter,
    keyWordCompleter,
    snippetCompleter
}
