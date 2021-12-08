import oop from "../../../lib/utils/oop";
import Range from "../../../editor/tools/Range";
import BaseFoldMode from "./fold_mode";

var FoldMode = function () {
};
oop.inherits(FoldMode, BaseFoldMode);

(function () {

    this.foldingStartMarker = /^\s*\[([^\])]*)]\s*(?:$|[;#])/;

    this.getFoldWidgetRange = function (session, foldStyle, row) {
        var re = this.foldingStartMarker;
        var line = session.getLine(row);

        var m = line.match(re);

        if (!m) return;

        var startName = m[1] + ".";

        var startColumn = line.length;
        var maxRow = session.getLength();
        var startRow = row;
        var endRow = row;

        while (++row < maxRow) {
            line = session.getLine(row);
            if (/^\s*$/.test(line))
                continue;
            m = line.match(re);
            if (m && m[1].lastIndexOf(startName, 0) !== 0)
                break;

            endRow = row;
        }

        if (endRow > startRow) {
            var endColumn = session.getLine(endRow).length;
            return new Range(startRow, startColumn, endRow, endColumn);
        }
    };

}).call(FoldMode.prototype);

export default FoldMode;