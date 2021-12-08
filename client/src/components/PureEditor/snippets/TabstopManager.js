import Range from "../editor/tools/Range";
import RangeList from "../editor/tools/RangeList";
import lang from "../lib/utils/lang";
import HashHandler from "../lib/event/keyboard/HashHandler";

const movePoint = function (point, diff) {
  if (point.row == 0)
    point.column += diff.column;
  point.row += diff.row;
};

const moveRelative = function (point, start) {
  if (point.row == start.row)
    point.column -= start.column;
  point.row -= start.row;
};

export default class TabstopManager {
  keyboardHandler = new HashHandler();

  constructor(editor) {
    if (editor.tabstopManager)
      return editor.tabstopManager;
    editor.tabstopManager = this;
    this.$onChange = this.onChange.bind(this);
    this.$onChangeSelection = lang.delayedCall(this.onChangeSelection.bind(this)).schedule;
    this.$onChangeSession = this.onChangeSession.bind(this);
    this.$onAfterExec = this.onAfterExec.bind(this);
    this.attach(editor);

    this.keyboardHandler.bindKeys({
      "Tab": function (editor) {
        if (snippetManager && snippetManager.expandWithTab(editor))
          return;
        editor.tabstopManager.tabNext(1);
        editor.renderer.scrollCursorIntoView();
      },
      "Shift-Tab": function (editor) {
        editor.tabstopManager.tabNext(-1);
        editor.renderer.scrollCursorIntoView();
      },
      "Esc": function (editor) {
        editor.tabstopManager.detach();
      }
    });
  };

  attach = function (editor) {
    this.index = 0;
    this.ranges = [];
    this.tabstops = [];
    this.$openTabstops = null;
    this.selectedTabstop = null;

    this.editor = editor;
    this.editor.on("change", this.$onChange);
    this.editor.on("changeSelection", this.$onChangeSelection);
    this.editor.on("changeSession", this.$onChangeSession);
    this.editor.commands.on("afterExec", this.$onAfterExec);
    this.editor.keyBinding.addKeyboardHandler(this.keyboardHandler);
  };

  detach = function () {
    this.tabstops.forEach(this.removeTabstopMarkers, this);
    this.ranges = null;
    this.tabstops = null;
    this.selectedTabstop = null;
    this.editor.removeListener("change", this.$onChange);
    this.editor.removeListener("changeSelection", this.$onChangeSelection);
    this.editor.removeListener("changeSession", this.$onChangeSession);
    this.editor.commands.removeListener("afterExec", this.$onAfterExec);
    this.editor.keyBinding.removeKeyboardHandler(this.keyboardHandler);
    this.editor.tabstopManager = null;
    this.editor = null;
  };

  onChange = function (delta) {
    var isRemove = delta.action[0] == "r";
    var selectedTabstop = this.selectedTabstop || {};
    var parents = selectedTabstop.parents || {};
    var tabstops = (this.tabstops || []).slice();
    for (var i = 0; i < tabstops.length; i++) {
      var ts = tabstops[i];
      var active = ts == selectedTabstop || parents[ts.index];
      ts.rangeList.$bias = active ? 0 : 1;

      if (delta.action == "remove" && ts !== selectedTabstop) {
        var parentActive = ts.parents && ts.parents[selectedTabstop.index];
        var startIndex = ts.rangeList.pointIndex(delta.start, parentActive);
        startIndex = startIndex < 0 ? -startIndex - 1 : startIndex + 1;
        var endIndex = ts.rangeList.pointIndex(delta.end, parentActive);
        endIndex = endIndex < 0 ? -endIndex - 1 : endIndex - 1;
        var toRemove = ts.rangeList.ranges.slice(startIndex, endIndex);
        for (var j = 0; j < toRemove.length; j++)
          this.removeRange(toRemove[j]);
      }
      ts.rangeList.$onChange(delta);
    }
    var session = this.editor.session;
    if (!this.$inChange && isRemove && session.getLength() == 1 && !session.getValue())
      this.detach();
  };

  updateLinkedFields = function () {
    var ts = this.selectedTabstop;
    if (!ts || !ts.hasLinkedRanges || !ts.firstNonLinked)
      return;
    this.$inChange = true;
    var session = this.editor.session;
    var text = session.getTextRange(ts.firstNonLinked);
    for (var i = 0; i < ts.length; i++) {
      var range = ts[i];
      if (!range.linked)
        continue;
      var original = range.original;
      var fmt = snippetManager.tmStrFormat(text, original, this.editor);
      session.replace(range, fmt);
    }
    this.$inChange = false;
  };

  onAfterExec = function (e) {
    if (e.command && !e.command.readOnly)
      this.updateLinkedFields();
  };

