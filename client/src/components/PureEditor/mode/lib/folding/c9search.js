import oop from "../../../lib/utils/oop";
import Range from "../../../editor/tools/Range";
import BaseFoldMode from "./fold_mode";

const FoldMode = function () { };
oop.inherits(FoldMode, BaseFoldMode);

(function () {

    this.foldingStartMarker = /^(\S.*:|Searching for.*)$/;
    this.foldingStopMarker = /^(\s+|Found.*)$/;

    this.getFoldWidgetRange = function (session, foldStyle, row) {
        var lines = session.doc.getAllLines(row);
        var line = lines[row];
        var level1 = /^(Found.*|Searching for.*)$/;
        var level2 = /^(\S.*:|\s*)$/;
        var re = level1.test(line) ? level1 : level2;

        var startRow = row;
        var endRow = row;

        if (this.foldingStartMarker.test(line)) {
            for (var i = row + 1, l = session.getLength(); i < l; i++) {
                if (re.test(lines[i]))
                    break;
            }
            endRow = i;
        }
        else if (this.foldingStopMarker.test(line)) {
            for (var i = row - 1; i >= 0; i--) {
                line = lines[i];
                if (re.test(line))
                    break;
            }
            startRow = i;
        }
        if (startRow != endRow) {
            var col = line.length;
            if (re === level1)
                col = line.search(/\(Found[^)]+\)$|$/);
            return new Range(startRow, col, endRow, 0);
        }
    };

}).call(FoldMode.prototype);

export default FoldMode;