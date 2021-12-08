import EventEmitter from "../../lib/event/EventEmitter";
import dom from "../../lib/utils/dom";
import event from "../../lib/event/event";

const MAX_SCROLL_H = 0x8000;

@EventEmitter
export class ScrollBar {

    constructor(parent) {

        this.element = dom.createElement("div");
        this.element.className = "ace_scrollbar ace_scrollbar" + this.classSuffix;

        this.inner = dom.createElement("div");
        this.inner.className = "ace_scrollbar-inner";
        // on safari scrollbar is not shown for empty elements
        this.inner.textContent = "\xa0";
        this.element.appendChild(this.inner);

        parent.appendChild(this.element);

        this.setVisible(false);
        this.skipEvent = false;

        event.addListener(this.element, "scroll", this.onScroll.bind(this));
        event.addListener(this.element, "mousedown", event.preventDefault);
    };

    setVisible = function (isVisible) {
        this.element.style.display = isVisible ? "" : "none";
        this.isVisible = isVisible;
        this.coeff = 1;
    };

    onScroll() {
        //
    }
}

export class VScrollBar extends ScrollBar {
    classSuffix = '-v';

    constructor(parent, renderer) {
        super(parent);

        this.scrollTop = 0;
        this.scrollHeight = 0;

        renderer.$scrollbarWidth =
            this.width = dom.scrollbarWidth(parent.ownerDocument);
        this.inner.style.width =
            this.element.style.width = (this.width || 15) + 5 + "px";
        this.$minWidth = 0;
    };

    onScroll = function () {
        if (!this.skipEvent) {
            this.scrollTop = this.element.scrollTop;
            if (this.coeff != 1) {
                var h = this.element.clientHeight / this.scrollHeight;
                this.scrollTop = this.scrollTop * (1 - h) / (this.coeff - h);
            }
            this._emit("scroll", { data: this.scrollTop });
        }
        this.skipEvent = false;
    };

    getWidth = function () {
        return Math.max(this.isVisible ? this.width : 0, this.$minWidth || 0);
    };

    setHeight = function (height) {
        this.element.style.height = height + "px";
    };

    setInnerHeight = this.setScrollHeight = function (height) {
        this.scrollHeight = height;
        if (height > MAX_SCROLL_H) {
            this.coeff = MAX_SCROLL_H / height;
            height = MAX_SCROLL_H;
        } else if (this.coeff != 1) {
            this.coeff = 1;
        }
        this.inner.style.height = height + "px";
    };

    setScrollTop = function (scrollTop) {
        // on chrome 17+ for small zoom levels after calling this function
        // this.element.scrollTop != scrollTop which makes page to scroll up.
        if (this.scrollTop != scrollTop) {
            this.skipEvent = true;
            this.scrollTop = scrollTop;
            this.element.scrollTop = scrollTop * this.coeff;
        }
    };
}

export class HScrollBar extends ScrollBar {
    scrollLeft = 0;
    classSuffix = '-h';

    constructor(parent, renderer) {
        super(parent);
        this.height = renderer.$scrollbarWidth;
        this.inner.style.height =
            this.element.style.height = (this.height || 15) + 5 + "px";
    };

    onScroll = function () {
        if (!this.skipEvent) {
            this.scrollLeft = this.element.scrollLeft;
            this._emit("scroll", { data: this.scrollLeft });
        }
        this.skipEvent = false;
    };

    getHeight = function () {
        return this.isVisible ? this.height : 0;
    };

    setWidth = function (width) {
        this.element.style.width = width + "px";
    };

    setInnerWidth = function (width) {
        this.inner.style.width = width + "px";
    };

    setScrollWidth = function (width) {
        this.inner.style.width = width + "px";
    };

    setScrollLeft = function (scrollLeft) {
        // on chrome 17+ for small zoom levels after calling this function
        // this.element.scrollTop != scrollTop which makes page to scroll up.
        if (this.scrollLeft != scrollLeft) {
            this.skipEvent = true;
            this.scrollLeft = this.element.scrollLeft = scrollLeft;
        }
    };
}
