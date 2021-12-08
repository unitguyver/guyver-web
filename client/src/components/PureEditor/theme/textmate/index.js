import dom from "../../lib/utils/dom";

const cssText = require("./index.css");
const isDark = false;
const cssClass = "ace-tm";
const $id = "ace/theme/textmate";

dom.importCssString(cssText, cssClass, false);

export default {
  $id,
  isDark,
  cssClass,
  cssText
}