import Pos from "../../Pos";

export default class CircularJumpList {
  size = 100;
  pointer = -1;
  head = 0;
  tail = 0;
  buffer = new Array(100);

  constructor(cachedCursor) {
    this.cachedCursor = cachedCursor;
  };

  useNextSlot = function (cm, cursor) {
    var next = ++this.pointer % this.size;
    var trashMark = this.buffer[next];
    if (trashMark) {
      trashMark.clear();
    }
    this.buffer[next] = cm.setBookmark(cursor);
  }

  add = function (cm, oldCur, newCur) {
    var current = this.pointer % this.size;
    var curMark = this.buffer[current];

    if (curMark) {
      var markPos = curMark.find();
      // avoid recording redundant cursor position
      if (markPos && !cursorEqual(markPos, oldCur)) {
        this.useNextSlot(cm, oldCur);
      }
    } else {
      this.useNextSlot(cm, oldCur);
    }
    this.useNextSlot(cm, newCur);
    this.head = this.pointer;
    this.tail = this.pointer - this.size + 1;
    if (this.tail < 0) {
      this.tail = 0;
    }
  };

  move(cm, offset) {
    this.pointer += offset;
    if (this.pointer > this.head) {
      this.pointer = this.head;
    } else if (this.pointer < this.tail) {
      this.pointer = this.tail;
    }
    var mark = this.buffer[(this.size + this.pointer) % this.size];
    // skip marks that are temporarily removed from text buffer
    if (mark && !mark.find()) {
      var inc = offset > 0 ? 1 : -1;
      var newCur;
      var oldCur = cm.getCursor();
      do {
        this.pointer += inc;
        mark = this.buffer[(this.size + this.pointer) % this.size];
        // skip marks that are the same as current position
        if (mark &&
          (newCur = mark.find()) &&
          !Pos.cursorEqual(oldCur, newCur)) {
          break;
        }
      } while (this.pointer < this.head && this.pointer > this.tail);
    }
    return mark;
  };

  find(cm, offset) {
    var oldPointer = this.pointer;
    var mark = this.move(cm, offset);
    this.pointer = oldPointer;
    return mark && mark.find();
  }
}