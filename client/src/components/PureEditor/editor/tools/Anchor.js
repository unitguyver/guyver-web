import EventEmitter from "../../lib/event/EventEmitter";

const $pointsInOrder = function (point1, point2, equalPointsInOrder) {
    var bColIsAfter = equalPointsInOrder ? point1.column <= point2.column : point1.column < point2.column;
    return (point1.row < point2.row) || (point1.row == point2.row && bColIsAfter);
}

const $getTransformedPoint = function (delta, point, moveIfEqual) {

    var deltaIsInsert = delta.action == "insert";
    var deltaRowShift = (deltaIsInsert ? 1 : -1) * (delta.end.row - delta.start.row);
    var deltaColShift = (deltaIsInsert ? 1 : -1) * (delta.end.column - delta.start.column);
    var deltaStart = delta.start;
    var deltaEnd = deltaIsInsert ? deltaStart : delta.end;

    if ($pointsInOrder(point, deltaStart, moveIfEqual)) {
        return {
            row: point.row,
            column: point.column
        };
    }
    if ($pointsInOrder(deltaEnd, point, !moveIfEqual)) {
        return {
            row: point.row + deltaRowShift,
            column: point.column + (point.row == deltaEnd.row ? deltaColShift : 0)
        };
    }
    return {
        row: deltaStart.row,
        column: deltaStart.column
    };
}

@EventEmitter
export default class Anchor {
    $insertRight = false;

    constructor(doc, row, column) {

        this.$onChange = this.onChange.bind(this);
        this.attach(doc);

        if (typeof column == "undefined") {
            this.setPosition(row.row, row.column);
        } else {
            this.setPosition(row, column);
        }
    };

    getPosition = function () {
        return this.$clipPositionToDocument(this.row, this.column);
    };

    getDocument = function () {
        return this.document;
    };

    onChange = function (delta) {
        if (delta.start.row == delta.end.row && delta.start.row != this.row)
            return;

        if (delta.start.row > this.row)
            return;

        var point = $getTransformedPoint(delta, { row: this.row, column: this.column }, this.$insertRight);
        this.setPosition(point.row, point.column, true);
    };

    setPosition = function (row, column, noClip) {
        var pos;
        if (noClip) {
            pos = {
                row: row,
                column: column
            };
        } else {
            pos = this.$clipPositionToDocument(row, column);
        }

        if (this.row == pos.row && this.column == pos.column)
            return;

        var old = {
            row: this.row,
            column: this.column
        };

        this.row = pos.row;
        this.column = pos.column;
        this._signal("change", {
            old: old,
            value: pos
        });
    };

    detach = function () {
        this.document.off("change", this.$onChange);
    };

    attach = function (doc) {
        this.document = doc || this.document;
        this.document.on("change", this.$onChange);
    };

    $clipPositionToDocument = function (row, column) {
        var pos = {};

        if (row >= this.document.getLength()) {
            pos.row = Math.max(0, this.document.getLength() - 1);
            pos.column = this.document.getLine(pos.row).length;
        }
        else if (row < 0) {
            pos.row = 0;
            pos.column = 0;
        }
        else {
            pos.row = row;
            pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
        }

        if (column < 0)
            pos.column = 0;

        return pos;
    };
}
