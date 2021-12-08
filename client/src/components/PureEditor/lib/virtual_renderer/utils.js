import config from "../../editor/config";
import dom from "../utils/dom";

const editorCss = require("../../css/editor.css");
const useragent = require("../utils/useragent");

var HIDE_TEXTAREA = useragent.isIE;


export const CHANGE_CURSOR = 1;
export const CHANGE_MARKER = 2;
export const CHANGE_GUTTER = 4;
export const CHANGE_SCROLL = 8;
export const CHANGE_LINES = 16;
export const CHANGE_TEXT = 32;
export const CHANGE_SIZE = 64;
export const CHANGE_MARKER_BACK = 128;
export const CHANGE_MARKER_FRONT = 256;
export const CHANGE_FULL = 512;
export const CHANGE_H_SCROLL = 1024;

export const updateCharacterSize = function () {
  if (this.$textLayer.allowBoldFonts != this.$allowBoldFonts) {
    this.$allowBoldFonts = this.$textLayer.allowBoldFonts;
    this.setStyle("ace_nobold", !this.$allowBoldFonts);
  }

  this.layerConfig.characterWidth =
    this.characterWidth = this.$textLayer.getCharacterWidth();
  this.layerConfig.lineHeight =
    this.lineHeight = this.$textLayer.getLineHeight();
  this.$updatePrintMargin();
  // set explicit line height to avoid normal resolving to different values based on text
  dom.setStyle(this.scroller.style, "line-height", this.lineHeight + "px");
};

export const setSession = function (session) {
  if (this.session)
    this.session.doc.off("changeNewLineMode", this.onChangeNewLineMode);

  this.session = session;
  if (session && this.scrollMargin.top && session.getScrollTop() <= 0)
    session.setScrollTop(-this.scrollMargin.top);

  this.$cursorLayer.setSession(session);
  this.$markerBack.setSession(session);
  this.$markerFront.setSession(session);
  this.$gutterLayer.setSession(session);
  this.$textLayer.setSession(session);
  if (!session)
    return;

  this.$loop.schedule(this.CHANGE_FULL);
  this.session.$setFontMetrics(this.$fontMetrics);
  this.scrollBarH.scrollLeft = this.scrollBarV.scrollTop = null;

  this.onChangeNewLineMode = this.onChangeNewLineMode.bind(this);
  this.onChangeNewLineMode();
  this.session.doc.on("changeNewLineMode", this.onChangeNewLineMode);
};

export const updateLines = function (firstRow, lastRow, force) {
  if (lastRow === undefined)
    lastRow = Infinity;

  if (!this.$changedLines) {
    this.$changedLines = {
      firstRow: firstRow,
      lastRow: lastRow
    };
  }
  else {
    if (this.$changedLines.firstRow > firstRow)
      this.$changedLines.firstRow = firstRow;

    if (this.$changedLines.lastRow < lastRow)
      this.$changedLines.lastRow = lastRow;
  }
  if (this.$changedLines.lastRow < this.layerConfig.firstRow) {
    if (force)
      this.$changedLines.lastRow = this.layerConfig.lastRow;
    else
      return;
  }
  if (this.$changedLines.firstRow > this.layerConfig.lastRow)
    return;
  this.$loop.schedule(this.CHANGE_LINES);
};

export const onChangeNewLineMode = function () {
  this.$loop.schedule(this.CHANGE_TEXT);
  this.$textLayer.$updateEolChar();
  this.session.$bidiHandler.setEolChar(this.$textLayer.EOL_CHAR);
};

export const onChangeTabSize = function () {
  this.$loop.schedule(this.CHANGE_TEXT | this.CHANGE_MARKER);
  this.$textLayer.onChangeTabSize();
};

export const updateText = function () {
  this.$loop.schedule(this.CHANGE_TEXT);
};

export const updateFull = function (force) {
  if (force)
    this.$renderChanges(this.CHANGE_FULL, true);
  else
    this.$loop.schedule(this.CHANGE_FULL);
};

export const updateFontSize = function () {
  this.$textLayer.checkForSizeChanges();
};

export const $changes = 0;
export const $updateSizeAsync = function () {
  if (this.$loop.pending)
    this.$size.$dirty = true;
  else
    this.onResize();
};

export const onResize = function (force, gutterWidth, width, height) {
  if (this.resizing > 2)
    return;
  else if (this.resizing > 0)
    this.resizing++;
  else
    this.resizing = force ? 1 : 0;
  // `|| el.scrollHeight` is required for outosizing editors on ie
  // where elements with clientHeight = 0 alsoe have clientWidth = 0
  var el = this.container;
  if (!height)
    height = el.clientHeight || el.scrollHeight;
  if (!width)
    width = el.clientWidth || el.scrollWidth;
  var changes = this.$updateCachedSize(force, gutterWidth, width, height);


  if (!this.$size.scrollerHeight || (!width && !height))
    return this.resizing = 0;

  if (force)
    this.$gutterLayer.$padding = null;

  if (force)
    this.$renderChanges(changes | this.$changes, true);
  else
    this.$loop.schedule(changes | this.$changes);

  if (this.resizing)
    this.resizing = 0;
  // reset cached values on scrollbars, needs to be removed when switching to non-native scrollbars
  // see https://github.com/ajaxorg/ace/issues/2195
  this.scrollBarH.scrollLeft = this.scrollBarV.scrollTop = null;
};

