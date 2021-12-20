import { makeValidKeys } from "../../../utils/common";

export default class Register {
  static valids = makeValidKeys(['-', '"', '.', ':', '_', '/']);

  insertModeChanges = [];
  searchQueries = [];

  constructor(text, linewise, blockwise) {
    this.clear();
    this.keyBuffer = [text || ''];
    this.linewise = !!linewise;
    this.blockwise = !!blockwise;
  };

  setText = function (text, linewise, blockwise) {
    this.keyBuffer = [text || ''];
    this.linewise = !!linewise;
    this.blockwise = !!blockwise;
  };

  pushText = function (text, linewise) {
    if (linewise) {
      if (!this.linewise) {
        this.keyBuffer.push('\n');
      }
      this.linewise = true;
    }
    this.keyBuffer.push(text);
  };

  pushInsertModeChanges = function (changes) {
    this.insertModeChanges.push(createInsertModeChanges(changes));
  };

  pushSearchQuery = function (query) {
    this.searchQueries.push(query);
  };

  clear = function () {
    this.keyBuffer = [];
    this.insertModeChanges = [];
    this.searchQueries = [];
    this.linewise = false;
  };

  toString = function () {
    return this.keyBuffer.join('');
  }
}