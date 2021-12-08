import Editor from "../editor";
import config from "../editor/config";

config.defineOptions(Editor.prototype, "editor", {
    enableLinking: {
        set: function (val) {
            if (val) {
                this.on("click", onClick);
                this.on("mousemove", onMouseMove);
            } else {
                this.off("click", onClick);
                this.off("mousemove", onMouseMove);
            }
        },
        value: false
    }
});

let previousLinkingHover = false;

function onMouseMove(e) {
    var editor = e.editor;
    var ctrl = e.getAccelKey();

    if (ctrl) {
        var editor = e.editor;
        var docPos = e.getDocumentPosition();
        var session = editor.session;
        var token = session.getTokenAt(docPos.row, docPos.column);

        if (previousLinkingHover && previousLinkingHover != token) {
            editor._emit("linkHoverOut");
        }
        editor._emit("linkHover", { position: docPos, token: token });
        previousLinkingHover = token;
    } else if (exports.previousLinkingHover) {
        editor._emit("linkHoverOut");
        previousLinkingHover = false;
    }
}

function onClick(e) {
    var ctrl = e.getAccelKey();
    var button = e.getButton();

    if (button == 0 && ctrl) {
        var editor = e.editor;
        var docPos = e.getDocumentPosition();
        var session = editor.session;
        var token = session.getTokenAt(docPos.row, docPos.column);

        editor._emit("linkClick", { position: docPos, token: token });
    }
}

export default previousLinkingHover;
