import CssHighlightRules from "../css/highlight";
import JavaScriptHighlightRules from "../javascript/highlight";
import XmlHighlightRules from "../xml/highlight";
import lang from "../../../lib/utils/lang";

const tagMap = lang.createMap({
    a: 'anchor',
    button: 'form',
    form: 'form',
    img: 'image',
    input: 'form',
    label: 'form',
    option: 'form',
    script: 'script',
    select: 'form',
    textarea: 'form',
    style: 'style',
    table: 'table',
    tbody: 'table',
    td: 'table',
    tfoot: 'table',
    th: 'table',
    tr: 'table'
});

export default class HtmlHighlightRules extends XmlHighlightRules {

    constructor() {
        super();

        this.addRules({
            attributes: [{
                include: "tag_whitespace"
            }, {
                token: "entity.other.attribute-name.xml",
                regex: "[-_a-zA-Z0-9:.]+"
            }, {
                token: "keyword.operator.attribute-equals.xml",
                regex: "=",
                push: [{
                    include: "tag_whitespace"
                }, {
                    token: "string.unquoted.attribute-value.html",
                    regex: "[^<>='\"`\\s]+",
                    next: "pop"
                }, {
                    token: "empty",
                    regex: "",
                    next: "pop"
                }]
            }, {
                include: "attribute_value"
            }],
            tag: [{
                token: function (start, tag) {
                    var group = tagMap[tag];
                    return ["meta.tag.punctuation." + (start == "<" ? "" : "end-") + "tag-open.xml",
                    "meta.tag" + (group ? "." + group : "") + ".tag-name.xml"];
                },
                regex: "(</?)([-_a-zA-Z0-9:.]+)",
                next: "tag_stuff"
            }],
            tag_stuff: [
                { include: "attributes" },
                { token: "meta.tag.punctuation.tag-close.xml", regex: "/?>", next: "start" }
            ]
        });

        this.embedTagRules(CssHighlightRules, "css-", "style");
        this.embedTagRules(new JavaScriptHighlightRules({ jsx: false }).getRules(), "js-", "script");

        if (this.constructor === HtmlHighlightRules)
            this.normalizeRules();
    }
}
