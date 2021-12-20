export default class KeyMap {

  constructor() {
    //
  };

  default = function (key) {
    return function (cm) {
      let cmd = cm.ace.commands.commandKeyBinding[key.toLowerCase()];
      return cmd && cm.ace.execCommand(cmd) !== false;
    };
  };
}