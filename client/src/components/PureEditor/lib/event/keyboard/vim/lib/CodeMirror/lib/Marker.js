


export default class Marker {

  constructor(cm, id, row, column) {
    this.cm = cm;
    this.id = id;
    this.row = row;
    this.column = column;
    cm.marks[this.id] = this;
  };

  clear = function () {
    delete this.cm.marks[this.id]
  };

  find = function () {
    return toCmPos(this)
  };
}