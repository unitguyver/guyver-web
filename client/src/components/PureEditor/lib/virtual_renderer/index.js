import config from "../../editor/config";
import dom from "../utils/dom";
import GutterLayer from "../../editor/layer/Gutter";
import MarkerLayer from "../../editor/layer/Marker";
import TextLayer from "../../editor/layer/Text";
import CursorLayer from "../../editor/layer/Cursor";
import FontMetrics from "../../editor/layer/FontMetrics";
import { HScrollBar, VScrollBar } from "../../editor/tools/ScrollBar";
import useragent from "../utils/useragent";
import RenderLoop from "./RenderLoop";
import EventEmitter from "../event/EventEmitter";
import * as utils from "./utils";

const editorCss = require("../../css/editor.css");

dom.importCssString(editorCss, "ace_editor.css", false);

@EventEmitter
class VirtualRenderer {
  $horizScroll = false;
  $vScroll = false;
  scrollTop = 0;
  scrollLeft = 0;
  cursorPos = {
    row: 0,
    column: 0
  };
  $size = {
    width: 0,
    height: 0,
    scrollerHeight: 0,
    scrollerWidth: 0,
    $dirty: true
  };
  layerConfig = {
    width: 1,
    padding: 0,
    firstRow: 0,
    firstRowScreen: 0,
    lastRow: 0,
    lineHeight: 0,
    characterWidth: 0,
    minHeight: 1,
    maxHeight: 1,
    offset: 0,
    height: 1,
    gutterOffset: 1
  };
  scrollMargin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    v: 0,
    h: 0
  };
  margin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    v: 0,
    h: 0
  };
  $keepTextAreaAtCursor = !useragent.isIOS;

  constructor(container, theme) {

    for (let utilName in utils) {
      VirtualRenderer.prototype[utilName] = utils[utilName];
    }

    const _self = this;

    this.container = container || dom.createElement("div");
    this.setTheme(theme);

    dom.addCssClass(this.container, "ace_editor");
    dom.HI_DPI && dom.addCssClass(this.container, "ace_hidpi");

    this.$gutter = dom.createElement("div");
    this.$gutter.className = "ace_gutter";
    this.container.appendChild(this.$gutter);
    this.$gutter.setAttribute("aria-hidden", true);

    this.scroller = dom.createElement("div");
    this.scroller.className = "ace_scroller";
    this.container.appendChild(this.scroller);

    this.content = dom.createElement("div");
    this.content.className = "ace_content";
    this.scroller.appendChild(this.content);

    this.$gutterLayer = new GutterLayer(this.$gutter);
    this.$gutterLayer.on("changeGutterWidth", this.onGutterResize.bind(this));

    this.$markerBack = new MarkerLayer(this.content);

    var textLayer = this.$textLayer = new TextLayer(this.content);
    this.canvas = textLayer.element;

    this.$markerFront = new MarkerLayer(this.content);

    this.$cursorLayer = new CursorLayer(this.content);

    this.scrollBar =
      this.scrollBarV = new VScrollBar(this.container, this);

    this.scrollBarH = new HScrollBar(this.container, this);

    this.scrollBarV.on("scroll", function (e) {
      if (!_self.$scrollAnimation)
        _self.session.setScrollTop(e.data - _self.scrollMargin.top);
    });
    this.scrollBarH.on("scroll", function (e) {
      if (!_self.$scrollAnimation)
        _self.session.setScrollLeft(e.data - _self.scrollMargin.left);
    });

    this.$fontMetrics = new FontMetrics(this.container);
    this.$textLayer.$setFontMetrics(this.$fontMetrics);
    this.$textLayer.on("changeCharacterSize", function (e) {
      _self.updateCharacterSize();
      _self.onResize(true, _self.gutterWidth, _self.$size.width, _self.$size.height);
      _self._signal("changeCharacterSize", e);
    });

    this.$loop = new RenderLoop(
      this.$renderChanges.bind(this),
      this.container.ownerDocument.defaultView
    );
    this.$loop.schedule(this.CHANGE_FULL);

    this.updateCharacterSize();
    this.setPadding(4);
    config.resetOptions(this);
    config._signal("renderer", this);
  }
}

