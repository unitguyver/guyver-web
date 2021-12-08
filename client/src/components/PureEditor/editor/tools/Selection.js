import EventEmitter from "../../lib/event/EventEmitter";
import Range from "./Range";
import lang from "../../lib/utils/lang";

@EventEmitter
export default class Selection {
    constructor(session) {

        this.session = session;
        this.doc = session.getDocument();

        this.clearSelection();
        this.cursor = this.lead = this.doc.createAnchor(0, 0);
        this.anchor = this.doc.createAnchor(0, 0);
        this.$silent = false;

        var self = this;
        this.cursor.on("change", function (e) {
            self.$cursorChanged = true;
            if (!self.$silent)
                self._emit("changeCursor");
            if (!self.$isEmpty && !self.$silent)
                self._emit("changeSelection");
            if (!self.$keepDesiredColumnOnChange && e.old.column != e.value.column)
                self.$desiredColumn = null;
        });

        this.anchor.on("change", function () {
            self.$anchorChanged = true;
            if (!self.$isEmpty && !self.$silent)
                self._emit("changeSelection");
        });
    };

    isEmpty = function () {
        return this.$isEmpty || (
            this.anchor.row == this.lead.row &&
            this.anchor.column == this.lead.column
        );
    };

    isMultiLine = function () {
        return !this.$isEmpty && this.anchor.row != this.cursor.row;
    };

    getCursor = function () {
        return this.lead.getPosition();
    };

    setSelectionAnchor = function (row, column) {
        this.$isEmpty = false;
        this.anchor.setPosition(row, column);
    };

    getAnchor = this.getSelectionAnchor = function () {
        if (this.$isEmpty)
            return this.getSelectionLead();

        return this.anchor.getPosition();
    };

    isBackwards = function () {
        var anchor = this.anchor;
        var lead = this.lead;
        return (anchor.row > lead.row || (anchor.row == lead.row && anchor.column > lead.column));
    };

    getRange = function () {
        var anchor = this.anchor;
        var lead = this.lead;

        if (this.$isEmpty)
            return Range.fromPoints(lead, lead);

        return this.isBackwards()
            ? Range.fromPoints(lead, anchor)
            : Range.fromPoints(anchor, lead);
    };

    clearSelection = function () {
        if (!this.$isEmpty) {
            this.$isEmpty = true;
            this._emit("changeSelection");
        }
    };

