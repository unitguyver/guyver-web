import dom from "../lib/utils/dom";

export default class Tooltip {
    isOpen = false;
    $element = null;

    constructor(parentNode) {
        this.$parentNode = parentNode;
    };

    $init = function () {
        this.$element = dom.createElement("div");
        this.$element.className = "ace_tooltip";
        this.$element.style.display = "none";
        this.$parentNode.appendChild(this.$element);
        return this.$element;
    };

    getElement = function () {
        return this.$element || this.$init();
    };

    setText = function (text) {
        this.getElement().textContent = text;
    };

    setHtml = function (html) {
        this.getElement().innerHTML = html;
    };

    setPosition = function (x, y) {
        this.getElement().style.left = x + "px";
        this.getElement().style.top = y + "px";
    };

    setClassName = function (className) {
        dom.addCssClass(this.getElement(), className);
    };

    show = function (text, x, y) {
        if (text != null)
            this.setText(text);
        if (x != null && y != null)
            this.setPosition(x, y);
        if (!this.isOpen) {
            this.getElement().style.display = "block";
            this.isOpen = true;
        }
    };

    hide = function () {
        if (this.isOpen) {
            this.getElement().style.display = "none";
            this.isOpen = false;
        }
    };

    getHeight = function () {
        return this.getElement().offsetHeight;
    };

    getWidth = function () {
        return this.getElement().offsetWidth;
    };

    destroy = function () {
        this.isOpen = false;
        if (this.$element && this.$element.parentNode) {
            this.$element.parentNode.removeChild(this.$element);
        }
    };
}
