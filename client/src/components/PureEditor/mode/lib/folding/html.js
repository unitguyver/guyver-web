import oop from "../../../lib/utils/oop";
import MixedFoldMode from "./mixed";
import XmlFoldMode from "./xml";
import CStyleFoldMode from "./cstyle";

const FoldMode = function (voidElements, optionalTags) {
    MixedFoldMode.call(this, new XmlFoldMode(voidElements, optionalTags), {
        "js-": new CStyleFoldMode(),
        "css-": new CStyleFoldMode()
    });
};

oop.inherits(FoldMode, MixedFoldMode);

export default FoldMode;