    selectAll = function () {
        this.$setSelection(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
    };

    setRange = this.setSelectionRange = function (range, reverse) {
        var start = reverse ? range.end : range.start;
        var end = reverse ? range.start : range.end;
        this.$setSelection(start.row, start.column, end.row, end.column);
    };

    $setSelection = function (anchorRow, anchorColumn, cursorRow, cursorColumn) {
        if (this.$silent)
            return;
        var wasEmpty = this.$isEmpty;
        var wasMultiselect = this.inMultiSelectMode;
        this.$silent = true;
        this.$cursorChanged = this.$anchorChanged = false;
        this.anchor.setPosition(anchorRow, anchorColumn);
        this.cursor.setPosition(cursorRow, cursorColumn);
        this.$isEmpty = !Range.comparePoints(this.anchor, this.cursor);
        this.$silent = false;
        if (this.$cursorChanged)
            this._emit("changeCursor");
        if (this.$cursorChanged || this.$anchorChanged || wasEmpty != this.$isEmpty || wasMultiselect)
            this._emit("changeSelection");
    };

    $moveSelection = function (mover) {
        var lead = this.lead;
        if (this.$isEmpty)
            this.setSelectionAnchor(lead.row, lead.column);

        mover.call(this);
    };

    selectTo = function (row, column) {
        this.$moveSelection(function () {
            this.moveCursorTo(row, column);
        });
    };

    selectToPosition = function (pos) {
        this.$moveSelection(function () {
            this.moveCursorToPosition(pos);
        });
    };

    moveTo = function (row, column) {
        this.clearSelection();
        this.moveCursorTo(row, column);
    };

    moveToPosition = function (pos) {
        this.clearSelection();
        this.moveCursorToPosition(pos);
    };

    selectUp = function () {
        this.$moveSelection(this.moveCursorUp);
    };

    selectDown = function () {
        this.$moveSelection(this.moveCursorDown);
    };

    selectRight = function () {
        this.$moveSelection(this.moveCursorRight);
    };

    selectLeft = function () {
        this.$moveSelection(this.moveCursorLeft);
    };

    selectLineStart = function () {
        this.$moveSelection(this.moveCursorLineStart);
    };

    selectLineEnd = function () {
        this.$moveSelection(this.moveCursorLineEnd);
    };

    selectFileEnd = function () {
        this.$moveSelection(this.moveCursorFileEnd);
    };

    selectFileStart = function () {
        this.$moveSelection(this.moveCursorFileStart);
    };

    selectWordRight = function () {
        this.$moveSelection(this.moveCursorWordRight);
    };

    selectWordLeft = function () {
        this.$moveSelection(this.moveCursorWordLeft);
    };

    getWordRange = function (row, column) {
        if (typeof column == "undefined") {
            var cursor = row || this.lead;
            row = cursor.row;
            column = cursor.column;
        }
        return this.session.getWordRange(row, column);
    };

    selectWord = function () {
        this.setSelectionRange(this.getWordRange());
    };

    selectAWord = function () {
        var cursor = this.getCursor();
        var range = this.session.getAWordRange(cursor.row, cursor.column);
        this.setSelectionRange(range);
    };

    getLineRange = function (row, excludeLastChar) {
        var rowStart = typeof row == "number" ? row : this.lead.row;
        var rowEnd;

        var foldLine = this.session.getFoldLine(rowStart);
        if (foldLine) {
            rowStart = foldLine.start.row;
            rowEnd = foldLine.end.row;
        } else {
            rowEnd = rowStart;
        }
        if (excludeLastChar === true)
            return new Range(rowStart, 0, rowEnd, this.session.getLine(rowEnd).length);
        else
            return new Range(rowStart, 0, rowEnd + 1, 0);
    };

    selectLine = function () {
        this.setSelectionRange(this.getLineRange());
    };

    moveCursorUp = function () {
        this.moveCursorBy(-1, 0);
    };

    moveCursorDown = function () {
        this.moveCursorBy(1, 0);
    };

    wouldMoveIntoSoftTab = function (cursor, tabSize, direction) {
        var start = cursor.column;
        var end = cursor.column + tabSize;

        if (direction < 0) {
            start = cursor.column - tabSize;
            end = cursor.column;
        }
        return this.session.isTabStop(cursor) && this.doc.getLine(cursor.row).slice(start, end).split(" ").length - 1 == tabSize;
    };

    moveCursorLeft = function () {
        var cursor = this.lead.getPosition(),
            fold;

        if (fold = this.session.getFoldAt(cursor.row, cursor.column, -1)) {
            this.moveCursorTo(fold.start.row, fold.start.column);
        } else if (cursor.column === 0) {
            // cursor is a line (start
            if (cursor.row > 0) {
                this.moveCursorTo(cursor.row - 1, this.doc.getLine(cursor.row - 1).length);
            }
        }
        else {
            var tabSize = this.session.getTabSize();
            if (this.wouldMoveIntoSoftTab(cursor, tabSize, -1) && !this.session.getNavigateWithinSoftTabs()) {
                this.moveCursorBy(0, -tabSize);
            } else {
                this.moveCursorBy(0, -1);
            }
        }
    };

    moveCursorRight = function () {
        var cursor = this.lead.getPosition(),
            fold;
        if (fold = this.session.getFoldAt(cursor.row, cursor.column, 1)) {
            this.moveCursorTo(fold.end.row, fold.end.column);
        }
        else if (this.lead.column == this.doc.getLine(this.lead.row).length) {
            if (this.lead.row < this.doc.getLength() - 1) {
                this.moveCursorTo(this.lead.row + 1, 0);
            }
        }
        else {
            var tabSize = this.session.getTabSize();
            var cursor = this.lead;
            if (this.wouldMoveIntoSoftTab(cursor, tabSize, 1) && !this.session.getNavigateWithinSoftTabs()) {
                this.moveCursorBy(0, tabSize);
            } else {
                this.moveCursorBy(0, 1);
            }
        }
    };

    moveCursorLineStart = function () {
        var row = this.lead.row;
        var column = this.lead.column;
        var screenRow = this.session.documentToScreenRow(row, column);

        // Determ the doc-position of the first character at the screen line.
        var firstColumnPosition = this.session.screenToDocumentPosition(screenRow, 0);

        // Determ the line
        var beforeCursor = this.session.getDisplayLine(
            row, null, firstColumnPosition.row,
            firstColumnPosition.column
        );

        var leadingSpace = beforeCursor.match(/^\s*/);
        // TODO find better way for emacs mode to override selection behaviors
        if (leadingSpace[0].length != column && !this.session.$useEmacsStyleLineStart)
            firstColumnPosition.column += leadingSpace[0].length;
        this.moveCursorToPosition(firstColumnPosition);
    };

    moveCursorLineEnd = function () {
        var lead = this.lead;
        var lineEnd = this.session.getDocumentLastRowColumnPosition(lead.row, lead.column);
        if (this.lead.column == lineEnd.column) {
            var line = this.session.getLine(lineEnd.row);
            if (lineEnd.column == line.length) {
                var textEnd = line.search(/\s+$/);
                if (textEnd > 0)
                    lineEnd.column = textEnd;
            }
        }

        this.moveCursorTo(lineEnd.row, lineEnd.column);
    };

    moveCursorFileEnd = function () {
        var row = this.doc.getLength() - 1;
        var column = this.doc.getLine(row).length;
        this.moveCursorTo(row, column);
    };

    moveCursorFileStart = function () {
        this.moveCursorTo(0, 0);
    };

    moveCursorLongWordRight = function () {
        var row = this.lead.row;
        var column = this.lead.column;
        var line = this.doc.getLine(row);
        var rightOfCursor = line.substring(column);

        this.session.nonTokenRe.lastIndex = 0;
        this.session.tokenRe.lastIndex = 0;

        // skip folds
        var fold = this.session.getFoldAt(row, column, 1);
        if (fold) {
            this.moveCursorTo(fold.end.row, fold.end.column);
            return;
        }

        // first skip space
        if (this.session.nonTokenRe.exec(rightOfCursor)) {
            column += this.session.nonTokenRe.lastIndex;
            this.session.nonTokenRe.lastIndex = 0;
            rightOfCursor = line.substring(column);
        }

        // if at line end proceed with next line
        if (column >= line.length) {
            this.moveCursorTo(row, line.length);
            this.moveCursorRight();
            if (row < this.doc.getLength() - 1)
                this.moveCursorWordRight();
            return;
        }

        // advance to the end of the next token
        if (this.session.tokenRe.exec(rightOfCursor)) {
            column += this.session.tokenRe.lastIndex;
            this.session.tokenRe.lastIndex = 0;
        }

        this.moveCursorTo(row, column);
    };

    moveCursorLongWordLeft = function () {
        var row = this.lead.row;
        var column = this.lead.column;

        // skip folds
        var fold;
        if (fold = this.session.getFoldAt(row, column, -1)) {
            this.moveCursorTo(fold.start.row, fold.start.column);
            return;
        }

        var str = this.session.getFoldStringAt(row, column, -1);
        if (str == null) {
            str = this.doc.getLine(row).substring(0, column);
        }

        var leftOfCursor = lang.stringReverse(str);
        this.session.nonTokenRe.lastIndex = 0;
        this.session.tokenRe.lastIndex = 0;

        // skip whitespace
        if (this.session.nonTokenRe.exec(leftOfCursor)) {
            column -= this.session.nonTokenRe.lastIndex;
            leftOfCursor = leftOfCursor.slice(this.session.nonTokenRe.lastIndex);
            this.session.nonTokenRe.lastIndex = 0;
        }

        // if at begin of the line proceed in line above
        if (column <= 0) {
            this.moveCursorTo(row, 0);
            this.moveCursorLeft();
            if (row > 0)
                this.moveCursorWordLeft();
            return;
        }

        // move to the begin of the word
        if (this.session.tokenRe.exec(leftOfCursor)) {
            column -= this.session.tokenRe.lastIndex;
            this.session.tokenRe.lastIndex = 0;
        }

        this.moveCursorTo(row, column);
    };

    $shortWordEndIndex = function (rightOfCursor) {
        var index = 0, ch;
        var whitespaceRe = /\s/;
        var tokenRe = this.session.tokenRe;

        tokenRe.lastIndex = 0;
        if (this.session.tokenRe.exec(rightOfCursor)) {
            index = this.session.tokenRe.lastIndex;
        } else {
            while ((ch = rightOfCursor[index]) && whitespaceRe.test(ch))
                index++;

            if (index < 1) {
                tokenRe.lastIndex = 0;
                while ((ch = rightOfCursor[index]) && !tokenRe.test(ch)) {
                    tokenRe.lastIndex = 0;
                    index++;
                    if (whitespaceRe.test(ch)) {
                        if (index > 2) {
                            index--;
                            break;
                        } else {
                            while ((ch = rightOfCursor[index]) && whitespaceRe.test(ch))
                                index++;
                            if (index > 2)
                                break;
                        }
                    }
                }
            }
        }
        tokenRe.lastIndex = 0;

        return index;
    };

    moveCursorShortWordRight = function () {
        var row = this.lead.row;
        var column = this.lead.column;
        var line = this.doc.getLine(row);
        var rightOfCursor = line.substring(column);

        var fold = this.session.getFoldAt(row, column, 1);
        if (fold)
            return this.moveCursorTo(fold.end.row, fold.end.column);

        if (column == line.length) {
            var l = this.doc.getLength();
            do {
                row++;
                rightOfCursor = this.doc.getLine(row);
            } while (row < l && /^\s*$/.test(rightOfCursor));

            if (!/^\s+/.test(rightOfCursor))
                rightOfCursor = "";
            column = 0;
        }

        var index = this.$shortWordEndIndex(rightOfCursor);

        this.moveCursorTo(row, column + index);
    };

    moveCursorShortWordLeft = function () {
        var row = this.lead.row;
        var column = this.lead.column;

        var fold;
        if (fold = this.session.getFoldAt(row, column, -1))
            return this.moveCursorTo(fold.start.row, fold.start.column);

        var line = this.session.getLine(row).substring(0, column);
        if (column === 0) {
            do {
                row--;
                line = this.doc.getLine(row);
            } while (row > 0 && /^\s*$/.test(line));

            column = line.length;
            if (!/\s+$/.test(line))
                line = "";
        }

        var leftOfCursor = lang.stringReverse(line);
        var index = this.$shortWordEndIndex(leftOfCursor);

        return this.moveCursorTo(row, column - index);
    };

    moveCursorWordRight = function () {
        if (this.session.$selectLongWords)
            this.moveCursorLongWordRight();
        else
            this.moveCursorShortWordRight();
    };

    moveCursorWordLeft = function () {
        if (this.session.$selectLongWords)
            this.moveCursorLongWordLeft();
        else
            this.moveCursorShortWordLeft();
    };

    moveCursorBy = function (rows, chars) {
        var screenPos = this.session.documentToScreenPosition(
            this.lead.row,
            this.lead.column
        );

        var offsetX;

        if (chars === 0) {
            if (rows !== 0) {
                if (this.session.$bidiHandler.isBidiRow(screenPos.row, this.lead.row)) {
                    offsetX = this.session.$bidiHandler.getPosLeft(screenPos.column);
                    screenPos.column = Math.round(offsetX / this.session.$bidiHandler.charWidths[0]);
                } else {
                    offsetX = screenPos.column * this.session.$bidiHandler.charWidths[0];
                }
            }

            if (this.$desiredColumn)
                screenPos.column = this.$desiredColumn;
            else
                this.$desiredColumn = screenPos.column;
        }

        if (rows != 0 && this.session.lineWidgets && this.session.lineWidgets[this.lead.row]) {
            var widget = this.session.lineWidgets[this.lead.row];
            if (rows < 0)
                rows -= widget.rowsAbove || 0;
            else if (rows > 0)
                rows += widget.rowCount - (widget.rowsAbove || 0);
        }

        var docPos = this.session.screenToDocumentPosition(screenPos.row + rows, screenPos.column, offsetX);

        if (rows !== 0 && chars === 0 && docPos.row === this.lead.row && docPos.column === this.lead.column) {

        }

        // move the cursor and update the desired column
        this.moveCursorTo(docPos.row, docPos.column + chars, chars === 0);
    };

    moveCursorToPosition = function (position) {
        this.moveCursorTo(position.row, position.column);
    };

    moveCursorTo = function (row, column, keepDesiredColumn) {
        // Ensure the row/column is not inside of a fold.
        var fold = this.session.getFoldAt(row, column, 1);
        if (fold) {
            row = fold.start.row;
            column = fold.start.column;
        }

        this.$keepDesiredColumnOnChange = true;
        var line = this.session.getLine(row);
        // do not allow putting cursor in the middle of surrogate pairs
        if (/[\uDC00-\uDFFF]/.test(line.charAt(column)) && line.charAt(column - 1)) {
            if (this.lead.row == row && this.lead.column == column + 1)
                column = column - 1;
            else
                column = column + 1;
        }
        this.lead.setPosition(row, column);
        this.$keepDesiredColumnOnChange = false;

        if (!keepDesiredColumn)
            this.$desiredColumn = null;
    };

    moveCursorToScreen = function (row, column, keepDesiredColumn) {
        var pos = this.session.screenToDocumentPosition(row, column);
        this.moveCursorTo(pos.row, pos.column, keepDesiredColumn);
    };

    detach = function () {
        this.lead.detach();
        this.anchor.detach();
    };

    fromOrientedRange = function (range) {
        this.setSelectionRange(range, range.cursor == range.start);
        this.$desiredColumn = range.desiredColumn || this.$desiredColumn;
    };

    toOrientedRange = function (range) {
        var r = this.getRange();
        if (range) {
            range.start.column = r.start.column;
            range.start.row = r.start.row;
            range.end.column = r.end.column;
            range.end.row = r.end.row;
        } else {
            range = r;
        }

        range.cursor = this.isBackwards() ? range.start : range.end;
        range.desiredColumn = this.$desiredColumn;
        return range;
    };

    getRangeOfMovements = function (func) {
        var start = this.getCursor();
        try {
            func(this);
            var end = this.getCursor();
            return Range.fromPoints(start, end);
        } catch (e) {
            console.log(e);
            return Range.fromPoints(start, start);
        } finally {
            this.moveCursorToPosition(start);
        }
    };

    toJSON = function () {
        if (this.rangeCount) {
            var data = this.ranges.map(function (r) {
                var r1 = r.clone();
                r1.isBackwards = r.cursor == r.start;
                return r1;
            });
        } else {
            var data = this.getRange();
            data.isBackwards = this.isBackwards();
        }
        return data;
    };

    fromJSON = function (data) {
        if (data.start == undefined) {
            if (this.rangeList && data.length > 1) {
                this.toSingleRange(data[0]);
                for (var i = data.length; i--;) {
                    var r = Range.fromPoints(data[i].start, data[i].end);
                    if (data[i].isBackwards)
                        r.cursor = r.start;
                    this.addRange(r, true);
                }
                return;
            } else {
                data = data[0];
            }
        }
        if (this.rangeList)
            this.toSingleRange(data);
        this.setSelectionRange(data, data.isBackwards);
    };

    isEqual = function (data) {
        if ((data.length || this.rangeCount) && data.length != this.rangeCount)
            return false;
        if (!data.length || !this.ranges)
            return this.getRange().isEqual(data);

        for (var i = this.ranges.length; i--;) {
            if (!this.ranges[i].isEqual(data[i]))
                return false;
        }
        return true;
    };
}