export const $updateCachedSize = function (force, gutterWidth, width, height) {
  height -= (this.$extraHeight || 0);
  var changes = 0;
  var size = this.$size;
  var oldSize = {
    width: size.width,
    height: size.height,
    scrollerHeight: size.scrollerHeight,
    scrollerWidth: size.scrollerWidth
  };
  if (height && (force || size.height != height)) {
    size.height = height;
    changes |= this.CHANGE_SIZE;

    size.scrollerHeight = size.height;
    if (this.$horizScroll)
      size.scrollerHeight -= this.scrollBarH.getHeight();

    // this.scrollBarV.setHeight(size.scrollerHeight);
    this.scrollBarV.element.style.bottom = this.scrollBarH.getHeight() + "px";

    changes = changes | this.CHANGE_SCROLL;
  }

  if (width && (force || size.width != width)) {
    changes |= this.CHANGE_SIZE;
    size.width = width;

    if (gutterWidth == null)
      gutterWidth = this.$showGutter ? this.$gutter.offsetWidth : 0;

    this.gutterWidth = gutterWidth;

    dom.setStyle(this.scrollBarH.element.style, "left", gutterWidth + "px");
    dom.setStyle(this.scroller.style, "left", gutterWidth + this.margin.left + "px");
    size.scrollerWidth = Math.max(0, width - gutterWidth - this.scrollBarV.getWidth() - this.margin.h);
    dom.setStyle(this.$gutter.style, "left", this.margin.left + "px");

    var right = this.scrollBarV.getWidth() + "px";
    dom.setStyle(this.scrollBarH.element.style, "right", right);
    dom.setStyle(this.scroller.style, "right", right);
    dom.setStyle(this.scroller.style, "bottom", this.scrollBarH.getHeight());

    // this.scrollBarH.element.style.setWidth(size.scrollerWidth);

    if (this.session && this.session.getUseWrapMode() && this.adjustWrapLimit() || force) {
      changes |= this.CHANGE_FULL;
    }
  }

  size.$dirty = !width || !height;

  if (changes)
    this._signal("resize", oldSize);

  return changes;
};

export const onGutterResize = function (width) {
  var gutterWidth = this.$showGutter ? width : 0;
  if (gutterWidth != this.gutterWidth)
    this.$changes |= this.$updateCachedSize(true, gutterWidth, this.$size.width, this.$size.height);

  if (this.session.getUseWrapMode() && this.adjustWrapLimit()) {
    this.$loop.schedule(this.CHANGE_FULL);
  } else if (this.$size.$dirty) {
    this.$loop.schedule(this.CHANGE_FULL);
  } else {
    this.$computeLayerConfig();
  }
};

export const adjustWrapLimit = function () {
  var availableWidth = this.$size.scrollerWidth - this.$padding * 2;
  var limit = Math.floor(availableWidth / this.characterWidth);
  return this.session.adjustWrapLimit(limit, this.$showPrintMargin && this.$printMarginColumn);
};

export const setAnimatedScroll = function (shouldAnimate) {
  this.setOption("animatedScroll", shouldAnimate);
};

export const getAnimatedScroll = function () {
  return this.$animatedScroll;
};

export const setShowInvisibles = function (showInvisibles) {
  this.setOption("showInvisibles", showInvisibles);
  this.session.$bidiHandler.setShowInvisibles(showInvisibles);
};

export const getShowInvisibles = function () {
  return this.getOption("showInvisibles");
};

export const getDisplayIndentGuides = function () {
  return this.getOption("displayIndentGuides");
};

export const setDisplayIndentGuides = function (display) {
  this.setOption("displayIndentGuides", display);
};

export const setShowPrintMargin = function (showPrintMargin) {
  this.setOption("showPrintMargin", showPrintMargin);
};

export const getShowPrintMargin = function () {
  return this.getOption("showPrintMargin");
};

export const setPrintMarginColumn = function (showPrintMargin) {
  this.setOption("printMarginColumn", showPrintMargin);
};

export const getPrintMarginColumn = function () {
  return this.getOption("printMarginColumn");
};

export const getShowGutter = function () {
  return this.getOption("showGutter");
};

export const setShowGutter = function (show) {
  return this.setOption("showGutter", show);
};

export const getFadeFoldWidgets = function () {
  return this.getOption("fadeFoldWidgets");
};

export const setFadeFoldWidgets = function (show) {
  this.setOption("fadeFoldWidgets", show);
};

export const setHighlightGutterLine = function (shouldHighlight) {
  this.setOption("highlightGutterLine", shouldHighlight);
};

export const getHighlightGutterLine = function () {
  return this.getOption("highlightGutterLine");
};

export const $updatePrintMargin = function () {
  if (!this.$showPrintMargin && !this.$printMarginEl)
    return;

  if (!this.$printMarginEl) {
    var containerEl = dom.createElement("div");
    containerEl.className = "ace_layer ace_print-margin-layer";
    this.$printMarginEl = dom.createElement("div");
    this.$printMarginEl.className = "ace_print-margin";
    containerEl.appendChild(this.$printMarginEl);
    this.content.insertBefore(containerEl, this.content.firstChild);
  }

  var style = this.$printMarginEl.style;
  style.left = Math.round(this.characterWidth * this.$printMarginColumn + this.$padding) + "px";
  style.visibility = this.$showPrintMargin ? "visible" : "hidden";

  if (this.session && this.session.$wrap == -1)
    this.adjustWrapLimit();
};

