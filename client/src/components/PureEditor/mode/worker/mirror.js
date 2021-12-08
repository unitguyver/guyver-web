import Document from "../../utils/Document";
import lang from "../../lib/utils/lang";

export default class Mirror {
    constructor(sender) {

        this.sender = sender;
        this.doc = new Document("");
        this.deferredUpdate = lang.delayedCall(() => {
            this.onUpdate();
        });

        const _self = this;
        sender.on("change", function (e) {
            const data = e.data;

            if (data[0].start) {
                _self.doc.applyDeltas(data);
            } else {
                for (let i = 0; i < data.length; i += 2) {
                    const d = Array.isArray(data[i + 1])
                        ? { action: "insert", start: data[i], lines: data[i + 1] }
                        : { action: "remove", start: data[i], end: data[i + 1] }
                    _self.doc.applyDelta(d, true);
                }
            }
            if (_self.$timeout)
                return _self.deferredUpdate.schedule(_self.$timeout);
            _self.onUpdate();
        });
    };

    setTimeout = function (timeout) {
        this.$timeout = timeout;
    };

    setValue = function (value) {
        this.doc.setValue(value);
        this.deferredUpdate.schedule(this.$timeout);
    };

    getValue = function (callbackId) {
        this.sender.callback(this.doc.getValue(), callbackId);
    };

    onUpdate = function () {
        // 抽象方法，将被子类重写
    };

    isPending = function () {
        return this.deferredUpdate.isPending();
    };
}
