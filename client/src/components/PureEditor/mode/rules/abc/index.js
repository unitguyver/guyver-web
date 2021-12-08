import TextMode from "../text";
import ABCHighlightRules from "./highlight";
import FoldMode from "../../lib/folding/fold_mode";

export default class ABCMode extends TextMode {
    $id = "abc";

    lineCommentStart = "%";
    HighlightRules = ABCHighlightRules;
    foldingRules = new FoldMode();

    constructor() {
        super();

        this.$behaviour = this.$defaultBehaviour;
    }
}
