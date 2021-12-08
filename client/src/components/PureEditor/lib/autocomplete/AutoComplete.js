import HashHandler from "../event/keyboard/HashHandler";
import { AcePopup } from "./popup";
import util from "./util";
import dom from "../utils/dom";
import snippetManager from "../../snippets";
import config from "../../editor/config";
import lang from "../utils/lang";

export default class Autocomplete {
    autoInsert = false;
    autoSelect = true;
    exactMatch = false;
    gatherCompletionsId = 0;

    commands = {
        "Up": function (editor) { editor.completer.goTo("up"); },
        "Down": function (editor) { editor.completer.goTo("down"); },
        "Ctrl-Up|Ctrl-Home": function (editor) { editor.completer.goTo("start"); },
        "Ctrl-Down|Ctrl-End": function (editor) { editor.completer.goTo("end"); },

        "Esc": function (editor) { editor.completer.detach(); },
        "Return": function (editor) { return editor.completer.insertMatch(); },
        "Shift-Return": function (editor) { editor.completer.insertMatch(null, { deleteSuffix: true }); },
        "Tab": function (editor) {
            var result = editor.completer.insertMatch();
            if (!result && !editor.tabstopManager)
                editor.completer.goTo("down");
            else
                return result;
        },

        "PageUp": function (editor) { editor.completer.popup.gotoPageUp(); },
        "PageDown": function (editor) { editor.completer.popup.gotoPageDown(); }
    };

    startCommand = {
        name: "startAutocomplete",
        exec: function (editor, options) {
            var completer = Autocomplete.for(editor);
            completer.autoInsert = false;
            completer.autoSelect = true;
            completer.showPopup(editor, options);
            // prevent ctrl-space opening context menu on firefox on mac
            completer.cancelContextMenu();
        },
        bindKey: "Ctrl-Space|Ctrl-Shift-Space|Alt-Space"
    };

    constructor() {
        this.keyboardHandler = new HashHandler();
        this.keyboardHandler.bindKeys(this.commands);

        this.blurListener = this.blurListener.bind(this);
        this.changeListener = this.changeListener.bind(this);
        this.mousedownListener = this.mousedownListener.bind(this);
        this.mousewheelListener = this.mousewheelListener.bind(this);

        this.changeTimer = lang.delayedCall(function () {
            this.updateCompletions(true);
        }.bind(this));

        this.tooltipTimer = lang.delayedCall(this.updateDocTooltip.bind(this), 50);
    };

    $init = function () {
        this.popup = new AcePopup(document.body || document.documentElement);
        this.popup.on("click", function (e) {
            this.insertMatch();
            e.stop();
        }.bind(this));
        this.popup.focus = this.editor.focus.bind(this.editor);
        this.popup.on("show", this.tooltipTimer.bind(null, null));
        this.popup.on("select", this.tooltipTimer.bind(null, null));
        this.popup.on("changeHoverMarker", this.tooltipTimer.bind(null, null));
        return this.popup;
    };

    getPopup = function () {
        return this.popup || this.$init();
    };

    openPopup = function (editor, prefix, keepPopupPosition) {
        if (!this.popup)
            this.$init();

        this.popup.autoSelect = this.autoSelect;

        this.popup.setData(this.completions.filtered, this.completions.filterText);

        editor.keyBinding.addKeyboardHandler(this.keyboardHandler);

        var renderer = editor.renderer;
        this.popup.setRow(this.autoSelect ? 0 : -1);
        if (!keepPopupPosition) {
            this.popup.setTheme(editor.getTheme());
            this.popup.setFontSize(editor.getFontSize());

            var lineHeight = renderer.layerConfig.lineHeight;

            var pos = renderer.$cursorLayer.getPixelPosition(this.base, true);
            pos.left -= this.popup.getTextLeftOffset();

            var rect = editor.container.getBoundingClientRect();
            pos.top += rect.top - renderer.layerConfig.offset;
            pos.left += rect.left - editor.renderer.scrollLeft;
            pos.left += renderer.gutterWidth;

            this.popup.show(pos, lineHeight);
        } else if (keepPopupPosition && !prefix) {
            this.detach();
        }
        this.changeTimer.cancel();
    };

    detach = function () {
        this.editor.keyBinding.removeKeyboardHandler(this.keyboardHandler);
        this.editor.off("changeSelection", this.changeListener);
        this.editor.off("blur", this.blurListener);
        this.editor.off("mousedown", this.mousedownListener);
        this.editor.off("mousewheel", this.mousewheelListener);
        this.changeTimer.cancel();
        this.hideDocTooltip();

        this.gatherCompletionsId += 1;
        if (this.popup && this.popup.isOpen)
            this.popup.hide();

        if (this.base)
            this.base.detach();
        this.activated = false;
        this.completions = this.base = null;
    };

    changeListener = function (e) {
        var cursor = this.editor.selection.lead;
        if (cursor.row != this.base.row || cursor.column < this.base.column) {
            this.detach();
        }
        if (this.activated)
            this.changeTimer.schedule();
        else
            this.detach();
    };

