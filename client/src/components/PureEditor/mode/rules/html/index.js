import TextMode from "../text";
import JavaScriptMode from "../javascript";
import CssMode from "../css";
import HtmlHighlightRules from "./highlight";
import HtmlCompletions from "./completions";
import XmlBehaviour from "../../lib/behaviour/xml";
import HtmlFoldMode from "../../lib/folding/html";
import lang from "../../../lib/utils/lang";
import WorkerClient from "../../worker/WorkerClient";
import HtmlWorker from "./worker";

// http://www.w3.org/TR/html5/syntax.html#void-elements
const voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "menuitem", "param", "source", "track", "wbr"];
const optionalEndTags = ["li", "dt", "dd", "p", "rt", "rp", "optgroup", "option", "colgroup", "td", "th"];

export default class HtmlMode extends TextMode {
    $id = "html";

    blockComment = { start: "<!--", end: "-->" };
    voidElements = lang.arrayToMap(voidElements);

    constructor(options) {
        super();

        this.fragmentContext = options && options.fragmentContext;
        this.HighlightRules = HtmlHighlightRules;
        this.$behaviour = new XmlBehaviour();
        this.$completer = new HtmlCompletions();

        this.createModeDelegates({
            "js-": JavaScriptMode,
            "css-": CssMode
        });

        this.foldingRules = new HtmlFoldMode(this.voidElements, lang.arrayToMap(optionalEndTags));
    };

    getNextLineIndent = function (state, line, tab) {
        return this.$getIndent(line);
    };

    checkOutdent = function (state, line, input) {
        return false;
    };

    getCompletions = function (state, session, pos, prefix) {
        return this.$completer.getCompletions(state, session, pos, prefix);
    };

    createWorker = function (session) {
        const worker = new WorkerClient(HtmlWorker);

        worker.attachToDocument(session.getDocument());

        if (this.fragmentContext)
            worker.call("setOptions", [{ context: this.fragmentContext }]);

        worker.on("error", function (e) {
            session.setAnnotations(e.data);
        });

        worker.on("terminate", function () {
            session.clearAnnotations();
        });

        return worker;
    };
}