export const getContainerElement = function () {
  return this.container;
};

export const getMouseEventTarget = function () {
  return this.scroller;
};

export const getTextAreaContainer = function () {
  return this.container;
};

export const $moveTextAreaToCursor = function () {
  if (this.$isMousePressed) return;
  var style = this.textarea.style;
  var composition = this.$composition;
  if (!this.$keepTextAreaAtCursor && !composition) {
    dom.translate(this.textarea, -100, 0);
    return;
  }
  var pixelPos = this.$cursorLayer.$pixelPos;
  if (!pixelPos)
    return;
  if (composition && composition.markerRange)
    pixelPos = this.$cursorLayer.getPixelPosition(composition.markerRange.start, true);

  var config = this.layerConfig;
  var posTop = pixelPos.top;
  var posLeft = pixelPos.left;
  posTop -= config.offset;

  var h = composition && composition.useTextareaForIME ? this.lineHeight : HIDE_TEXTAREA ? 0 : 1;
  if (posTop < 0 || posTop > config.height - h) {
    dom.translate(this.textarea, 0, 0);
    return;
  }

  var w = 1;
  var maxTop = this.$size.height - h;
  if (!composition) {
    posTop += this.lineHeight;
  }
  else {
    if (composition.useTextareaForIME) {
      var val = this.textarea.value;
      w = this.characterWidth * (this.session.$getStringScreenWidth(val)[0]);
    }
    else {
      posTop += this.lineHeight + 2;
    }
  }

  posLeft -= this.scrollLeft;
  if (posLeft > this.$size.scrollerWidth - w)
    posLeft = this.$size.scrollerWidth - w;

  posLeft += this.gutterWidth + this.margin.left;

  dom.setStyle(style, "height", h + "px");
  dom.setStyle(style, "width", w + "px");
  dom.translate(this.textarea, Math.min(posLeft, this.$size.scrollerWidth - w), Math.min(posTop, maxTop));
};

export const getFirstVisibleRow = function () {
  return this.layerConfig.firstRow;
};

export const getFirstFullyVisibleRow = function () {
  return this.layerConfig.firstRow + (this.layerConfig.offset === 0 ? 0 : 1);
};

export const getLastFullyVisibleRow = function () {
  var config = this.layerConfig;
  var lastRow = config.lastRow;
  var top = this.session.documentToScreenRow(lastRow, 0) * config.lineHeight;
  if (top - this.session.getScrollTop() > config.height - config.lineHeight)
    return lastRow - 1;
  return lastRow;
};

export const getLastVisibleRow = function () {
  return this.layerConfig.lastRow;
};

export const $padding = null;

export const setPadding = function (padding) {
  this.$padding = padding;
  this.$textLayer.setPadding(padding);
  this.$cursorLayer.setPadding(padding);
  this.$markerFront.setPadding(padding);
  this.$markerBack.setPadding(padding);
  this.$loop.schedule(this.CHANGE_FULL);
  this.$updatePrintMargin();
};

export const setScrollMargin = function (top, bottom, left, right) {
  var sm = this.scrollMargin;
  sm.top = top | 0;
  sm.bottom = bottom | 0;
  sm.right = right | 0;
  sm.left = left | 0;
  sm.v = sm.top + sm.bottom;
  sm.h = sm.left + sm.right;
  if (sm.top && this.scrollTop <= 0 && this.session)
    this.session.setScrollTop(-sm.top);
  this.updateFull();
};

export const setMargin = function (top, bottom, left, right) {
  var sm = this.margin;
  sm.top = top | 0;
  sm.bottom = bottom | 0;
  sm.right = right | 0;
  sm.left = left | 0;
  sm.v = sm.top + sm.bottom;
  sm.h = sm.left + sm.right;
  this.$updateCachedSize(true, this.gutterWidth, this.$size.width, this.$size.height);
  this.updateFull();
};

export const getHScrollBarAlwaysVisible = function () {
  return this.$hScrollBarAlwaysVisible;
};

export const setHScrollBarAlwaysVisible = function (alwaysVisible) {
  this.setOption("hScrollBarAlwaysVisible", alwaysVisible);
};

export const getVScrollBarAlwaysVisible = function () {
  return this.$vScrollBarAlwaysVisible;
};

export const setVScrollBarAlwaysVisible = function (alwaysVisible) {
  this.setOption("vScrollBarAlwaysVisible", alwaysVisible);
};

export const $updateScrollBarV = function () {
  var scrollHeight = this.layerConfig.maxHeight;
  var scrollerHeight = this.$size.scrollerHeight;
  if (!this.$maxLines && this.$scrollPastEnd) {
    scrollHeight -= (scrollerHeight - this.lineHeight) * this.$scrollPastEnd;
    if (this.scrollTop > scrollHeight - scrollerHeight) {
      scrollHeight = this.scrollTop + scrollerHeight;
      this.scrollBarV.scrollTop = null;
    }
  }
  this.scrollBarV.setScrollHeight(scrollHeight + this.scrollMargin.v);
  this.scrollBarV.setScrollTop(this.scrollTop + this.scrollMargin.top);
};

