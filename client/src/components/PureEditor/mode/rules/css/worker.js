import lang from "../../../lib/utils/lang";
import Mirror from "../../worker/mirror";

const { CSSLint } = require("csslint");

export default class CssWorker extends Mirror {
    ruleset = null;

    constructor(sender) {
        super(sender);

        this.setTimeout(400);
        this.setDisabledRules("ids|order-alphabetical");
        this.setInfoRules(
            "adjoining-classes|zero-units|gradients|box-model|" +
            "import|outline-none|vendor-prefix"
        );
    };

    setInfoRules = function (ruleNames) {
        if (typeof ruleNames == "string")
            ruleNames = ruleNames.split("|");
        this.infoRules = lang.arrayToMap(ruleNames);
        this.doc.getValue() && this.deferredUpdate.schedule(100);
    };

    setDisabledRules = function (ruleNames) {
        if (!ruleNames) {
            this.ruleset = null;
        } else {
            if (typeof ruleNames == "string")
                ruleNames = ruleNames.split("|");
            var all = {};

            CSSLint.getRules().forEach(function (x) {
                all[x.id] = true;
            });
            ruleNames.forEach(function (x) {
                delete all[x];
            });

            this.ruleset = all;
        }
        this.doc.getValue() && this.deferredUpdate.schedule(100);
    };

    onUpdate = function () {
        var value = this.doc.getValue();
        if (!value)
            return this.sender.emit("annotate", []);
        var infoRules = this.infoRules;

        var result = CSSLint.verify(value, this.ruleset);

        this.sender.emit("annotate", result.messages.map(function (msg) {
            return {
                row: msg.line - 1,
                column: msg.col - 1,
                text: msg.message,
                type: infoRules[msg.rule.id] ? "info" : msg.type,
                rule: msg.rule.name
            };
        }));
    };
}
