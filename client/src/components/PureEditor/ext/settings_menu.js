import OptionPanel from "./OptionPanel";
import overlayPage from "./menu_tools/overlay_page";
import Editor from "../editor";

function showSettingsMenu(editor) {
    // show if the menu isn't open already.
    if (!document.getElementById('ace_settingsmenu')) {
        var options = new OptionPanel(editor);
        options.render();
        options.container.id = "ace_settingsmenu";
        overlayPage(editor, options.container);
        options.container.querySelector("select,input,button,checkbox").focus();
    }
}

export default function init() {
    Editor.prototype.showSettingsMenu = function () {
        showSettingsMenu(this);
    };
};
