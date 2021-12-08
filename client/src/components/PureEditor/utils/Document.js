import EventEmitter from "../lib/event/EventEmitter";
import Range from "../editor/tools/Range";
import Anchor from "../editor/tools/Anchor";

const applyDelta = function (docLines, delta) {

    var row = delta.start.row;
    var startColumn = delta.start.column;
    var line = docLines[row] || "";
    switch (delta.action) {
        case "insert":
            var lines = delta.lines;
            if (lines.length === 1) {
                docLines[row] = line.substring(0, startColumn) + delta.lines[0] + line.substring(startColumn);
            } else {
                var args = [row, 1].concat(delta.lines);
                docLines.splice.apply(docLines, args);
                docLines[row] = line.substring(0, startColumn) + docLines[row];
                docLines[row + delta.lines.length - 1] += line.substring(startColumn);
            }
            break;
        case "remove":
            var endColumn = delta.end.column;
            var endRow = delta.end.row;
            if (row === endRow) {
                docLines[row] = line.substring(0, startColumn) + line.substring(endColumn);
            } else {
                docLines.splice(
                    row, endRow - row + 1,
                    line.substring(0, startColumn) + docLines[endRow].substring(endColumn)
                );
            }
            break;
    }
};

@EventEmitter
export default class Document {
    $lines = [""];
    $autoNewLine = "";
    $newLineMode = "auto";

    constructor(textOrLines) {

        if (textOrLines.length === 0) {
            this.$lines = [""];
        } else if (Array.isArray(textOrLines)) {
            this.insertMergedLines({ row: 0, column: 0 }, textOrLines);
        } else {
            this.insert({ row: 0, column: 0 }, textOrLines);
        }
    };

    setValue = function (text) {
        var len = this.getLength() - 1;
        this.remove(new Range(0, 0, len, this.getLine(len).length));
        this.insert({ row: 0, column: 0 }, text);
    };

    getValue = function () {
        return this.getAllLines().join(this.getNewLineCharacter());
    };

    createAnchor = function (row, column) {
        return new Anchor(this, row, column);
    };

    $split = function (text) {
        return text.split(/\r\n|\r|\n/);
    };

    $detectNewLine = function (text) {
        var match = text.match(/^.*?(\r\n|\r|\n)/m);
        this.$autoNewLine = match ? match[1] : "\n";
        this._signal("changeNewLineMode");
    };

    getNewLineCharacter = function () {
        switch (this.$newLineMode) {
            case "windows":
                return "\r\n";
            case "unix":
                return "\n";
            default:
                return this.$autoNewLine || "\n";
        }
    };

    setNewLineMode = function (newLineMode) {
        if (this.$newLineMode === newLineMode)
            return;

        this.$newLineMode = newLineMode;
        this._signal("changeNewLineMode");
    };

    getNewLineMode = function () {
        return this.$newLineMode;
    };

    isNewLine = function (text) {
        return (text == "\r\n" || text == "\r" || text == "\n");
    };

    getLine = function (row) {
        return this.$lines[row] || "";
    };

    getLines = function (firstRow, lastRow) {
        return this.$lines.slice(firstRow, lastRow + 1);
    };

    getAllLines = function () {
        return this.getLines(0, this.getLength());
    };

    getLength = function () {
        return this.$lines.length;
    };

    getTextRange = function (range) {
        return this.getLinesForRange(range).join(this.getNewLineCharacter());
    };

    getLinesForRange = function (range) {
        var lines;
        if (range.start.row === range.end.row) {
            // Handle a single-line range.
            lines = [this.getLine(range.start.row).substring(range.start.column, range.end.column)];
        } else {
            // Handle a multi-line range.
            lines = this.getLines(range.start.row, range.end.row);
            lines[0] = (lines[0] || "").substring(range.start.column);
            var l = lines.length - 1;
            if (range.end.row - range.start.row == l)
                lines[l] = lines[l].substring(0, range.end.column);
        }
        return lines;
    };

    insert = function (position, text) {
        if (this.getLength() <= 1)
            this.$detectNewLine(text);

        return this.insertMergedLines(position, this.$split(text));
    };

    insertInLine = function (position, text) {
        var start = this.clippedPos(position.row, position.column);
        var end = this.pos(position.row, position.column + text.length);

        this.applyDelta({
            start: start,
            end: end,
            action: "insert",
            lines: [text]
        }, true);

        return this.clonePos(end);
    };

    clippedPos = function (row, column) {
        var length = this.getLength();
        if (row === undefined) {
            row = length;
        } else if (row < 0) {
            row = 0;
        } else if (row >= length) {
            row = length - 1;
            column = undefined;
        }
        var line = this.getLine(row);
        if (column == undefined)
            column = line.length;
        column = Math.min(Math.max(column, 0), line.length);
        return { row: row, column: column };
    };

    clonePos = function (pos) {
        return { row: pos.row, column: pos.column };
    };

    pos = function (row, column) {
        return { row: row, column: column };
    };

    $clipPosition = function (position) {
        var length = this.getLength();
        if (position.row >= length) {
            position.row = Math.max(0, length - 1);
            position.column = this.getLine(length - 1).length;
        } else {
            position.row = Math.max(0, position.row);
            position.column = Math.min(Math.max(position.column, 0), this.getLine(position.row).length);
        }
        return position;
    };

    insertFullLines = function (row, lines) {

        row = Math.min(Math.max(row, 0), this.getLength());

        var column = 0;
        if (row < this.getLength()) {

            lines = lines.concat([""]);
            column = 0;
        } else {

            lines = [""].concat(lines);
            row--;
            column = this.$lines[row].length;
        }

        this.insertMergedLines({ row: row, column: column }, lines);
    };

