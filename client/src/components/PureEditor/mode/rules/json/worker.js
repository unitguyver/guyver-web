import oop from "../../../lib/utils/oop";
import Mirror from "../../worker/mirror";

const parse = require("./json_parse");

const JsonWorker = exports.JsonWorker = function (sender) {
    Mirror.call(this, sender);
    this.setTimeout(200);
};

oop.inherits(JsonWorker, Mirror);

(function () {

    this.onUpdate = function () {
        let value = this.doc.getValue();

        console.log(value)

        let errors = [];
        try {
            if (value)
                parse(value);
        } catch (e) {
            let pos = this.doc.indexToPosition(e.at - 1);
            errors.push({
                row: pos.row,
                column: pos.column,
                text: e.message,
                type: "error"
            });
        }
        this.sender.emit("annotate", errors);
    };

}).call(JsonWorker.prototype);

export default JsonWorker;