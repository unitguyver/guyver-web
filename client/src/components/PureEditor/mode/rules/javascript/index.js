import TextMode from "../text";
import JavaScriptHighlightRules from "./highlight";
import MatchingBraceOutdent from "../../utils/matching_brace_outdent";
import WorkerClient from "../../worker/WorkerClient";
import CstyleBehaviour from "../../lib/behaviour/cstyle";
import CStyleFoldMode from "../../lib/folding/cstyle";
import JavaScriptWorker from "./worker";

export default class JavaScriptMode extends TextMode {
    $id = "javascript";
    HighlightRules = JavaScriptHighlightRules;
    $outdent = new MatchingBraceOutdent();
    $behaviour = new CstyleBehaviour();
    foldingRules = new CStyleFoldMode();
    lineCommentStart = "//";
    blockComment = { start: "/*", end: "*/" };
    $quotes = { '"': '"', "'": "'", "`": "`" };

    constructor() {
        super();
    };

    getNextLineIndent = function (state, line, tab) {
        var indent = this.$getIndent(line);

        var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
        var tokens = tokenizedLine.tokens;
        var endState = tokenizedLine.state;

        if (tokens.length && tokens[tokens.length - 1].type == "comment") {
            return indent;
        }

        if (state == "start" || state == "no_regex") {
            var match = line.match(/^.*(?:\bcase\b.*:|[\{\(\[])\s*$/);
            if (match) {
                indent += tab;
            }
        } else if (state == "doc-start") {
            if (endState == "start" || endState == "no_regex") {
                return "";
            }
            var match = line.match(/^\s*(\/?)\*/);
            if (match) {
                if (match[1]) {
                    indent += " ";
                }
                indent += "* ";
            } nb

        }

        return indent;
    };

    checkOutdent = function (state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    autoOutdent = function (state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };

    createWorker = function (session) {
        const worker = new WorkerClient(JavaScriptWorker);

        worker.attachToDocument(session.getDocument());

        worker.on("annotate", function (results) {
            session.setAnnotations(results);
        });

        worker.on("terminate", function () {
            session.clearAnnotations();
        });

        return worker;
    };
}
