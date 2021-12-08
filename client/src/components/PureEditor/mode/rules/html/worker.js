import Mirror from "../../worker/mirror";

const { SAXParser } = require("./saxparser");

const errorTypes = {
    "expected-doctype-but-got-start-tag": "info",
    "expected-doctype-but-got-chars": "info",
    "non-html-root": "info"
};

export default class HtmlWorker extends Mirror {
    context = null;

    constructor(sender) {
        super(sender);

        this.setTimeout(400);
    };

    setOptions = function (options) {
        this.context = options.context;
    };

    onUpdate = function () {
        var value = this.doc.getValue();
        if (!value)
            return;
        var parser = new SAXParser();
        var errors = [];
        var noop = function () { };
        parser.contentHandler = {
            startDocument: noop,
            endDocument: noop,
            startElement: noop,
            endElement: noop,
            characters: noop
        };
        parser.errorHandler = {
            error: function (message, location, code) {
                errors.push({
                    row: location.line,
                    column: location.column,
                    text: message,
                    type: errorTypes[code] || "error"
                });
            }
        };
        if (this.context)
            parser.parseFragment(value, this.context);
        else
            parser.parse(value);
        this.sender.emit("error", errors);
    };
}
