import TextHighlightRules from "../text/highlight";

export default class ABCHighlightRules extends TextHighlightRules {
    $rules = {
        start: [
            {
                token: ['zupfnoter.information.comment.line.percentage', 'information.keyword', 'in formation.keyword.embedded'],
                regex: '(%%%%)(hn\\.[a-z]*)(.*)',
                comment: 'Instruction Comment'
            },
            {
                token: ['information.comment.line.percentage', 'information.keyword.embedded'],
                regex: '(%%)(.*)',
                comment: 'Instruction Comment'
            },

            {
                token: 'comment.line.percentage',
                regex: '%.*',
                comment: 'Comments'
            },

            {
                token: 'barline.keyword.operator',
                regex: '[\\[:]*[|:][|\\]:]*(?:\\[?[0-9]+)?|\\[[0-9]+',
                comment: 'Bar lines'
            },
            {
                token: ['information.keyword.embedded', 'information.argument.string.unquoted'],
                regex: '(\\[[A-Za-z]:)([^\\]]*\\])',
                comment: 'embedded Header lines'
            },
            {
                token: ['information.keyword', 'information.argument.string.unquoted'],
                regex: '^([A-Za-z]:)([^%\\\\]*)',
                comment: 'Header lines'
            },
            {
                token: ['text', 'entity.name.function', 'string.unquoted', 'text'],
                regex: '(\\[)([A-Z]:)(.*?)(\\])',
                comment: 'Inline fields'
            },
            {
                token: ['accent.constant.language', 'pitch.constant.numeric', 'duration.constant.numeric'],
                regex: '([\\^=_]*)([A-Ga-gz][,\']*)([0-9]*/*[><0-9]*)',
                comment: 'Notes'
            },
            {
                token: 'zupfnoter.jumptarget.string.quoted',
                regex: '[\\"!]\\^\\:.*?[\\"!]',
                comment: 'Zupfnoter jumptarget'
            }, {
                token: 'zupfnoter.goto.string.quoted',
                regex: '[\\"!]\\^\\@.*?[\\"!]',
                comment: 'Zupfnoter goto'
            },
            {
                token: 'zupfnoter.annotation.string.quoted',
                regex: '[\\"!]\\^\\!.*?[\\"!]',
                comment: 'Zupfnoter annoation'
            },
            {
                token: 'zupfnoter.annotationref.string.quoted',
                regex: '[\\"!]\\^\\#.*?[\\"!]',
                comment: 'Zupfnoter annotation reference'
            },
            {
                token: 'chordname.string.quoted',
                regex: '[\\"!]\\^.*?[\\"!]',
                comment: 'abc chord'
            },
            {
                token: 'string.quoted',
                regex: '[\\"!].*?[\\"!]',
                comment: 'abc annotation'
            }

        ]
    };

    static metaData = {
        fileTypes: ['abc'],
        name: 'ABC',
        scopeName: 'text.abcnotation'
    };

    constructor() {
        super();

        this.normalizeRules();
    }
}