    blurListener = function (e) {
        // we have to check if activeElement is a child of popup because
        // on IE preventDefault doesn't stop scrollbar from being focussed
        var el = document.activeElement;
        var text = this.editor.textInput.getElement();
        var fromTooltip = e.relatedTarget && this.tooltipNode && this.tooltipNode.contains(e.relatedTarget);
        var container = this.popup && this.popup.container;
        if (el != text && el.parentNode != container && !fromTooltip
            && el != this.tooltipNode && e.relatedTarget != text
        ) {
            this.detach();
        }
    };

    mousedownListener = function (e) {
        this.detach();
    };

    mousewheelListener = function (e) {
        this.detach();
    };

    goTo = function (where) {
        this.popup.goTo(where);
    };

    insertMatch = function (data, options) {
        if (!data)
            data = this.popup.getData(this.popup.getRow());
        if (!data)
            return false;

        var completions = this.completions;
        this.editor.startOperation({ command: { name: "insertMatch" } });
        if (data.completer && data.completer.insertMatch) {
            data.completer.insertMatch(this.editor, data);
        } else {
            // TODO add support for options.deleteSuffix
            if (completions.filterText) {
                var ranges = this.editor.selection.getAllRanges();
                for (var i = 0, range; range = ranges[i]; i++) {
                    range.start.column -= completions.filterText.length;
                    this.editor.session.remove(range);
                }
            }
            if (data.snippet)
                snippetManager.insertSnippet(this.editor, data.snippet);
            else
                this.editor.execCommand("insertstring", data.value || data);
        }
        // detach only if new popup was not opened while inserting match
        if (this.completions == completions)
            this.detach();
        this.editor.endOperation();
    };

    gatherCompletions = function (editor, callback) {
        var session = editor.getSession();
        var pos = editor.getCursorPosition();

        var prefix = util.getCompletionPrefix(editor);

        this.base = session.doc.createAnchor(pos.row, pos.column - prefix.length);
        this.base.$insertRight = true;

        var matches = [];
        var total = editor.completers.length;
        editor.completers.forEach(function (completer, i) {
            completer.getCompletions(editor, session, pos, prefix, function (err, results) {
                if (!err && results)
                    matches = matches.concat(results);
                // Fetch prefix again, because they may have changed by now
                callback(null, {
                    prefix: util.getCompletionPrefix(editor),
                    matches: matches,
                    finished: (--total === 0)
                });
            });
        });
        return true;
    };

    showPopup = function (editor, options) {
        if (this.editor)
            this.detach();

        this.activated = true;

        this.editor = editor;
        if (editor.completer != this) {
            if (editor.completer)
                editor.completer.detach();
            editor.completer = this;
        }

        editor.on("changeSelection", this.changeListener);
        editor.on("blur", this.blurListener);
        editor.on("mousedown", this.mousedownListener);
        editor.on("mousewheel", this.mousewheelListener);

        this.updateCompletions(false, options);
    };

    updateCompletions = function (keepPopupPosition, options) {
        if (keepPopupPosition && this.base && this.completions) {
            var pos = this.editor.getCursorPosition();
            var prefix = this.editor.session.getTextRange({ start: this.base, end: pos });
            if (prefix == this.completions.filterText)
                return;
            this.completions.setFilter(prefix);
            if (!this.completions.filtered.length)
                return this.detach();
            if (this.completions.filtered.length == 1
                && this.completions.filtered[0].value == prefix
                && !this.completions.filtered[0].snippet)
                return this.detach();
            this.openPopup(this.editor, prefix, keepPopupPosition);
            return;
        }

        if (options && options.matches) {
            var pos = this.editor.getSelectionRange().start;
            this.base = this.editor.session.doc.createAnchor(pos.row, pos.column);
            this.base.$insertRight = true;
            this.completions = new FilteredList(options.matches);
            return this.openPopup(this.editor, "", keepPopupPosition);
        }

        // Save current gatherCompletions session, session is close when a match is insert
        var _id = this.gatherCompletionsId;

        // Only detach if result gathering is finished
        var detachIfFinished = function (results) {
            if (!results.finished) return;
            return this.detach();
        }.bind(this);

        var processResults = function (results) {
            var prefix = results.prefix;
            var matches = results.matches;

            this.completions = new FilteredList(matches);

            if (this.exactMatch)
                this.completions.exactMatch = true;

            this.completions.setFilter(prefix);
            var filtered = this.completions.filtered;

            // No results
            if (!filtered.length)
                return detachIfFinished(results);

            // One result equals to the prefix
            if (filtered.length == 1 && filtered[0].value == prefix && !filtered[0].snippet)
                return detachIfFinished(results);

            // Autoinsert if one result
            if (this.autoInsert && filtered.length == 1 && results.finished)
                return this.insertMatch(filtered[0]);

            this.openPopup(this.editor, prefix, keepPopupPosition);
        }.bind(this);

        var isImmediate = true;
        var immediateResults = null;
        this.gatherCompletions(this.editor, function (err, results) {
            var prefix = results.prefix;
            var matches = results && results.matches;

            if (!matches || !matches.length)
                return detachIfFinished(results);

            // Wrong prefix or wrong session -> ignore
            if (prefix.indexOf(results.prefix) !== 0 || _id != this.gatherCompletionsId)
                return;

            // If multiple completers return their results immediately, we want to process them together
            if (isImmediate) {
                immediateResults = results;
                return;
            }

            processResults(results);
        }.bind(this));

        isImmediate = false;
        if (immediateResults) {
            var results = immediateResults;
            immediateResults = null;
            processResults(results);
        }
    };

