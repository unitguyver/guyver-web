import Range from "../../../editor/tools/Range";
import TokenIterator from "../../../editor/tools/TokenIterator";
import FoldMode from "./fold_mode";

export default class DRools extends FoldMode {
    foldingStartMarker = /\b(rule|declare|query|when|then)\b/;
    foldingStopMarker = /\bend\b/;

    constructor() {
        super();
    };

    getFoldWidgetRange = function (session, foldStyle, row) {
        var line = session.getLine(row);
        var match = line.match(this.foldingStartMarker);
        if (match) {
            var i = match.index;

            if (match[1]) {
                var position = { row: row, column: line.length };
                var iterator = new TokenIterator(session, position.row, position.column);
                var seek = "end";
                var token = iterator.getCurrentToken();
                if (token.value == "when") {
                    seek = "then";
                }
                while (token) {
                    if (token.value == seek) {
                        return Range.fromPoints(position, {
                            row: iterator.getCurrentTokenRow(),
                            column: iterator.getCurrentTokenColumn()
                        });
                    }
                    token = iterator.stepForward();
                }
            }

        }
        // test each line, and return a range of segments to collapse
    }
}