config.defineOptions(VirtualRenderer.prototype, "renderer", {
  animatedScroll: { initialValue: false },
  showInvisibles: {
    set: function (value) {
      if (this.$textLayer.setShowInvisibles(value))
        this.$loop.schedule(this.CHANGE_TEXT);
    },
    initialValue: false
  },
  showPrintMargin: {
    set: function () { this.$updatePrintMargin(); },
    initialValue: true
  },
  printMarginColumn: {
    set: function () { this.$updatePrintMargin(); },
    initialValue: 80
  },
  printMargin: {
    set: function (val) {
      if (typeof val == "number")
        this.$printMarginColumn = val;
      this.$showPrintMargin = !!val;
      this.$updatePrintMargin();
    },
    get: function () {
      return this.$showPrintMargin && this.$printMarginColumn;
    }
  },
  showGutter: {
    set: function (show) {
      this.$gutter.style.display = show ? "block" : "none";
      this.$loop.schedule(this.CHANGE_FULL);
      this.onGutterResize();
    },
    initialValue: true
  },
  fadeFoldWidgets: {
    set: function (show) {
      dom.setCssClass(this.$gutter, "ace_fade-fold-widgets", show);
    },
    initialValue: false
  },
  showFoldWidgets: {
    set: function (show) {
      this.$gutterLayer.setShowFoldWidgets(show);
      this.$loop.schedule(this.CHANGE_GUTTER);
    },
    initialValue: true
  },
  displayIndentGuides: {
    set: function (show) {
      if (this.$textLayer.setDisplayIndentGuides(show))
        this.$loop.schedule(this.CHANGE_TEXT);
    },
    initialValue: true
  },
  highlightGutterLine: {
    set: function (shouldHighlight) {
      this.$gutterLayer.setHighlightGutterLine(shouldHighlight);
      this.$loop.schedule(this.CHANGE_GUTTER);
    },
    initialValue: true
  },
  hScrollBarAlwaysVisible: {
    set: function (val) {
      if (!this.$hScrollBarAlwaysVisible || !this.$horizScroll)
        this.$loop.schedule(this.CHANGE_SCROLL);
    },
    initialValue: false
  },
  vScrollBarAlwaysVisible: {
    set: function (val) {
      if (!this.$vScrollBarAlwaysVisible || !this.$vScroll)
        this.$loop.schedule(this.CHANGE_SCROLL);
    },
    initialValue: false
  },
  fontSize: {
    set: function (size) {
      if (typeof size == "number")
        size = size + "px";
      this.container.style.fontSize = size;
      this.updateFontSize();
    },
    initialValue: 12
  },
  fontFamily: {
    set: function (name) {
      this.container.style.fontFamily = name;
      this.updateFontSize();
    }
  },
  maxLines: {
    set: function (val) {
      this.updateFull();
    }
  },
  minLines: {
    set: function (val) {
      if (!(this.$minLines < 0x1ffffffffffff))
        this.$minLines = 0;
      this.updateFull();
    }
  },
  maxPixelHeight: {
    set: function (val) {
      this.updateFull();
    },
    initialValue: 0
  },
  scrollPastEnd: {
    set: function (val) {
      val = +val || 0;
      if (this.$scrollPastEnd == val)
        return;
      this.$scrollPastEnd = val;
      this.$loop.schedule(this.CHANGE_SCROLL);
    },
    initialValue: 0,
    handlesSet: true
  },
  fixedWidthGutter: {
    set: function (val) {
      this.$gutterLayer.$fixedWidth = !!val;
      this.$loop.schedule(this.CHANGE_GUTTER);
    }
  },
  theme: {
    set: function (val) { this.setTheme(val); },
    get: function () { return this.$themeId || this.theme; },
    initialValue: "./theme/textmate",
    handlesSet: true
  },
  hasCssTransforms: {
  },
  useTextareaForIME: {
    initialValue: !useragent.isMobile && !useragent.isIE
  }
});

export default VirtualRenderer;
