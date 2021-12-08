import oop from "../../../lib/utils/oop";
import Mirror from "../../worker/mirror";

const { JSHINT } = require("jshint");

function startRegex(arr) {
    return RegExp("^(" + arr.join("|") + ")");
}

const disabledWarningsRe = startRegex([
    "Bad for in variable '(.+)'.",
    'Missing "use strict"'
]);

const errorsRe = startRegex([
    "Unexpected",
    "Expected ",
    "Confusing (plus|minus)",
    "\\{a\\} unterminated regular expression",
    "Unclosed ",
    "Unmatched ",
    "Unbegun comment",
    "Bad invocation",
    "Missing space after",
    "Missing operator at"
]);

const infoRe = startRegex([
    "Expected an assignment",
    "Bad escapement of EOL",
    "Unexpected comma",
    "Unexpected space",
    "Missing radix parameter.",
    "A leading decimal point can",
    "\\['{a}'\\] is better written in dot notation.",
    "'{a}' used out of scope"
]);

export default class JavaScriptWorker extends Mirror {

    constructor(sender) {
        super(sender);
        this.setTimeout(500);
        this.setOptions();
    };

    setOptions = function (options) {
        this.options = options || {
            // undef: true,
            // unused: true,
            esnext: true,
            moz: true,
            devel: true,
            browser: true,
            node: true,
            laxcomma: true,
            laxbreak: true,
            lastsemic: true,
            onevar: false,
            passfail: false,
            maxerr: 100,
            expr: true,
            multistr: true,
            globalstrict: true
        };
        this.doc.getValue() && this.deferredUpdate.schedule(100);
    };

    changeOptions = function (newOptions) {
        oop.mixin(this.options, newOptions);
        this.doc.getValue() && this.deferredUpdate.schedule(100);
    };

    onUpdate = function () {
        let value = this.doc.getValue();

        value = value.replace(/^#!.*\n/, "\n");
        if (!value)
            return this.sender.emit("annotate", []);

        var errors = [];

        JSHINT(value, this.options, this.options.globals);
        var results = JSHINT.errors;

        var errorAdded = false;
        for (var i = 0; i < results.length; i++) {
            var error = results[i];
            if (!error)
                continue;
            var raw = error.raw;
            var type = "warning";

            if (raw == "Missing semicolon.") {
                var str = error.evidence.substr(error.character);
                str = str.charAt(str.search(/\S/));
                if (str && /[\w\d{(['"]/.test(str)) {
                    error.reason = 'Missing ";" before statement';
                    type = "error";
                } else {
                    type = "info";
                }
            }
            else if (disabledWarningsRe.test(raw)) {
                continue;
            }
            else if (infoRe.test(raw)) {
                type = "info";
            }
            else if (errorsRe.test(raw)) {
                errorAdded = true;
                type = "error";
            }
            else if (raw == "'{a}' is not defined.") {
                type = "warning";
            }
            else if (raw == "'{a}' is defined but never used.") {
                type = "info";
            }

            errors.push({
                row: error.line - 1,
                column: error.character - 1,
                text: error.reason,
                type: type,
                raw: raw
            });

            if (errorAdded) {
                // break;
            }
        }

        this.sender.emit("annotate", errors);
    };
};
