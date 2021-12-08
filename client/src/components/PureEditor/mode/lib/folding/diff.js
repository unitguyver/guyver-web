import oop from "../../../lib/utils/oop";
import Range from "../../../editor/tools/Range";
import BaseFoldMode from "./fold_mode";

var FoldMode = function (levels, flag) {
    this.regExpList = levels;
    this.flag = flag;
    this.foldingStartMarker = RegExp("^(" + levels.join("|") + ")", this.flag);
};
oop.inherits(FoldMode, BaseFoldMode);

(function () {
    this.getFoldWidgetRange = function (session, foldStyle, row) {
        var line = session.getLine(row);
        var start = { row: row, column: line.length };

        var regList = this.regExpList;
        for (var i = 1; i <= regList.length; i++) {
            var re = RegExp("^(" + regList.slice(0, i).join("|") + ")", this.flag);
            if (re.test(line))
                break;
        }

        for (var l = session.getLength(); ++row < l;) {
            line = session.getLine(row);
            if (re.test(line))
                break;
        }
        if (row == start.row + 1)
            return;
        return new Range(start.row, start.column, row - 1, line.length);
    };

}).call(FoldMode.prototype);

export default FoldMode;