export const $updateScrollBarH = function () {
  this.scrollBarH.setScrollWidth(this.layerConfig.width + 2 * this.$padding + this.scrollMargin.h);
  this.scrollBarH.setScrollLeft(this.scrollLeft + this.scrollMargin.left);
};

export const $frozen = false;
export const freeze = function () {
  this.$frozen = true;
};

export const unfreeze = function () {
  this.$frozen = false;
};

export const $renderChanges = function (changes, force) {
  if (this.$changes) {
    changes |= this.$changes;
    this.$changes = 0;
  }
  if ((!this.session || !this.container.offsetWidth || this.$frozen) || (!changes && !force)) {
    this.$changes |= changes;
    return;
  }
  if (this.$size.$dirty) {
    this.$changes |= changes;
    return this.onResize(true);
  }
  if (!this.lineHeight) {
    this.$textLayer.checkForSizeChanges();
  }
  // this.$logChanges(changes);

  this._signal("beforeRender", changes);

  if (this.session && this.session.$bidiHandler)
    this.session.$bidiHandler.updateCharacterWidths(this.$fontMetrics);

  var config = this.layerConfig;
  // text, scrolling and resize changes can cause the view port size to change
  if (changes & this.CHANGE_FULL ||
    changes & this.CHANGE_SIZE ||
    changes & this.CHANGE_TEXT ||
    changes & this.CHANGE_LINES ||
    changes & this.CHANGE_SCROLL ||
    changes & this.CHANGE_H_SCROLL
  ) {
    changes |= this.$computeLayerConfig() | this.$loop.clear();
    if (config.firstRow != this.layerConfig.firstRow && config.firstRowScreen == this.layerConfig.firstRowScreen) {
      var st = this.scrollTop + (config.firstRow - this.layerConfig.firstRow) * this.lineHeight;
      if (st > 0) {
        // this check is needed as a workaround for the documentToScreenRow returning -1 if document.length == 0
        this.scrollTop = st;
        changes = changes | this.CHANGE_SCROLL;
        changes |= this.$computeLayerConfig() | this.$loop.clear();
      }
    }
    config = this.layerConfig;
    // update scrollbar first to not lose scroll position when gutter calls resize
    this.$updateScrollBarV();
    if (changes & this.CHANGE_H_SCROLL)
      this.$updateScrollBarH();

    dom.translate(this.content, -this.scrollLeft, -config.offset);

    var width = config.width + 2 * this.$padding + "px";
    var height = config.minHeight + "px";

    dom.setStyle(this.content.style, "width", width);
    dom.setStyle(this.content.style, "height", height);
  }

  // horizontal scrolling
  if (changes & this.CHANGE_H_SCROLL) {
    dom.translate(this.content, -this.scrollLeft, -config.offset);
    this.scroller.className = this.scrollLeft <= 0 ? "ace_scroller" : "ace_scroller ace_scroll-left";
  }

  // full
  if (changes & this.CHANGE_FULL) {
    this.$changedLines = null;
    this.$textLayer.update(config);
    if (this.$showGutter)
      this.$gutterLayer.update(config);
    this.$markerBack.update(config);
    this.$markerFront.update(config);
    this.$cursorLayer.update(config);
    this.$moveTextAreaToCursor();
    this._signal("afterRender", changes);
    return;
  }

  // scrolling
  if (changes & this.CHANGE_SCROLL) {
    this.$changedLines = null;
    if (changes & this.CHANGE_TEXT || changes & this.CHANGE_LINES)
      this.$textLayer.update(config);
    else
      this.$textLayer.scrollLines(config);

    if (this.$showGutter) {
      if (changes & this.CHANGE_GUTTER || changes & this.CHANGE_LINES)
        this.$gutterLayer.update(config);
      else
        this.$gutterLayer.scrollLines(config);
    }
    this.$markerBack.update(config);
    this.$markerFront.update(config);
    this.$cursorLayer.update(config);
    this.$moveTextAreaToCursor();
    this._signal("afterRender", changes);
    return;
  }

  if (changes & this.CHANGE_TEXT) {
    this.$changedLines = null;
    this.$textLayer.update(config);
    if (this.$showGutter)
      this.$gutterLayer.update(config);
  }
  else if (changes & this.CHANGE_LINES) {
    if (this.$updateLines() || (changes & this.CHANGE_GUTTER) && this.$showGutter)
      this.$gutterLayer.update(config);
  }
  else if (changes & this.CHANGE_TEXT || changes & this.CHANGE_GUTTER) {
    if (this.$showGutter)
      this.$gutterLayer.update(config);
  }
  else if (changes & this.CHANGE_CURSOR) {
    if (this.$highlightGutterLine)
      this.$gutterLayer.updateLineHighlight(config);
  }

  if (changes & this.CHANGE_CURSOR) {
    this.$cursorLayer.update(config);
    this.$moveTextAreaToCursor();
  }

  if (changes & (this.CHANGE_MARKER | this.CHANGE_MARKER_FRONT)) {
    this.$markerFront.update(config);
  }

  if (changes & (this.CHANGE_MARKER | this.CHANGE_MARKER_BACK)) {
    this.$markerBack.update(config);
  }

  this._signal("afterRender", changes);
};

