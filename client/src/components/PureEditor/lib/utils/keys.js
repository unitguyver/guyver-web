import oop from "./oop";

class Keys {
    static MODIFIER_KEYS = {
        16: 'Shift', 17: 'Ctrl', 18: 'Alt', 224: 'Meta',
        91: 'MetaLeft', 92: 'MetaRight', 93: 'ContextMenu'
    };

    static KEY_MODS = {
        "ctrl": 1, "alt": 2, "option": 2, "shift": 4,
        "super": 8, "meta": 8, "command": 8, "cmd": 8,
        "control": 1
    };

    static FUNCTION_KEYS = {
        8: "Backspace",
        9: "Tab",
        13: "Return",
        19: "Pause",
        27: "Esc",
        32: "Space",
        33: "PageUp",
        34: "PageDown",
        35: "End",
        36: "Home",
        37: "Left",
        38: "Up",
        39: "Right",
        40: "Down",
        44: "Print",
        45: "Insert",
        46: "Delete",
        96: "Numpad0",
        97: "Numpad1",
        98: "Numpad2",
        99: "Numpad3",
        100: "Numpad4",
        101: "Numpad5",
        102: "Numpad6",
        103: "Numpad7",
        104: "Numpad8",
        105: "Numpad9",
        '-13': "NumpadEnter",
        112: "F1",
        113: "F2",
        114: "F3",
        115: "F4",
        116: "F5",
        117: "F6",
        118: "F7",
        119: "F8",
        120: "F9",
        121: "F10",
        122: "F11",
        123: "F12",
        144: "Numlock",
        145: "Scrolllock"
    };

    static PRINTABLE_KEYS = {
        32: ' ', 48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5',
        54: '6', 55: '7', 56: '8', 57: '9', 59: ';', 61: '=', 65: 'a',
        66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g', 72: 'h',
        73: 'i', 74: 'j', 75: 'k', 76: 'l', 77: 'm', 78: 'n', 79: 'o',
        80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u', 86: 'v',
        87: 'w', 88: 'x', 89: 'y', 90: 'z', 107: '+', 109: '-', 110: '.',
        186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`',
        219: '[', 220: '\\', 221: ']', 222: "'", 111: '/', 106: '*'
    };

    constructor() {
        for (let key in Keys.FUNCTION_KEYS) {
            const name = Keys.FUNCTION_KEYS[key].toLowerCase();
            this[name] = parseInt(key, 10);
        }

        for (let key in Keys.PRINTABLE_KEYS) {
            const name = Keys.PRINTABLE_KEYS[key].toLowerCase();
            this[name] = parseInt(key, 10);
        }

        this.enter = this["return"];
        this.escape = this.esc;
        this.del = this["delete"];

        // workaround for firefox bug
        this[173] = '-';
    };

    keyCodeToString = function (keyCode) {
        let keyString = Keys[keyCode];

        if (typeof keyString != "string") {
            keyString = String.fromCharCode(keyCode);
        }

        return keyString.toLowerCase();
    };
};

const mods = ["cmd", "ctrl", "alt", "shift"];
for (let i = Math.pow(2, mods.length); i--;) {
    Keys.KEY_MODS[i] = mods.filter(function (x) {
        return i & Keys.KEY_MODS[x];
    }).join("-") + "-";
}

Keys.KEY_MODS[0] = "";
Keys.KEY_MODS[-1] = "input-";
oop.mixin(Keys, Keys.MODIFIER_KEYS);
oop.mixin(Keys, Keys.PRINTABLE_KEYS);
oop.mixin(Keys, Keys.FUNCTION_KEYS);

export default Keys;
