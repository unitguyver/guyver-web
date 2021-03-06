import Range from "./Range";
import lang from "../../lib/utils/lang";

export default class SearchHighlight {
    MAX_RANGES = 500;

    constructor(regExp, clazz, type) {
        this.setRegexp(regExp);
        this.clazz = clazz;
        this.type = type || "text";
    };

    setRegexp = function (regExp) {
        if (this.regExp + "" == regExp + "")
            return;
        this.regExp = regExp;
        this.cache = [];
    };

    update = function (html, markerLayer, session, config) {
        if (!this.regExp)
            return;
        var start = config.firstRow, end = config.lastRow;

        for (var i = start; i <= end; i++) {
            var ranges = this.cache[i];
            if (ranges == null) {
                ranges = lang.getMatchOffsets(session.getLine(i), this.regExp);
                if (ranges.length > this.MAX_RANGES)
                    ranges = ranges.slice(0, this.MAX_RANGES);
                ranges = ranges.map(function (match) {
                    return new Range(i, match.offset, i, match.offset + match.length);
                });
                this.cache[i] = ranges.length ? ranges : "";
            }

            for (var j = ranges.length; j--;) {
                markerLayer.drawSingleLineMarker(
                    html, ranges[j].toScreenRange(session), this.clazz, config);
            }
        }
    };
}
