import oop from "../../lib/utils/oop";
import lang from "../../lib/utils/lang";

function addWordBoundary(needle, options) {
    function wordBoundary(c) {
        if (/\w/.test(c) || options.regExp) return "\\b";
        return "";
    }
    return wordBoundary(needle[0]) + needle
        + wordBoundary(needle[needle.length - 1]);
}

export default class Search {
    $options = {};

    constructor() {

    };

    set = function (options) {
        oop.mixin(this.$options, options);
        return this;
    };

    setOptions = function (options) {
        this.$options = options;
    };

    find = function (session) {
        var options = this.$options;
        var iterator = this.$matchIterator(session, options);
        if (!iterator)
            return false;

        var firstRange = null;
        iterator.forEach(function (sr, sc, er, ec) {
            firstRange = new Range(sr, sc, er, ec);
            if (sc == ec && options.start && options.start.start
                && options.skipCurrent != false && firstRange.isEqual(options.start)
            ) {
                firstRange = null;
                return false;
            }

            return true;
        });

        return firstRange;
    };

    findAll = function (session) {
        var options = this.$options;
        if (!options.needle)
            return [];
        this.$assembleRegExp(options);

        var range = options.range;
        var lines = range
            ? session.getLines(range.start.row, range.end.row)
            : session.doc.getAllLines();

        var ranges = [];
        var re = options.re;
        if (options.$isMultiLine) {
            var len = re.length;
            var maxRow = lines.length - len;
            var prevRange;
            outer: for (var row = re.offset || 0; row <= maxRow; row++) {
                for (var j = 0; j < len; j++)
                    if (lines[row + j].search(re[j]) == -1)
                        continue outer;

                var startLine = lines[row];
                var line = lines[row + len - 1];
                var startIndex = startLine.length - startLine.match(re[0])[0].length;
                var endIndex = line.match(re[len - 1])[0].length;

                if (prevRange && prevRange.end.row === row &&
                    prevRange.end.column > startIndex
                ) {
                    continue;
                }
                ranges.push(prevRange = new Range(
                    row, startIndex, row + len - 1, endIndex
                ));
                if (len > 2)
                    row = row + len - 2;
            }
        } else {
            for (var i = 0; i < lines.length; i++) {
                var matches = lang.getMatchOffsets(lines[i], re);
                for (var j = 0; j < matches.length; j++) {
                    var match = matches[j];
                    ranges.push(new Range(i, match.offset, i, match.offset + match.length));
                }
            }
        }

        if (range) {
            var startColumn = range.start.column;
            var endColumn = range.start.column;
            var i = 0, j = ranges.length - 1;
            while (i < j && ranges[i].start.column < startColumn && ranges[i].start.row == range.start.row)
                i++;

            while (i < j && ranges[j].end.column > endColumn && ranges[j].end.row == range.end.row)
                j--;

            ranges = ranges.slice(i, j + 1);
            for (i = 0, j = ranges.length; i < j; i++) {
                ranges[i].start.row += range.start.row;
                ranges[i].end.row += range.start.row;
            }
        }

        return ranges;
    };

    replace = function (input, replacement) {
        var options = this.$options;

        var re = this.$assembleRegExp(options);
        if (options.$isMultiLine)
            return replacement;

        if (!re)
            return;

        var match = re.exec(input);
        if (!match || match[0].length != input.length)
            return null;

        replacement = input.replace(re, replacement);
        if (options.preserveCase) {
            replacement = replacement.split("");
            for (var i = Math.min(input.length, input.length); i--;) {
                var ch = input[i];
                if (ch && ch.toLowerCase() != ch)
                    replacement[i] = replacement[i].toUpperCase();
                else
                    replacement[i] = replacement[i].toLowerCase();
            }
            replacement = replacement.join("");
        }

        return replacement;
    };

