import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "@/utils/antd/index.less";
import Connent from '@/utils/Connent';

const connent = new Connent('content');
React.Component.prototype.$http = connent.$http.bind(connent);

const weiboApp = document.createElement('div');
weiboApp.id = "weiboApp";

ReactDOM.render(<App></App>, weiboApp);

document.body.appendChild(weiboApp);