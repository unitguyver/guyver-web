const parForEach = function (array, fn, callback) {
    var completed = 0;
    var arLength = array.length;
    if (arLength === 0)
        callback();
    for (var i = 0; i < arLength; i++) {
        fn(array[i], function (result, err) {
            completed++;
            if (completed === arLength)
                callback(result, err);
        });
    }
};

const ID_REGEX = /[a-zA-Z_0-9\$\-\u00A2-\u2000\u2070-\uFFFF]/;

const retrievePrecedingIdentifier = function (text, pos, regex) {
    regex = regex || ID_REGEX;
    var buf = [];
    for (var i = pos - 1; i >= 0; i--) {
        if (regex.test(text[i]))
            buf.push(text[i]);
        else
            break;
    }
    return buf.reverse().join("");
};

const retrieveFollowingIdentifier = function (text, pos, regex) {
    regex = regex || ID_REGEX;
    var buf = [];
    for (var i = pos; i < text.length; i++) {
        if (regex.test(text[i]))
            buf.push(text[i]);
        else
            break;
    }
    return buf;
};

const getCompletionPrefix = function (editor) {
    var pos = editor.getCursorPosition();
    var line = editor.session.getLine(pos.row);
    var prefix;
    editor.completers.forEach(function (completer) {
        if (completer.identifierRegexps) {
            completer.identifierRegexps.forEach(function (identifierRegex) {
                if (!prefix && identifierRegex)
                    prefix = this.retrievePrecedingIdentifier(line, pos.column, identifierRegex);
            }.bind(this));
        }
    }.bind(this));
    return prefix || this.retrievePrecedingIdentifier(line, pos.column);
};

export default {
    parForEach,
    retrievePrecedingIdentifier,
    retrieveFollowingIdentifier,
    getCompletionPrefix
}