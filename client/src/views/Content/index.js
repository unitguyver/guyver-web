import React from "react";
import ReactDOM from "react-dom";
import Connent from '@/utils/Connent';
import "@/utils/custom";

import App from "./App";
import "@/utils/antd/index.less";
import 'antd/lib/style/components.less';
import "./index.less";

// require(["/public/js/ace/index.min.js"]);
// require("/public/js/ace/theme/dawn.min.js");
// require("/public/js/ace/theme/tomorrow_night.min.js");
// require("/public/js/ace/worker/css.min.js");
// require("/public/js/ace/mode/css.min.js");
// require("/public/js/ace/worker/javascript.min.js");
// require("/public/js/ace/mode/javascript.min.js");

const connent = new Connent('content');
React.Component.prototype.$http = connent.$http.bind(connent);

const weiboApp = document.createElement('div');
weiboApp.id = "weiboApp";

document.body.appendChild(weiboApp);
ReactDOM.render(<App></App>, weiboApp);