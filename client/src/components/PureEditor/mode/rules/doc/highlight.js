import TextHighlightRules from "../text/highlight";

export default class DocCommentHighlightRules extends TextHighlightRules {
    constructor() {
        super();

        this.$rules = {
            "start": [{
                token: "comment.doc.tag",
                regex: "@[\\w\\d_]+" // TODO: fix email addresses
            },
            DocCommentHighlightRules.getTagRule(),
            {
                defaultToken: "comment.doc",
                caseInsensitive: true
            }]
        };
    };

    static getTagRule = function (start) {
        return {
            token: "comment.doc.tag.storage.type",
            regex: "\\b(?:TODO|FIXME|XXX|HACK)\\b"
        };
    };

    static getStartRule = function (start) {
        return {
            token: "comment.doc", // doc comment
            regex: "\\/\\*(?=\\*)",
            next: start
        };
    };

    static getEndRule = function (start) {
        return {
            token: "comment.doc", // closing comment
            regex: "\\*\\/",
            next: start
        };
    };
}
