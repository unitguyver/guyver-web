

export default class InputState {
  prefixRepeat = [];
  motionRepeat = [];
  operator = null;
  operatorArgs = null;
  motion = null;
  motionArgs = null;
  keyBuffer = [];
  registerName = null;

  constructor() {
    //
  };

  pushRepeatDigit = function (n) {
    if (!this.operator) {
      this.prefixRepeat = this.prefixRepeat.concat(n);
    } else {
      this.motionRepeat = this.motionRepeat.concat(n);
    }
  };

  getRepeat = function () {
    var repeat = 0;
    if (this.prefixRepeat.length > 0 || this.motionRepeat.length > 0) {
      repeat = 1;
      if (this.prefixRepeat.length > 0) {
        repeat *= parseInt(this.prefixRepeat.join(''), 10);
      }
      if (this.motionRepeat.length > 0) {
        repeat *= parseInt(this.motionRepeat.join(''), 10);
      }
    }
    return repeat;
  };
}