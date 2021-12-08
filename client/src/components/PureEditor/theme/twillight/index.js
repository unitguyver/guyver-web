import dom from "../../lib/utils/dom";

const cssText = require("./index.css");
const isDark = true;
const cssClass = "ace-twilight";

dom.importCssString(cssText, cssClass, false);

export default {
  isDark,
  cssClass,
  cssText
}