    $assembleRegExp = function (options, $disableFakeMultiline) {
        if (options.needle instanceof RegExp)
            return options.re = options.needle;

        var needle = options.needle;

        if (!options.needle)
            return options.re = false;

        if (!options.regExp)
            needle = lang.escapeRegExp(needle);

        if (options.wholeWord)
            needle = addWordBoundary(needle, options);

        var modifier = options.caseSensitive ? "gm" : "gmi";

        options.$isMultiLine = !$disableFakeMultiline && /[\n\r]/.test(needle);
        if (options.$isMultiLine)
            return options.re = this.$assembleMultilineRegExp(needle, modifier);

        try {
            var re = new RegExp(needle, modifier);
        } catch (e) {
            console.log(e)
            re = false;
        }
        return options.re = re;
    };

    $assembleMultilineRegExp = function (needle, modifier) {
        var parts = needle.replace(/\r\n|\r|\n/g, "$\n^").split("\n");
        var re = [];
        for (var i = 0; i < parts.length; i++) try {
            re.push(new RegExp(parts[i], modifier));
        } catch (e) {
            return false;
        }
        return re;
    };

    $matchIterator = function (session, options) {
        var re = this.$assembleRegExp(options);
        if (!re)
            return false;
        var backwards = options.backwards == true;
        var skipCurrent = options.skipCurrent != false;

        var range = options.range;
        var start = options.start;
        if (!start)
            start = range ? range[backwards ? "end" : "start"] : session.selection.getRange();

        if (start.start)
            start = start[skipCurrent != backwards ? "end" : "start"];

        var firstRow = range ? range.start.row : 0;
        var lastRow = range ? range.end.row : session.getLength() - 1;

        if (backwards) {
            var forEach = function (callback) {
                var row = start.row;
                if (forEachInLine(row, start.column, callback))
                    return;
                for (row--; row >= firstRow; row--)
                    if (forEachInLine(row, Number.MAX_VALUE, callback))
                        return;
                if (options.wrap == false)
                    return;
                for (row = lastRow, firstRow = start.row; row >= firstRow; row--)
                    if (forEachInLine(row, Number.MAX_VALUE, callback))
                        return;
            };
        }
        else {
            var forEach = function (callback) {
                var row = start.row;
                if (forEachInLine(row, start.column, callback))
                    return;
                for (row = row + 1; row <= lastRow; row++)
                    if (forEachInLine(row, 0, callback))
                        return;
                if (options.wrap == false)
                    return;
                for (row = firstRow, lastRow = start.row; row <= lastRow; row++)
                    if (forEachInLine(row, 0, callback))
                        return;
            };
        }

        if (options.$isMultiLine) {
            var len = re.length;
            var forEachInLine = function (row, offset, callback) {
                var startRow = backwards ? row - len + 1 : row;
                if (startRow < 0 || startRow + len > session.getLength()) return;
                var line = session.getLine(startRow);
                var startIndex = line.search(re[0]);
                if (!backwards && startIndex < offset || startIndex === -1) return;
                for (var i = 1; i < len; i++) {
                    line = session.getLine(startRow + i);
                    if (line.search(re[i]) == -1)
                        return;
                }
                var endIndex = line.match(re[len - 1])[0].length;
                if (backwards && endIndex > offset) return;
                if (callback(startRow, startIndex, startRow + len - 1, endIndex))
                    return true;
            };
        }
        else if (backwards) {
            var forEachInLine = function (row, endIndex, callback) {
                var line = session.getLine(row);
                var matches = [];
                var m, last = 0;
                re.lastIndex = 0;
                while ((m = re.exec(line))) {
                    var length = m[0].length;
                    last = m.index;
                    if (!length) {
                        if (last >= line.length) break;
                        re.lastIndex = last += 1;
                    }
                    if (m.index + length > endIndex)
                        break;
                    matches.push(m.index, length);
                }
                for (var i = matches.length - 1; i >= 0; i -= 2) {
                    var column = matches[i - 1];
                    var length = matches[i];
                    if (callback(row, column, row, column + length))
                        return true;
                }
            };
        }
        else {
            var forEachInLine = function (row, startIndex, callback) {
                var line = session.getLine(row);
                var last;
                var m;
                re.lastIndex = startIndex;
                while ((m = re.exec(line))) {
                    var length = m[0].length;
                    last = m.index;
                    if (callback(row, last, row, last + length))
                        return true;
                    if (!length) {
                        re.lastIndex = last += 1;
                        if (last >= line.length) return false;
                    }
                }
            };
        }
        return { forEach: forEach };
    };
}
