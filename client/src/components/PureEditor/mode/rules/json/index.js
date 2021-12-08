import oop from "../../../lib/utils/oop";
import TextMode from "../text";
import HighlightRules from "./highlight";
import MatchingBraceOutdent from "../../utils/matching_brace_outdent";
import CstyleBehaviour from "../../lib/behaviour/cstyle";
import CStyleFoldMode from "../../lib/folding/cstyle";

const { WorkerClient } = require("../../worker/WorkerClient");

const Mode = function () {
    this.HighlightRules = HighlightRules;
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CstyleBehaviour();
    this.foldingRules = new CStyleFoldMode();
};
oop.inherits(Mode, TextMode);

(function () {

    this.lineCommentStart = "//";
    this.blockComment = { start: "/*", end: "*/" };

    this.getNextLineIndent = function (state, line, tab) {
        var indent = this.$getIndent(line);

        if (state == "start") {
            var match = line.match(/^.*[\{\(\[]\s*$/);
            if (match) {
                indent += tab;
            }
        }

        return indent;
    };

    this.checkOutdent = function (state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function (state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };

    this.createWorker = function (session) {
        var worker = new WorkerClient(["ace"], "ace/mode/json_worker", "JsonWorker");
        worker.attachToDocument(session.getDocument());

        worker.on("annotate", function (e) {
            session.setAnnotations(e.data);
        });

        worker.on("terminate", function () {
            session.clearAnnotations();
        });

        return worker;
    };


    this.$id = "ace/mode/json";
}).call(Mode.prototype);

export default Mode