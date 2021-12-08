import oop from "../../../lib/utils/oop";
import Mirror from "../../worker/mirror";

const { DOMParser } = require("../../xml/dom-parser");

const Worker = exports.Worker = function (sender) {
    Mirror.call(this, sender);
    this.setTimeout(400);
    this.context = null;
};

oop.inherits(Worker, Mirror);

(function () {

    this.setOptions = function (options) {
        this.context = options.context;
    };

    this.onUpdate = function () {
        var value = this.doc.getValue();
        if (!value)
            return;
        var parser = new DOMParser();
        var errors = [];
        parser.options.errorHandler = {
            fatalError: function (fullMsg, errorMsg, locator) {
                errors.push({
                    row: locator.lineNumber,
                    column: locator.columnNumber,
                    text: errorMsg,
                    type: "error"
                });
            },
            error: function (fullMsg, errorMsg, locator) {
                errors.push({
                    row: locator.lineNumber,
                    column: locator.columnNumber,
                    text: errorMsg,
                    type: "error"
                });
            },
            warning: function (fullMsg, errorMsg, locator) {
                errors.push({
                    row: locator.lineNumber,
                    column: locator.columnNumber,
                    text: errorMsg,
                    type: "warning"
                });
            }
        };

        parser.parseFromString(value);
        this.sender.emit("error", errors);
    };

}).call(Worker.prototype);

export default Worker;