  onChangeSelection = function () {
    if (!this.editor)
      return;
    var lead = this.editor.selection.lead;
    var anchor = this.editor.selection.anchor;
    var isEmpty = this.editor.selection.isEmpty();
    for (var i = 0; i < this.ranges.length; i++) {
      if (this.ranges[i].linked)
        continue;
      var containsLead = this.ranges[i].contains(lead.row, lead.column);
      var containsAnchor = isEmpty || this.ranges[i].contains(anchor.row, anchor.column);
      if (containsLead && containsAnchor)
        return;
    }
    this.detach();
  };

  onChangeSession = function () {
    this.detach();
  };

  tabNext = function (dir) {
    var max = this.tabstops.length;
    var index = this.index + (dir || 1);
    index = Math.min(Math.max(index, 1), max);
    if (index == max)
      index = 0;
    this.selectTabstop(index);
    if (index === 0)
      this.detach();
  };

  selectTabstop = function (index) {
    this.$openTabstops = null;
    var ts = this.tabstops[this.index];
    if (ts)
      this.addTabstopMarkers(ts);
    this.index = index;
    ts = this.tabstops[this.index];
    if (!ts || !ts.length)
      return;

    this.selectedTabstop = ts;
    var range = ts.firstNonLinked || ts;
    if (ts.choices) range.cursor = range.start;
    if (!this.editor.inVirtualSelectionMode) {
      var sel = this.editor.multiSelect;
      sel.toSingleRange(range);
      for (var i = 0; i < ts.length; i++) {
        if (ts.hasLinkedRanges && ts[i].linked)
          continue;
        sel.addRange(ts[i].clone(), true);
      }
    } else {
      this.editor.selection.fromOrientedRange(range);
    }

    this.editor.keyBinding.addKeyboardHandler(this.keyboardHandler);
    if (this.selectedTabstop && this.selectedTabstop.choices)
      this.editor.execCommand("startAutocomplete", { matches: this.selectedTabstop.choices });
  };

  addTabstops = function (tabstops, start, end) {
    var useLink = this.useLink || !this.editor.getOption("enableMultiselect");

    if (!this.$openTabstops)
      this.$openTabstops = [];
    // add final tabstop if missing
    if (!tabstops[0]) {
      var p = Range.fromPoints(end, end);
      moveRelative(p.start, start);
      moveRelative(p.end, start);
      tabstops[0] = [p];
      tabstops[0].index = 0;
    }

    var i = this.index;
    var arg = [i + 1, 0];
    var ranges = this.ranges;
    tabstops.forEach(function (ts, index) {
      var dest = this.$openTabstops[index] || ts;

      for (var i = 0; i < ts.length; i++) {
        var p = ts[i];
        var range = Range.fromPoints(p.start, p.end || p.start);
        movePoint(range.start, start);
        movePoint(range.end, start);
        range.original = p;
        range.tabstop = dest;
        ranges.push(range);
        if (dest != ts)
          dest.unshift(range);
        else
          dest[i] = range;
        if (p.fmtString || (dest.firstNonLinked && useLink)) {
          range.linked = true;
          dest.hasLinkedRanges = true;
        } else if (!dest.firstNonLinked)
          dest.firstNonLinked = range;
      }
      if (!dest.firstNonLinked)
        dest.hasLinkedRanges = false;
      if (dest === ts) {
        arg.push(dest);
        this.$openTabstops[index] = dest;
      }
      this.addTabstopMarkers(dest);
      dest.rangeList = dest.rangeList || new RangeList();
      dest.rangeList.$bias = 0;
      dest.rangeList.addList(dest);
    }, this);

    if (arg.length > 2) {
      // when adding new snippet inside existing one, make sure 0 tabstop is at the end
      if (this.tabstops.length)
        arg.push(arg.splice(2, 1)[0]);
      this.tabstops.splice.apply(this.tabstops, arg);
    }
  };

  addTabstopMarkers = function (ts) {
    var session = this.editor.session;
    ts.forEach(function (range) {
      if (!range.markerId)
        range.markerId = session.addMarker(range, "ace_snippet-marker", "text");
    });
  };

  removeTabstopMarkers = function (ts) {
    var session = this.editor.session;
    ts.forEach(function (range) {
      session.removeMarker(range.markerId);
      range.markerId = null;
    });
  };

  removeRange = function (range) {
    var i = range.tabstop.indexOf(range);
    if (i != -1) range.tabstop.splice(i, 1);
    i = this.ranges.indexOf(range);
    if (i != -1) this.ranges.splice(i, 1);
    i = range.tabstop.rangeList.ranges.indexOf(range);
    if (i != -1) range.tabstop.splice(i, 1);
    this.editor.session.removeMarker(range.markerId);
    if (!range.tabstop.length) {
      i = this.tabstops.indexOf(range.tabstop);
      if (i != -1)
        this.tabstops.splice(i, 1);
      if (!this.tabstops.length)
        this.detach();
    }
  };
}
