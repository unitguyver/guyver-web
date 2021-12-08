export default function getEditorKeybordShortcuts(editor) {
    let keybindings = [];
    let commandMap = {};
    editor.keyBinding.$handlers.forEach(function (handler) {
        let ckb = handler.commandKeyBinding;
        for (let i in ckb) {
            var key = i.replace(/(^|-)\w/g, function (x) { return x.toUpperCase(); });
            var commands = ckb[i];
            if (!Array.isArray(commands))
                commands = [commands];
            commands.forEach(function (command) {
                if (typeof command != "string")
                    command = command.name;
                if (commandMap[command]) {
                    commandMap[command].key += "|" + key;
                } else {
                    commandMap[command] = { key: key, command: command };
                    keybindings.push(commandMap[command]);
                }
            });
        }
    });
    return keybindings;
};