    insertMergedLines = function (position, lines) {
        var start = this.clippedPos(position.row, position.column);
        var end = {
            row: start.row + lines.length - 1,
            column: (lines.length == 1 ? start.column : 0) + lines[lines.length - 1].length
        };

        this.applyDelta({
            start: start,
            end: end,
            action: "insert",
            lines: lines
        });

        return this.clonePos(end);
    };

    remove = function (range) {
        var start = this.clippedPos(range.start.row, range.start.column);
        var end = this.clippedPos(range.end.row, range.end.column);
        this.applyDelta({
            start: start,
            end: end,
            action: "remove",
            lines: this.getLinesForRange({ start: start, end: end })
        });
        return this.clonePos(start);
    };

    removeInLine = function (row, startColumn, endColumn) {
        var start = this.clippedPos(row, startColumn);
        var end = this.clippedPos(row, endColumn);

        this.applyDelta({
            start: start,
            end: end,
            action: "remove",
            lines: this.getLinesForRange({ start: start, end: end })
        }, true);

        return this.clonePos(start);
    };

    removeFullLines = function (firstRow, lastRow) {
        // Clip to document.
        firstRow = Math.min(Math.max(0, firstRow), this.getLength() - 1);
        lastRow = Math.min(Math.max(0, lastRow), this.getLength() - 1);

        var deleteFirstNewLine = lastRow == this.getLength() - 1 && firstRow > 0;
        var deleteLastNewLine = lastRow < this.getLength() - 1;
        var startRow = (deleteFirstNewLine ? firstRow - 1 : firstRow);
        var startCol = (deleteFirstNewLine ? this.getLine(startRow).length : 0);
        var endRow = (deleteLastNewLine ? lastRow + 1 : lastRow);
        var endCol = (deleteLastNewLine ? 0 : this.getLine(endRow).length);
        var range = new Range(startRow, startCol, endRow, endCol);

        // Store delelted lines with bounding newlines ommitted (maintains previous behavior).
        var deletedLines = this.$lines.slice(firstRow, lastRow + 1);

        this.applyDelta({
            start: range.start,
            end: range.end,
            action: "remove",
            lines: this.getLinesForRange(range)
        });

        // Return the deleted lines.
        return deletedLines;
    };

    removeNewLine = function (row) {
        if (row < this.getLength() - 1 && row >= 0) {
            this.applyDelta({
                start: this.pos(row, this.getLine(row).length),
                end: this.pos(row + 1, 0),
                action: "remove",
                lines: ["", ""]
            });
        }
    };

    replace = function (range, text) {
        if (!(range instanceof Range))
            range = Range.fromPoints(range.start, range.end);
        if (text.length === 0 && range.isEmpty())
            return range.start;

        if (text == this.getTextRange(range))
            return range.end;

        this.remove(range);
        var end;
        if (text) {
            end = this.insert(range.start, text);
        }
        else {
            end = range.start;
        }

        return end;
    };

    applyDeltas = function (deltas) {
        for (var i = 0; i < deltas.length; i++) {
            this.applyDelta(deltas[i]);
        }
    };

    revertDeltas = function (deltas) {
        for (var i = deltas.length - 1; i >= 0; i--) {
            this.revertDelta(deltas[i]);
        }
    };

    applyDelta = function (delta, doNotValidate) {
        var isInsert = delta.action == "insert";

        if (isInsert ? delta.lines.length <= 1 && !delta.lines[0]
            : !Range.comparePoints(delta.start, delta.end)) {
            return;
        }

        if (isInsert && delta.lines.length > 20000) {
            this.$splitAndapplyLargeDelta(delta, 20000);
        }
        else {
            applyDelta(this.$lines, delta, doNotValidate);
            this._signal("change", delta);
        }
    };

    $safeApplyDelta = function (delta) {
        var docLength = this.$lines.length;
        // verify that delta is in the document to prevent applyDelta from corrupting lines array 
        if (
            delta.action == "remove" && delta.start.row < docLength && delta.end.row < docLength
            || delta.action == "insert" && delta.start.row <= docLength
        ) {
            this.applyDelta(delta);
        }
    };

    $splitAndapplyLargeDelta = function (delta, MAX) {

        var lines = delta.lines;
        var l = lines.length - MAX + 1;
        var row = delta.start.row;
        var column = delta.start.column;
        for (var from = 0, to = 0; from < l; from = to) {
            to += MAX - 1;
            var chunk = lines.slice(from, to);
            chunk.push("");
            this.applyDelta({
                start: this.pos(row + from, column),
                end: this.pos(row + to, column = 0),
                action: delta.action,
                lines: chunk
            }, true);
        }

        delta.lines = lines.slice(from);
        delta.start.row = row + from;
        delta.start.column = column;
        this.applyDelta(delta, true);
    };

    revertDelta = function (delta) {
        this.$safeApplyDelta({
            start: this.clonePos(delta.start),
            end: this.clonePos(delta.end),
            action: (delta.action == "insert" ? "remove" : "insert"),
            lines: delta.lines.slice()
        });
    };

    indexToPosition = function (index, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        for (var i = startRow || 0, l = lines.length; i < l; i++) {
            index -= lines[i].length + newlineLength;
            if (index < 0)
                return { row: i, column: index + lines[i].length + newlineLength };
        }
        return { row: l - 1, column: index + lines[l - 1].length + newlineLength };
    };

    positionToIndex = function (pos, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        var index = 0;
        var row = Math.min(pos.row, lines.length);
        for (var i = startRow || 0; i < row; ++i)
            index += lines[i].length + newlineLength;

        return index + pos.column;
    };
}