export const $autosize = function () {
  var height = this.session.getScreenLength() * this.lineHeight;
  var maxHeight = this.$maxLines * this.lineHeight;
  var desiredHeight = Math.min(maxHeight,
    Math.max((this.$minLines || 1) * this.lineHeight, height)
  ) + this.scrollMargin.v + (this.$extraHeight || 0);
  if (this.$horizScroll)
    desiredHeight += this.scrollBarH.getHeight();
  if (this.$maxPixelHeight && desiredHeight > this.$maxPixelHeight)
    desiredHeight = this.$maxPixelHeight;

  var hideScrollbars = desiredHeight <= 2 * this.lineHeight;
  var vScroll = !hideScrollbars && height > maxHeight;

  if (desiredHeight != this.desiredHeight ||
    this.$size.height != this.desiredHeight || vScroll != this.$vScroll) {
    if (vScroll != this.$vScroll) {
      this.$vScroll = vScroll;
      this.scrollBarV.setVisible(vScroll);
    }

    var w = this.container.clientWidth;
    this.container.style.height = desiredHeight + "px";
    this.$updateCachedSize(true, this.$gutterWidth, w, desiredHeight);
    // this.$loop.changes = 0;
    this.desiredHeight = desiredHeight;

    this._signal("autosize");
  }
};

export const $computeLayerConfig = function () {
  var session = this.session;
  var size = this.$size;

  var hideScrollbars = size.height <= 2 * this.lineHeight;
  var screenLines = this.session.getScreenLength();
  var maxHeight = screenLines * this.lineHeight;

  var longestLine = this.$getLongestLine();

  var horizScroll = !hideScrollbars && (this.$hScrollBarAlwaysVisible ||
    size.scrollerWidth - longestLine - 2 * this.$padding < 0);

  var hScrollChanged = this.$horizScroll !== horizScroll;
  if (hScrollChanged) {
    this.$horizScroll = horizScroll;
    this.scrollBarH.setVisible(horizScroll);
  }
  var vScrollBefore = this.$vScroll; // autosize can change vscroll value in which case we need to update longestLine
  // autoresize only after updating hscroll to include scrollbar height in desired height
  if (this.$maxLines && this.lineHeight > 1)
    this.$autosize();

  var minHeight = size.scrollerHeight + this.lineHeight;

  var scrollPastEnd = !this.$maxLines && this.$scrollPastEnd
    ? (size.scrollerHeight - this.lineHeight) * this.$scrollPastEnd
    : 0;
  maxHeight += scrollPastEnd;

  var sm = this.scrollMargin;
  this.session.setScrollTop(Math.max(-sm.top,
    Math.min(this.scrollTop, maxHeight - size.scrollerHeight + sm.bottom)));

  this.session.setScrollLeft(Math.max(-sm.left, Math.min(this.scrollLeft,
    longestLine + 2 * this.$padding - size.scrollerWidth + sm.right)));

  var vScroll = !hideScrollbars && (this.$vScrollBarAlwaysVisible ||
    size.scrollerHeight - maxHeight + scrollPastEnd < 0 || this.scrollTop > sm.top);
  var vScrollChanged = vScrollBefore !== vScroll;
  if (vScrollChanged) {
    this.$vScroll = vScroll;
    this.scrollBarV.setVisible(vScroll);
  }

  var offset = this.scrollTop % this.lineHeight;
  var lineCount = Math.ceil(minHeight / this.lineHeight) - 1;
  var firstRow = Math.max(0, Math.round((this.scrollTop - offset) / this.lineHeight));
  var lastRow = firstRow + lineCount;

  // Map lines on the screen to lines in the document.
  var firstRowScreen, firstRowHeight;
  var lineHeight = this.lineHeight;
  firstRow = session.screenToDocumentRow(firstRow, 0);

  // Check if firstRow is inside of a foldLine. If true, then use the first
  // row of the foldLine.
  var foldLine = session.getFoldLine(firstRow);
  if (foldLine) {
    firstRow = foldLine.start.row;
  }

  firstRowScreen = session.documentToScreenRow(firstRow, 0);
  firstRowHeight = session.getRowLength(firstRow) * lineHeight;

  lastRow = Math.min(session.screenToDocumentRow(lastRow, 0), session.getLength() - 1);
  minHeight = size.scrollerHeight + session.getRowLength(lastRow) * lineHeight +
    firstRowHeight;

  offset = this.scrollTop - firstRowScreen * lineHeight;

  var changes = 0;
  if (this.layerConfig.width != longestLine || hScrollChanged)
    changes = this.CHANGE_H_SCROLL;
  // Horizontal scrollbar visibility may have changed, which changes
  // the client height of the scroller
  if (hScrollChanged || vScrollChanged) {
    changes |= this.$updateCachedSize(true, this.gutterWidth, size.width, size.height);
    this._signal("scrollbarVisibilityChanged");
    if (vScrollChanged)
      longestLine = this.$getLongestLine();
  }

  this.layerConfig = {
    width: longestLine,
    padding: this.$padding,
    firstRow: firstRow,
    firstRowScreen: firstRowScreen,
    lastRow: lastRow,
    lineHeight: lineHeight,
    characterWidth: this.characterWidth,
    minHeight: minHeight,
    maxHeight: maxHeight,
    offset: offset,
    gutterOffset: lineHeight ? Math.max(0, Math.ceil((offset + size.height - size.scrollerHeight) / lineHeight)) : 0,
    height: this.$size.scrollerHeight
  };

  if (this.session.$bidiHandler)
    this.session.$bidiHandler.setContentWidth(longestLine - this.$padding);
  // For debugging.
  // console.log(JSON.stringify(this.layerConfig));

  return changes;
};

