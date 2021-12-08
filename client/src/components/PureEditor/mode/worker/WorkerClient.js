import EventEmitter from "../../lib/event/EventEmitter";

@EventEmitter
export default class WorkerClient {
    constructor(ModeWorker) {
        this.$worker = new ModeWorker(this);

        this.$sendDeltaQueue = this.$sendDeltaQueue.bind(this);
        this.changeListener = this.changeListener.bind(this);
        this.onMessage = this.onMessage.bind(this);

        this.callbackId = 1;
        this.callbacks = {};
    }

    onMessage = function (e) {
        const msg = e.data;

        switch (msg.type) {
            case "event":
                this._signal(msg.name, { data: msg.data });
                break;
            case "call":
                const callback = this.callbacks[msg.id];
                if (callback) {
                    callback(msg.data);
                    delete this.callbacks[msg.id];
                }
                break;
            case "error":
                this.reportError(msg.data);
                break;
            case "log":
                window.console && console.log && console.log.apply(console, msg.data);
                break;
        }
    };

    send = function (cmd, args) {
        // this.call(cmd, args);
    };

    emit = function (event, data) {

        if (data.data && data.data.err) {
            data.data.err = {
                message: data.data.err.message,
                stack: data.data.err.stack,
                code: data.data.err.code
            };
        }
        this.$worker.sender._signal(event, data);
    };

    terminate = function () {
        this._signal("terminate", {});
        this.deltaQueue = null;
        this.$worker.terminate();
        this.$worker = null;
        if (this.$doc)
            this.$doc.off("change", this.changeListener);
        this.$doc = null;
    };

    call = function (cmd, args, callback) {
        if (callback) {
            var id = this.callbackId++;
            this.callbacks[id] = callback;
            args.push(id);
        }
        this.send(cmd, args);
    };

    attachToDocument = function (doc) {
        if (this.$doc)
            this.terminate();

        this.$doc = doc;
        this.call("setValue", [doc.getValue()]);
        doc.on("change", this.changeListener);
    };

    changeListener = function (delta) {

        if (!this.deltaQueue) {
            this.deltaQueue = [];
            setTimeout(this.$sendDeltaQueue, 0);
        }
        if (delta.action == "insert")
            this.deltaQueue.push(delta.start, delta.lines);
        else
            this.deltaQueue.push(delta.start, delta.end);
    };

    $sendDeltaQueue = function () {
        const q = this.deltaQueue;

        if (!q) return;
        this.deltaQueue = null;
        if (q.length > 50 && q.length > this.$doc.getLength() >> 1) {
            this.call("setValue", [this.$doc.getValue()]);
        } else
            this.emit("change", { data: q });
    };

    reportError = function (err) {
        window.console && console.error && console.error(err);
    };
};
