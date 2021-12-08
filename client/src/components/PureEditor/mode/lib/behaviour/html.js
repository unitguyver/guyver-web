import oop from "../../../lib/utils/oop";
import XmlBehaviour from "./xml";

const HtmlBehaviour = function () {

    XmlBehaviour.call(this);

};

oop.inherits(HtmlBehaviour, XmlBehaviour);

export default HtmlBehaviour;