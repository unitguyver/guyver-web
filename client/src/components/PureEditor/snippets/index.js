import dom from "../lib/utils/dom";
import Editor from "../editor";
import SnippetManager from "./SnippetManager";

const snippetManager = new SnippetManager();

dom.importCssString("\
.ace_snippet-marker {\
    -moz-box-sizing: border-box;\
    box-sizing: border-box;\
    background: rgba(194, 193, 208, 0.09);\
    border: 1px dotted rgba(211, 208, 235, 0.62);\
    position: absolute;\
}", "snippets.css", false);

(function () {
  this.insertSnippet = function (content, options) {
    return snippetManager.insertSnippet(this, content, options);
  };
  this.expandSnippet = function (options) {
    return snippetManager.expandWithTab(this, options);
  };
}).call(Editor.prototype);

export default snippetManager;