export const $updateLines = function () {
  if (!this.$changedLines) return;
  var firstRow = this.$changedLines.firstRow;
  var lastRow = this.$changedLines.lastRow;
  this.$changedLines = null;

  var layerConfig = this.layerConfig;

  if (firstRow > layerConfig.lastRow + 1) { return; }
  if (lastRow < layerConfig.firstRow) { return; }

  // if the last row is unknown -> redraw everything
  if (lastRow === Infinity) {
    if (this.$showGutter)
      this.$gutterLayer.update(layerConfig);
    this.$textLayer.update(layerConfig);
    return;
  }

  // else update only the changed rows
  this.$textLayer.updateLines(layerConfig, firstRow, lastRow);
  return true;
};

export const $getLongestLine = function () {
  var charCount = this.session.getScreenWidth();
  if (this.showInvisibles && !this.session.$useWrapMode)
    charCount += 1;

  if (this.$textLayer && charCount > this.$textLayer.MAX_LINE_LENGTH)
    charCount = this.$textLayer.MAX_LINE_LENGTH + 30;

  return Math.max(this.$size.scrollerWidth - 2 * this.$padding, Math.round(charCount * this.characterWidth));
};

export const updateFrontMarkers = function () {
  this.$markerFront.setMarkers(this.session.getMarkers(true));
  this.$loop.schedule(this.CHANGE_MARKER_FRONT);
};

export const updateBackMarkers = function () {
  this.$markerBack.setMarkers(this.session.getMarkers());
  this.$loop.schedule(this.CHANGE_MARKER_BACK);
};

export const addGutterDecoration = function (row, className) {
  this.$gutterLayer.addGutterDecoration(row, className);
};

export const removeGutterDecoration = function (row, className) {
  this.$gutterLayer.removeGutterDecoration(row, className);
};

export const updateBreakpoints = function (rows) {
  this.$loop.schedule(this.CHANGE_GUTTER);
};

export const setAnnotations = function (annotations) {
  this.$gutterLayer.setAnnotations(annotations);
  this.$loop.schedule(this.CHANGE_GUTTER);
};

export const updateCursor = function () {
  this.$loop.schedule(this.CHANGE_CURSOR);
};

export const hideCursor = function () {
  this.$cursorLayer.hideCursor();
};

export const showCursor = function () {
  this.$cursorLayer.showCursor();
};

export const scrollSelectionIntoView = function (anchor, lead, offset) {
  // first scroll anchor into view then scroll lead into view
  this.scrollCursorIntoView(anchor, offset);
  this.scrollCursorIntoView(lead, offset);
};

export const scrollCursorIntoView = function (cursor, offset, $viewMargin) {
  // the editor is not visible
  if (this.$size.scrollerHeight === 0)
    return;

  var pos = this.$cursorLayer.getPixelPosition(cursor);

  var left = pos.left;
  var top = pos.top;

  var topMargin = $viewMargin && $viewMargin.top || 0;
  var bottomMargin = $viewMargin && $viewMargin.bottom || 0;

  var scrollTop = this.$scrollAnimation ? this.session.getScrollTop() : this.scrollTop;

  if (scrollTop + topMargin > top) {
    if (offset && scrollTop + topMargin > top + this.lineHeight)
      top -= offset * this.$size.scrollerHeight;
    if (top === 0)
      top = -this.scrollMargin.top;
    this.session.setScrollTop(top);
  } else if (scrollTop + this.$size.scrollerHeight - bottomMargin < top + this.lineHeight) {
    if (offset && scrollTop + this.$size.scrollerHeight - bottomMargin < top - this.lineHeight)
      top += offset * this.$size.scrollerHeight;
    this.session.setScrollTop(top + this.lineHeight + bottomMargin - this.$size.scrollerHeight);
  }

  var scrollLeft = this.scrollLeft;

  if (scrollLeft > left) {
    if (left < this.$padding + 2 * this.layerConfig.characterWidth)
      left = -this.scrollMargin.left;
    this.session.setScrollLeft(left);
  } else if (scrollLeft + this.$size.scrollerWidth < left + this.characterWidth) {
    this.session.setScrollLeft(Math.round(left + this.characterWidth - this.$size.scrollerWidth));
  } else if (scrollLeft <= this.$padding && left - scrollLeft < this.characterWidth) {
    this.session.setScrollLeft(0);
  }
};

export const getScrollTop = function () {
  return this.session.getScrollTop();
};

export const getScrollLeft = function () {
  return this.session.getScrollLeft();
};

export const getScrollTopRow = function () {
  return this.scrollTop / this.lineHeight;
};

export const getScrollBottomRow = function () {
  return Math.max(0, Math.floor((this.scrollTop + this.$size.scrollerHeight) / this.lineHeight) - 1);
};

export const scrollToRow = function (row) {
  this.session.setScrollTop(row * this.lineHeight);
};

export const alignCursor = function (cursor, alignment) {
  if (typeof cursor == "number")
    cursor = { row: cursor, column: 0 };

  var pos = this.$cursorLayer.getPixelPosition(cursor);
  var h = this.$size.scrollerHeight - this.lineHeight;
  var offset = pos.top - h * (alignment || 0);

  this.session.setScrollTop(offset);
  return offset;
};

