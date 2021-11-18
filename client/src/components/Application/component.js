import React, { Component } from 'react';
import "./index.less";

const APP_STATUS_STYLE = {
  "OPENED": {
    display: "flex",
    width: "100%",
    height: "100%",
    left: "0",
    top: "0",
  },
  "CLOSED": {
    display: "none"
  },
  "SMALL": {
    width: "50%",
    height: "50%",
    left: "25%",
    top: "25%"
  },
  "MIN": {
    width: 0,
    height: 0
  },
  "MAX": {
    width: "100%",
    height: "100%",
    left: "0",
    top: "0"
  }
}

const add_style = function (el, status) {
  if (!APP_STATUS_STYLE[status]) return;
  Object.entries(APP_STATUS_STYLE[status]).forEach(([key, value]) => {
    el.style[key] = value;
  })
}

export default class Applicationn extends Component {

  APP_NAME = undefined;
  APP_STATUS = "CLOSED";

  constructor(props) {
    super(props);
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:16
   * @description 组件数据更新
   */
  componentDidUpdate() {
    this.APP_STATUS = "CLOSED";
    this.props.taskbar.views.forEach((item, index) => {
      if (item.name === this.APP_NAME) {
        this.APP_STATUS = item.status;
      }
    });
    this.switch();
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:17
   * @description 绑定拖拽功能
   */
  bindDrag = (el) => {
    // console.log(el);
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:17
   * @description 绑定窗口
   */
  bindWindow = (el) => {
    this.APP_WINDOW = el;
    this.switch();
  }

  /**
   * @author guyver
   * @date 2021/11/16 18:15
   * @description 切换状态
   */
  switch = (status = this.APP_STATUS) => {
    console.log(status)
    this.APP_STATUS = status.toUpperCase();
    add_style(this.APP_WINDOW, this.APP_STATUS);
    this.render();
  }
}