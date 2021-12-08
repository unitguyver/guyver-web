import dom from "../../lib/utils/dom";

const cssText = require("./index.css");
const isDark = false;
const cssClass = "ace-dawn";

dom.importCssString(cssText, cssClass, false);

export default {
  isDark,
  cssClass,
  cssText
}