    cancelContextMenu = function () {
        this.editor.$mouseHandler.cancelContextMenu();
    };

    updateDocTooltip = function () {
        var popup = this.popup;
        var all = popup.data;
        var selected = all && (all[popup.getHoveredRow()] || all[popup.getRow()]);
        var doc = null;
        if (!selected || !this.editor || !this.popup.isOpen)
            return this.hideDocTooltip();
        this.editor.completers.some(function (completer) {
            if (completer.getDocTooltip)
                doc = completer.getDocTooltip(selected);
            return doc;
        });
        if (!doc && typeof selected != "string")
            doc = selected;

        if (typeof doc == "string")
            doc = { docText: doc };
        if (!doc || !(doc.docHTML || doc.docText))
            return this.hideDocTooltip();
        this.showDocTooltip(doc);
    };

    showDocTooltip = function (item) {
        if (!this.tooltipNode) {
            this.tooltipNode = dom.createElement("div");
            this.tooltipNode.className = "ace_tooltip ace_doc-tooltip";
            this.tooltipNode.style.margin = 0;
            this.tooltipNode.style.pointerEvents = "auto";
            this.tooltipNode.tabIndex = -1;
            this.tooltipNode.onblur = this.blurListener.bind(this);
            this.tooltipNode.onclick = this.onTooltipClick.bind(this);
        }

        var tooltipNode = this.tooltipNode;
        if (item.docHTML) {
            tooltipNode.innerHTML = item.docHTML;
        } else if (item.docText) {
            tooltipNode.textContent = item.docText;
        }

        if (!tooltipNode.parentNode)
            document.body.appendChild(tooltipNode);
        var popup = this.popup;
        var rect = popup.container.getBoundingClientRect();
        tooltipNode.style.top = popup.container.style.top;
        tooltipNode.style.bottom = popup.container.style.bottom;

        tooltipNode.style.display = "block";
        if (window.innerWidth - rect.right < 320) {
            if (rect.left < 320) {
                if (popup.isTopdown) {
                    tooltipNode.style.top = rect.bottom + "px";
                    tooltipNode.style.left = rect.left + "px";
                    tooltipNode.style.right = "";
                    tooltipNode.style.bottom = "";
                } else {
                    tooltipNode.style.top = popup.container.offsetTop - tooltipNode.offsetHeight + "px";
                    tooltipNode.style.left = rect.left + "px";
                    tooltipNode.style.right = "";
                    tooltipNode.style.bottom = "";
                }
            } else {
                tooltipNode.style.right = window.innerWidth - rect.left + "px";
                tooltipNode.style.left = "";
            }
        } else {
            tooltipNode.style.left = (rect.right + 1) + "px";
            tooltipNode.style.right = "";
        }
    };

    hideDocTooltip = function () {
        this.tooltipTimer.cancel();
        if (!this.tooltipNode) return;
        var el = this.tooltipNode;
        if (!this.editor.isFocused() && document.activeElement == el)
            this.editor.focus();
        this.tooltipNode = null;
        if (el.parentNode)
            el.parentNode.removeChild(el);
    };

    onTooltipClick = function (e) {
        var a = e.target;
        while (a && a != this.tooltipNode) {
            if (a.nodeName == "A" && a.href) {
                a.rel = "noreferrer";
                a.target = "_blank";
                break;
            }
            a = a.parentNode;
        }
    };

    destroy = function () {
        this.detach();
        if (this.popup) {
            this.popup.destroy();
            var el = this.popup.container;
            if (el && el.parentNode)
                el.parentNode.removeChild(el);
        }
        if (this.editor && this.editor.completer == this)
            this.editor.completer == null;
        this.popup = null;
    };

    for = function (editor) {
        if (editor.completer) {
            return editor.completer;
        }
        if (config.get("sharedPopups")) {
            if (!Autocomplete.$shared)
                Autocomplete.$sharedInstance = new Autocomplete();
            editor.completer = Autocomplete.$sharedInstance;
        } else {
            editor.completer = new Autocomplete();
            editor.once("destroy", function (e, editor) {
                editor.completer.destroy();
            });
        }
        return editor.completer;
    };
}
