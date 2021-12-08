import useragent from "./useragent";

const dom = {};

const XHTML_NS = "http://www.w3.org/1999/xhtml";

dom.buildDom = function (arr, parent, refs) {
    if (typeof arr == "string" && arr) {
        var txt = document.createTextNode(arr);
        if (parent)
            parent.appendChild(txt);
        return txt;
    }

    if (!Array.isArray(arr)) {
        if (arr && arr.appendChild && parent)
            parent.appendChild(arr);
        return arr;
    }
    if (typeof arr[0] != "string" || !arr[0]) {
        var els = [];
        for (var i = 0; i < arr.length; i++) {
            var ch = buildDom(arr[i], parent, refs);
            ch && els.push(ch);
        }
        return els;
    }

    var el = document.createElement(arr[0]);
    var options = arr[1];
    var childIndex = 1;
    if (options && typeof options == "object" && !Array.isArray(options))
        childIndex = 2;
    for (var i = childIndex; i < arr.length; i++)
        buildDom(arr[i], el, refs);
    if (childIndex == 2) {
        Object.keys(options).forEach(function (n) {
            var val = options[n];
            if (n === "class") {
                el.className = Array.isArray(val) ? val.join(" ") : val;
            } else if (typeof val == "function" || n == "value" || n[0] == "$") {
                el[n] = val;
            } else if (n === "ref") {
                if (refs) refs[val] = el;
            } else if (n === "style") {
                if (typeof val == "string") el.style.cssText = val;
            } else if (val != null) {
                el.setAttribute(n, val);
            }
        });
    }
    if (parent)
        parent.appendChild(el);
    return el;
};

dom.getDocumentHead = function (doc) {
    if (!doc)
        doc = document;
    return doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement;
};

dom.createElement = function (tag, ns) {
    return document.createElementNS ?
        document.createElementNS(ns || XHTML_NS, tag) :
        document.createElement(tag);
};

dom.removeChildren = function (element) {
    element.innerHTML = "";
};

dom.createTextNode = function (textContent, element) {
    var doc = element ? element.ownerDocument : document;
    return doc.createTextNode(textContent);
};

dom.createFragment = function (element) {
    var doc = element ? element.ownerDocument : document;
    return doc.createDocumentFragment();
};

dom.hasCssClass = function (el, name) {
    var classes = (el.className + "").split(/\s+/g);
    return classes.indexOf(name) !== -1;
};

dom.addCssClass = function (el, name) {
    if (!dom.hasCssClass(el, name)) {
        el.className += " " + name;
    }
};

dom.removeCssClass = function (el, name) {
    var classes = el.className.split(/\s+/g);
    while (true) {
        var index = classes.indexOf(name);
        if (index == -1) {
            break;
        }
        classes.splice(index, 1);
    }
    el.className = classes.join(" ");
};

dom.toggleCssClass = function (el, name) {
    var classes = el.className.split(/\s+/g), add = true;
    while (true) {
        var index = classes.indexOf(name);
        if (index == -1) {
            break;
        }
        add = false;
        classes.splice(index, 1);
    }
    if (add)
        classes.push(name);

    el.className = classes.join(" ");
    return add;
};


dom.setCssClass = function (node, className, include) {
    if (include) {
        dom.addCssClass(node, className);
    } else {
        dom.removeCssClass(node, className);
    }
};

dom.hasCssString = function (id, doc) {
    var index = 0, sheets;
    doc = doc || document;
    if ((sheets = doc.querySelectorAll("style"))) {
        while (index < sheets.length)
            if (sheets[index++].id === id)
                return true;
    }
};

var strictCSP;
var cssCache = [];
dom.useStrictCSP = function (value) {
    strictCSP = value;
    if (value == false) insertPendingStyles();
    else if (!cssCache) cssCache = [];
};

function insertPendingStyles() {
    var cache = cssCache;
    cssCache = null;
    cache && cache.forEach(function (item) {
        dom.importCssString(item[0], item[1]);
    });
}

dom.importCssString = function (cssText, id, target) {
    if (typeof document == "undefined")
        return;
    if (cssCache) {
        if (target) {
            insertPendingStyles();
        } else if (target === false) {
            return cssCache.push([cssText, id]);
        }
    }
    if (strictCSP) return;

    var container = target;
    if (!target || !target.getRootNode) {
        container = document;
    } else {
        container = target.getRootNode();
        if (!container || container == target)
            container = document;
    }

    var doc = container.ownerDocument || container;

    // If style is already imported return immediately.
    if (id && dom.hasCssString(id, container))
        return null;

    if (id)
        cssText += "\n/*# sourceURL=ace/css/" + id + " */";

    var style = dom.createElement("style");
    style.appendChild(doc.createTextNode(cssText));
    if (id)
        style.id = id;

    if (container == doc)
        container = dom.getDocumentHead(doc);
    container.insertBefore(style, container.firstChild);
}

dom.importCssStylsheet = function (uri, doc) {
    buildDom(["link", { rel: "stylesheet", href: uri }], dom.getDocumentHead(doc));
};
dom.scrollbarWidth = function (document) {
    var inner = dom.createElement("ace_inner");
    inner.style.width = "100%";
    inner.style.minWidth = "0px";
    inner.style.height = "200px";
    inner.style.display = "block";

    var outer = dom.createElement("ace_outer");
    var style = outer.style;

    style.position = "absolute";
    style.left = "-10000px";
    style.overflow = "hidden";
    style.width = "200px";
    style.minWidth = "0px";
    style.height = "150px";
    style.display = "block";

    outer.appendChild(inner);

    var body = document.documentElement;
    body.appendChild(outer);

    var noScrollbar = inner.offsetWidth;

    style.overflow = "scroll";
    var withScrollbar = inner.offsetWidth;

    if (noScrollbar == withScrollbar) {
        withScrollbar = outer.clientWidth;
    }

    body.removeChild(outer);

    return noScrollbar - withScrollbar;
};

dom.computedStyle = function (element, style) {
    return window.getComputedStyle(element, "") || {};
};

dom.setStyle = function (styles, property, value) {
    if (styles[property] !== value) {
        //console.log("set style", property, styles[property], value);
        styles[property] = value;
    }
};

let HAS_CSS_ANIMATION = false;
let HAS_CSS_TRANSFORMS = false;
let HI_DPI = useragent.isWin
    ? typeof window !== "undefined" && window.devicePixelRatio >= 1.5
    : !useragent.isChromeOS;

if (typeof document !== "undefined") {
    let div = document.createElement("div");

    if (HI_DPI && div.style.transform !== undefined) {
        HAS_CSS_TRANSFORMS = true;
    }

    if (!useragent.isEdge && typeof div.style.animationName !== "undefined") {
        HAS_CSS_ANIMATION = true;
    }

    div = null;
}

dom.HAS_CSS_ANIMATION = HAS_CSS_ANIMATION;
dom.HAS_CSS_TRANSFORMS = HAS_CSS_TRANSFORMS;
dom.HI_DPI = HI_DPI;

dom.translate = function (element, tx, ty) {
    if (HAS_CSS_TRANSFORMS) {
        element.style.transform = "translate(" + Math.round(tx) + "px, " + Math.round(ty) + "px)";
    } else {
        element.style.top = Math.round(ty) + "px";
        element.style.left = Math.round(tx) + "px";
    }
};

export default dom;