export const STEPS = 8;
export const $calcSteps = function (fromValue, toValue) {
  var i = 0;
  var l = this.STEPS;
  var steps = [];

  var func = function (t, x_min, dx) {
    return dx * (Math.pow(t - 1, 3) + 1) + x_min;
  };

  for (i = 0; i < l; ++i)
    steps.push(func(i / this.STEPS, fromValue, toValue - fromValue));

  return steps;
};

export const scrollToLine = function (line, center, animate, callback) {
  var pos = this.$cursorLayer.getPixelPosition({ row: line, column: 0 });
  var offset = pos.top;
  if (center)
    offset -= this.$size.scrollerHeight / 2;

  var initialScroll = this.scrollTop;
  this.session.setScrollTop(offset);
  if (animate !== false)
    this.animateScrolling(initialScroll, callback);
};

export const animateScrolling = function (fromValue, callback) {
  var toValue = this.scrollTop;
  if (!this.$animatedScroll)
    return;
  var _self = this;

  if (fromValue == toValue)
    return;

  if (this.$scrollAnimation) {
    var oldSteps = this.$scrollAnimation.steps;
    if (oldSteps.length) {
      fromValue = oldSteps[0];
      if (fromValue == toValue)
        return;
    }
  }

  var steps = _self.$calcSteps(fromValue, toValue);
  this.$scrollAnimation = { from: fromValue, to: toValue, steps: steps };

  clearInterval(this.$timer);

  _self.session.setScrollTop(steps.shift());
  // trick session to think it's already scrolled to not loose toValue
  _self.session.$scrollTop = toValue;
  this.$timer = setInterval(function () {
    if (!_self.session)
      return clearInterval(_self.$timer);
    if (steps.length) {
      _self.session.setScrollTop(steps.shift());
      _self.session.$scrollTop = toValue;
    } else if (toValue != null) {
      _self.session.$scrollTop = -1;
      _self.session.setScrollTop(toValue);
      toValue = null;
    } else {
      // do this on separate step to not get spurious scroll event from scrollbar
      _self.$timer = clearInterval(_self.$timer);
      _self.$scrollAnimation = null;
      callback && callback();
    }
  }, 10);
};

export const scrollToY = function (scrollTop) {
  // after calling scrollBar.setScrollTop
  // scrollbar sends us event with same scrollTop. ignore it
  if (this.scrollTop !== scrollTop) {
    this.$loop.schedule(this.CHANGE_SCROLL);
    this.scrollTop = scrollTop;
  }
};

export const scrollToX = function (scrollLeft) {
  if (this.scrollLeft !== scrollLeft)
    this.scrollLeft = scrollLeft;
  this.$loop.schedule(this.CHANGE_H_SCROLL);
};

export const scrollTo = function (x, y) {
  this.session.setScrollTop(y);
  this.session.setScrollLeft(x);
};

export const scrollBy = function (deltaX, deltaY) {
  deltaY && this.session.setScrollTop(this.session.getScrollTop() + deltaY);
  deltaX && this.session.setScrollLeft(this.session.getScrollLeft() + deltaX);
};

export const isScrollableBy = function (deltaX, deltaY) {
  if (deltaY < 0 && this.session.getScrollTop() >= 1 - this.scrollMargin.top)
    return true;
  if (deltaY > 0 && this.session.getScrollTop() + this.$size.scrollerHeight
    - this.layerConfig.maxHeight < -1 + this.scrollMargin.bottom)
    return true;
  if (deltaX < 0 && this.session.getScrollLeft() >= 1 - this.scrollMargin.left)
    return true;
  if (deltaX > 0 && this.session.getScrollLeft() + this.$size.scrollerWidth
    - this.layerConfig.width < -1 + this.scrollMargin.right)
    return true;
};

export const pixelToScreenCoordinates = function (x, y) {
  var canvasPos;
  if (this.$hasCssTransforms) {
    canvasPos = { top: 0, left: 0 };
    var p = this.$fontMetrics.transformCoordinates([x, y]);
    x = p[1] - this.gutterWidth - this.margin.left;
    y = p[0];
  } else {
    canvasPos = this.scroller.getBoundingClientRect();
  }

  var offsetX = x + this.scrollLeft - canvasPos.left - this.$padding;
  var offset = offsetX / this.characterWidth;
  var row = Math.floor((y + this.scrollTop - canvasPos.top) / this.lineHeight);
  var col = this.$blockCursor ? Math.floor(offset) : Math.round(offset);

  return { row: row, column: col, side: offset - col > 0 ? 1 : -1, offsetX: offsetX };
};

export const screenToTextCoordinates = function (x, y) {
  var canvasPos;
  if (this.$hasCssTransforms) {
    canvasPos = { top: 0, left: 0 };
    var p = this.$fontMetrics.transformCoordinates([x, y]);
    x = p[1] - this.gutterWidth - this.margin.left;
    y = p[0];
  } else {
    canvasPos = this.scroller.getBoundingClientRect();
  }

  var offsetX = x + this.scrollLeft - canvasPos.left - this.$padding;
  var offset = offsetX / this.characterWidth;
  var col = this.$blockCursor ? Math.floor(offset) : Math.round(offset);

  var row = Math.floor((y + this.scrollTop - canvasPos.top) / this.lineHeight);

  return this.session.screenToDocumentPosition(row, Math.max(col, 0), offsetX);
};

