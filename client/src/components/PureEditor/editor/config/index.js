import AppConfig from "./AppConfig";
import dom from "../../lib/utils/dom";
import lang from "../../lib/utils/lang";

const appConfig = new AppConfig();
appConfig.version = "1.4.13";

const global = (function () {
    return this || typeof window != "undefined" && window;
})();

function deHyphenate(str) {
    return str.replace(/-(.)/g, function (m, m1) {
        return m1.toUpperCase();
    });
}

const options = {
    packaged: false,
    suffix: ".js",
    $moduleUrls: {},
    loadWorkerFromBlob: true,
    sharedPopups: false
};

appConfig.get = function (key) {
    if (!options.hasOwnProperty(key))
        throw new Error("Unknown config key: " + key);
    return options[key];
};

appConfig.set = function (key, value) {
    if (options.hasOwnProperty(key))
        options[key] = value;
    else if (this.setDefaultValue("", key, value) == false)
        throw new Error("Unknown config key: " + key);
    if (key == "useStrictCSP")
        dom.useStrictCSP(value);
};

appConfig.all = function () {
    return lang.copyObject(options);
};

appConfig.$modes = {};

/**
 * @author guyver
 * @date 2021/12/02 16:11
 * @description 加载模块
 */
appConfig.loadModule = function (moduleName, onLoad) {

    if (Array.isArray(moduleName)) {
        const moduleType = moduleName[0];
        moduleName = /((\w|\-)+)$/.exec(moduleName[1])[0];
        const onSuccess = function (moduleFile) {
            onLoad(moduleFile.default);
        }
        const onError = function (err) {
            console.log(err)
        }
        switch (moduleType) {
            case "mode":
                require([`../../mode/rules/${moduleName}/index.js`], onSuccess, onError);
                break;
            case "theme":
                require([`../../theme/${moduleName}/index.js`], onSuccess, onError);
                break;
            default:
                onError();
        };

    } else {
        console.log("参数异常", moduleName)
    }
};

// initialization
function init(packaged) {
    if (!global || !global.document)
        return;

    options.packaged = packaged || module.packaged || (global.define && define.packaged);

    var scriptOptions = {};
    var scriptUrl = "";

    // Use currentScript.ownerDocument in case this file was loaded from imported document. (HTML Imports)
    var currentScript = (document.currentScript || document._currentScript); // native or polyfill
    var currentDocument = currentScript && currentScript.ownerDocument || document;

    var scripts = currentDocument.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];

        var src = script.src || script.getAttribute("src");
        if (!src)
            continue;

        var attributes = script.attributes;
        for (var j = 0, l = attributes.length; j < l; j++) {
            var attr = attributes[j];
            if (attr.name.indexOf("data-ace-") === 0) {
                scriptOptions[deHyphenate(attr.name.replace(/^data-ace-/, ""))] = attr.value;
            }
        }

        var m = src.match(/^(.*)\/ace(\-\w+)?\.js(\?|$)/);
        if (m)
            scriptUrl = m[1];
    }

    if (scriptUrl) {
        scriptOptions.base = scriptOptions.base || scriptUrl;
        scriptOptions.packaged = true;
    }

    scriptOptions.basePath = scriptOptions.base;
    scriptOptions.workerPath = scriptOptions.workerPath || scriptOptions.base;
    scriptOptions.modePath = scriptOptions.modePath || scriptOptions.base;
    scriptOptions.themePath = scriptOptions.themePath || scriptOptions.base;
    delete scriptOptions.base;

    for (var key in scriptOptions)
        if (typeof scriptOptions[key] !== "undefined")
            appConfig.set(key, scriptOptions[key]);
}

appConfig.init = init;

export default appConfig;