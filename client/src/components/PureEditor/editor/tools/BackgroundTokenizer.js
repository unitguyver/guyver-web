import EventEmitter from "../../lib/event/EventEmitter";

@EventEmitter
export default class BackgroundTokenizer {
    running = false;
    lines = [];
    states = [];
    currentLine = 0;

    constructor(tokenizer) {

        this.tokenizer = tokenizer;
    };

    $worker = function () {
        if (!this.running) { return; }

        let workerStart = new Date();
        let currentLine = this.currentLine;
        let endLine = -1;
        let doc = this.doc;
        let startLine = currentLine;

        while (this.lines[currentLine]) {
            currentLine++;
        }

        let len = doc.getLength();
        let processedLines = 0;
        this.running = false;

        while (currentLine < len) {
            this.$tokenizeRow(currentLine);
            endLine = currentLine;
            do {
                currentLine++;
            } while (this.lines[currentLine]);

            // only check every 5 lines
            processedLines++;
            if ((processedLines % 5 === 0) && (new Date() - workerStart) > 20) {
                this.running = setTimeout(this.$worker, 20);
                break;
            }
        }
        this.currentLine = currentLine;

        if (endLine == -1) {
            endLine = currentLine;
        }

        if (startLine <= endLine) {
            this.fireUpdateEvent(startLine, endLine);
        }
    };

    setTokenizer = function (tokenizer) {
        this.tokenizer = tokenizer;
        this.lines = [];
        this.states = [];

        this.start(0);
    };

    setDocument = function (doc) {
        this.doc = doc;
        this.lines = [];
        this.states = [];

        this.stop();
    };

    fireUpdateEvent = function (firstRow, lastRow) {
        var data = {
            first: firstRow,
            last: lastRow
        };
        this._signal("update", { data: data });
    };

    start = function (startRow) {
        this.currentLine = Math.min(startRow || 0, this.currentLine, this.doc.getLength());

        // remove all cached items below this line
        this.lines.splice(this.currentLine, this.lines.length);
        this.states.splice(this.currentLine, this.states.length);

        this.stop();
        // pretty long delay to prevent the tokenizer from interfering with the user
        this.running = setTimeout(this.$worker, 700);
    };

    scheduleStart = function () {
        if (!this.running)
            this.running = setTimeout(this.$worker, 700);
    };

    $updateOnChange = function (delta) {
        var startRow = delta.start.row;
        var len = delta.end.row - startRow;

        if (len === 0) {
            this.lines[startRow] = null;
        } else if (delta.action == "remove") {
            this.lines.splice(startRow, len + 1, null);
            this.states.splice(startRow, len + 1, null);
        } else {
            var args = Array(len + 1);
            args.unshift(startRow, 1);
            this.lines.splice.apply(this.lines, args);
            this.states.splice.apply(this.states, args);
        }

        this.currentLine = Math.min(startRow, this.currentLine, this.doc.getLength());

        this.stop();
    };

    stop = function () {
        if (this.running)
            clearTimeout(this.running);
        this.running = false;
    };

    getTokens = function (row) {
        return this.lines[row] || this.$tokenizeRow(row);
    };

    getState = function (row) {
        if (this.currentLine == row)
            this.$tokenizeRow(row);
        return this.states[row] || "start";
    };

    $tokenizeRow = function (row) {
        var line = this.doc.getLine(row);
        var state = this.states[row - 1];

        var data = this.tokenizer.getLineTokens(line, state, row);

        if (this.states[row] + "" !== data.state + "") {
            this.states[row] = data.state;
            this.lines[row + 1] = null;
            if (this.currentLine > row + 1)
                this.currentLine = row + 1;
        } else if (this.currentLine == row) {
            this.currentLine = row + 1;
        }

        return this.lines[row] = data.tokens;
    };
}