export const textToScreenCoordinates = function (row, column) {
  var canvasPos = this.scroller.getBoundingClientRect();
  var pos = this.session.documentToScreenPosition(row, column);

  var x = this.$padding + (this.session.$bidiHandler.isBidiRow(pos.row, row)
    ? this.session.$bidiHandler.getPosLeft(pos.column)
    : Math.round(pos.column * this.characterWidth));

  var y = pos.row * this.lineHeight;

  return {
    pageX: canvasPos.left + x - this.scrollLeft,
    pageY: canvasPos.top + y - this.scrollTop
  };
};

export const visualizeFocus = function () {
  dom.addCssClass(this.container, "ace_focus");
};

export const visualizeBlur = function () {
  dom.removeCssClass(this.container, "ace_focus");
};

export const showComposition = function (composition) {
  this.$composition = composition;
  if (!composition.cssText) {
    composition.cssText = this.textarea.style.cssText;
  }
  if (composition.useTextareaForIME == undefined)
    composition.useTextareaForIME = this.$useTextareaForIME;

  if (this.$useTextareaForIME) {
    dom.addCssClass(this.textarea, "ace_composition");
    this.textarea.style.cssText = "";
    this.$moveTextAreaToCursor();
    this.$cursorLayer.element.style.display = "none";
  }
  else {
    composition.markerId = this.session.addMarker(composition.markerRange, "ace_composition_marker", "text");
  }
};

export const setCompositionText = function (text) {
  var cursor = this.session.selection.cursor;
  this.addToken(text, "composition_placeholder", cursor.row, cursor.column);
  this.$moveTextAreaToCursor();
};

export const hideComposition = function () {
  if (!this.$composition)
    return;

  if (this.$composition.markerId)
    this.session.removeMarker(this.$composition.markerId);

  dom.removeCssClass(this.textarea, "ace_composition");
  this.textarea.style.cssText = this.$composition.cssText;
  var cursor = this.session.selection.cursor;
  this.removeExtraToken(cursor.row, cursor.column);
  this.$composition = null;
  this.$cursorLayer.element.style.display = "";
};

export const addToken = function (text, type, row, column) {
  var session = this.session;
  session.bgTokenizer.lines[row] = null;
  var newToken = { type: type, value: text };
  var tokens = session.getTokens(row);
  if (column == null) {
    tokens.push(newToken);
  } else {
    var l = 0;
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      l += token.value.length;
      if (column <= l) {
        var diff = token.value.length - (l - column);
        var before = token.value.slice(0, diff);
        var after = token.value.slice(diff);

        tokens.splice(i, 1, { type: token.type, value: before }, newToken, { type: token.type, value: after });
        break;
      }
    }
  }
  this.updateLines(row, row);
};

export const removeExtraToken = function (row, column) {
  this.updateLines(row, row);
};

export const setTheme = function (theme, cb) {
  var _self = this;
  this.$themeId = theme;
  _self._dispatchEvent('themeChange', { theme: theme });

  if (!theme || typeof theme == "string") {
    var moduleName = theme || this.$options.theme.initialValue;
    config.loadModule(["theme", moduleName], afterLoad);
  } else {
    afterLoad(theme);
  }

  function afterLoad(module) {
    if (_self.$themeId != theme)
      return cb && cb();
    if (!module || !module.cssClass)
      throw new Error("couldn't load module " + theme + " or it didn't call define");
    if (module.$id)
      _self.$themeId = module.$id;
    dom.importCssString(
      module.cssText,
      module.cssClass,
      _self.container
    );

    if (_self.theme)
      dom.removeCssClass(_self.container, _self.theme.cssClass);

    var padding = "padding" in module ? module.padding
      : "padding" in (_self.theme || {}) ? 4 : _self.$padding;
    if (_self.$padding && padding != _self.$padding)
      _self.setPadding(padding);

    // this is kept only for backwards compatibility
    _self.$theme = module.cssClass;

    _self.theme = module;
    dom.addCssClass(_self.container, module.cssClass);
    dom.setCssClass(_self.container, "ace_dark", module.isDark);

    // force re-measure of the gutter width
    if (_self.$size) {
      _self.$size.width = 0;
      _self.$updateSizeAsync();
    }

    _self._dispatchEvent('themeLoaded', { theme: module });
    cb && cb();
  }
};

export const getTheme = function () {
  return this.$themeId;
};

export const setStyle = function (style, include) {
  dom.setCssClass(this.container, style, include !== false);
};

export const unsetStyle = function (style) {
  dom.removeCssClass(this.container, style);
};

export const setCursorStyle = function (style) {
  dom.setStyle(this.scroller.style, "cursor", style);
};

export const setMouseCursor = function (cursorStyle) {
  dom.setStyle(this.scroller.style, "cursor", cursorStyle);
};

export const attachToShadowRoot = function () {
  dom.importCssString(editorCss, "ace_editor.css", this.container);
};

export const destroy = function () {
  this.freeze();
  this.$fontMetrics.destroy();
  this.$cursorLayer.destroy();
  this.removeAllListeners();
  this.container.textContent = "";
};