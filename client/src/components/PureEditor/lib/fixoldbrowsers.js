if (typeof Element != "undefined" && !Element.prototype.remove) {
    Object.defineProperty(Element.prototype, "remove", {
        enumerable: false,
        writable: true,
        configurable: true,
        value: function () { this.parentNode && this.parentNode.removeChild(this); }
    });
}