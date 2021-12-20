

export default class HistoryController {
  historyBuffer = [];
  iterator = 0;
  initialPrefix = null;

  constructor() {
    //
  };

  nextMatch = function (input, up) {
    var historyBuffer = this.historyBuffer;
    var dir = up ? -1 : 1;
    if (this.initialPrefix === null) {
      this.initialPrefix = input;
    }
    for (let i = this.iterator + dir; up ? i >= 0 : i < historyBuffer.length; i += dir) {
      var element = historyBuffer[i];
      for (var j = 0; j <= element.length; j++) {
        if (this.initialPrefix == element.substring(0, j)) {
          this.iterator = i;
          return element;
        }
      }
    }
    // should return the user input in case we reach the end of buffer.
    if (i >= historyBuffer.length) {
      this.iterator = historyBuffer.length;
      return this.initialPrefix;
    }
    // return the last autocompleted query or exCommand as it is.
    if (i < 0) {
      return input;
    }
  };

  pushInput = function (input) {
    const index = this.historyBuffer.indexOf(input);
    if (index > -1) this.historyBuffer.splice(index, 1);
    if (input.length) this.historyBuffer.push(input);
  };

  reset = function () {
    this.initialPrefix = null;
    this.iterator = this.historyBuffer.length;
  }
}