import Register from "./Register";
import { isUpperCase, inArray } from "../../../utils/common";

export default class RegisterController {
  unnamedRegister = new Register();

  constructor(registers) {
    this.registers = registers;
    this.registers['"'] = this.unnamedRegister;
    this.registers['.'] = new Register();
    this.registers[':'] = new Register();
    this.registers['/'] = new Register();
  };

  shiftNumericRegisters_ = function () {
    for (let i = 9; i >= 2; i--) {
      this.registers[i] = this.getRegister('' + (i - 1));
    }
  }

  isValidRegister = function (name) {
    return name && inArray(name, Register.valids);
  };

  getRegister = function (name) {
    if (!this.isValidRegister(name)) {
      return this.unnamedRegister;
    }
    name = name.toLowerCase();
    if (!this.registers[name]) {
      this.registers[name] = new Register();
    }
    return this.registers[name];
  };

  pushText = function (registerName, operator, text, linewise, blockwise) {
    if (registerName === '_') return;
    if (linewise && text.charAt(text.length - 1) !== '\n') {
      text += '\n';
    }

    var register = this.isValidRegister(registerName) ?
      this.getRegister(registerName) : null;

    if (!register) {
      switch (operator) {
        case 'yank':
          this.registers['0'] = new Register(text, linewise, blockwise);
          break;
        case 'delete':
        case 'change':
          if (text.indexOf('\n') == -1) {
            this.registers['-'] = new Register(text, linewise);
          } else {
            this.shiftNumericRegisters_();
            this.registers['1'] = new Register(text, linewise);
          }
          break;
      }

      this.unnamedRegister.setText(text, linewise, blockwise);
      return;
    }

    var append = isUpperCase(registerName);
    if (append) {
      register.pushText(text, linewise);
    } else {
      register.setText(text, linewise, blockwise);
    }

    this.unnamedRegister.setText(register.toString(), linewise);
  }
}