import oop from "../../../lib/utils/oop";
import TextMode from "../text";
import XmlHighlightRules from "./highlight";
import XmlBehaviour from "../../lib/behaviour/xml";
import XmlFoldMode from "../../lib/folding/xml";
import lang from "../../../lib/utils/lang";

const { WorkerClient } = require("../../worker/WorkerClient");

const Mode = function () {
    this.HighlightRules = XmlHighlightRules;
    this.$behaviour = new XmlBehaviour();
    this.foldingRules = new XmlFoldMode();
};

oop.inherits(Mode, TextMode);

(function () {

    this.voidElements = lang.arrayToMap([]);

    this.blockComment = { start: "<!--", end: "-->" };

    this.createWorker = function (session) {
        var worker = new WorkerClient(["ace"], "ace/mode/xml_worker", "Worker");
        worker.attachToDocument(session.getDocument());

        worker.on("error", function (e) {
            session.setAnnotations(e.data);
        });

        worker.on("terminate", function () {
            session.clearAnnotations();
        });

        return worker;
    };

    this.$id = "ace/mode/xml";
}).call(Mode.prototype);

export default Mode;