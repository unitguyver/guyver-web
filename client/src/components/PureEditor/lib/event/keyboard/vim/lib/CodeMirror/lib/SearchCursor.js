import Pos from "../../Pos";
import Search from "../../../../../../../editor/tools/Search";

const search = new Search();

export default class SearchCursor {
  caseSensitive = false;
  isRegexp = false;
  last = null;

  constructor(query, pos, cm) {
    this.query = query;
    this.cm = cm;

    if (query instanceof RegExp && !query.global) {
      this.caseSensitive = !query.ignoreCase;
      this.query = query.source;
      this.isRegexp = true;
    }
    if (this.query === "\\n") {
      this.query = "\n";
      this.isRegexp = false;
    }

    if (pos.ch == undefined) {
      pos.ch = Number.MAX_VALUE;
    }
    this.acePos = {
      row: pos.line,
      column: pos.ch
    };
  };

  findNext = function () {
    return this.find(false)
  };

  findPrevious = function () {
    return this.find(true)
  };

  find = function (back) {
    search.setOptions({
      needle: this.query,
      caseSensitive: this.caseSensitive,
      wrap: false,
      backwards: back,
      regExp: this.isRegexp,
      start: this.last || this.acePos
    });
    this.last = search.find(this.cm.ace.session);
    return this.last && [!this.last.isEmpty()];
  };

  from = function () {
    return this.last && Pos.toCmPos(this.last.start)
  };

  to = function () {
    return this.last && Pos.toCmPos(this.last.end)
  };

  replace = function (text) {
    if (this.last) {
      this.last.end = this.cm.ace.session.doc.replace(this.last, text);
    }
  }
}