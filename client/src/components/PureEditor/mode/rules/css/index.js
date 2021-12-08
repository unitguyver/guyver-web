import TextMode from "../text";
import CssHighlightRules from "./highlight";
import MatchingBraceOutdent from "../../utils/matching_brace_outdent";
import CssCompletions from "./completions";
import CssBehaviour from "../../lib/behaviour/css";
import CStyleFoldMode from "../../lib/folding/cstyle";
import WorkerClient from "../../worker/WorkerClient";
import CssWorker from "./worker";

export default class CssMode extends TextMode {
    $id = "css";
    foldingRules = "cStyle";
    blockComment = { start: "/*", end: "*/" };

    HighlightRules = CssHighlightRules;
    $outdent = new MatchingBraceOutdent();
    $completer = new CssCompletions();
    $behaviour = new CssBehaviour();
    foldingRules = new CStyleFoldMode();

    constructor() {
        super();
    };

    getNextLineIndent = function (state, line, tab) {
        var indent = this.$getIndent(line);

        // ignore braces in comments
        var tokens = this.getTokenizer().getLineTokens(line, state).tokens;
        if (tokens.length && tokens[tokens.length - 1].type == "comment") {
            return indent;
        }

        var match = line.match(/^.*\{\s*$/);
        if (match) {
            indent += tab;
        }

        return indent;
    };

    checkOutdent = function (state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    autoOutdent = function (state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };

    getCompletions = function (state, session, pos, prefix) {
        return this.$completer.getCompletions(state, session, pos, prefix);
    };

    createWorker = function (session) {
        const worker = new WorkerClient(CssWorker);

        worker.attachToDocument(session.getDocument());

        worker.on("annotate", function (e) {
            session.setAnnotations(e);
        });

        worker.on("terminate", function () {
            session.clearAnnotations();
        });

        return worker;
    };
}
