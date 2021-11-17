import React, { Component } from 'react';

const APP_STATUS_STYLE = {
  "OPENED": {
    display: "flex",
    position: "absoulate",
    width: "100%",
    height: "100%",
    left: "0",
    top: "0",
    ocerflow: "hidden"
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
  Object.entries(APP_STATUS_STYLE[status]).forEach(([key, value]) => {
    el.style[key] = value;
  })
}

export default class Application extends Component {

  APP_NAME = undefined;
  APP_STATUS = "CLOSED";

  constructor(props) {
    super(props);
    console.log(this.props)
  }

  render() { }

  /**
   * @author guyver
   * @date 2021/11/16 18:15
   * @description 打开
   */
  open = () => {
    this.APP_STATUS = "OPENED";
    add_style(this.APP_WINDOW, "OPENED");
  }

  /**
   * @author guyver
   * @date 2021/11/16 18:15
   * @description 最小化
   */
  minimize = () => {
    this.APP_STATUS = "MIN";
    add_style(this.APP_WINDOW, "MIN");
  }

  /**
   * @author guyver
   * @date 2021/11/16 18:16
   * @description 最大化
   */
  maximize = () => {
    this.APP_STATUS = "MAX";
    add_style(this.APP_WINDOW, "MAX");
  }

  /**
   * @author guyver
   * @date 2021/11/16 18:15
   * @description 缩小
   */
  narrow = () => {
    this.APP_STATUS = "SMALL";
    add_style(this.APP_WINDOW, "SMALL");
  }

  /**
   * @author guyver
   * @date 2021/11/16 18:18
   * @description 关闭
   */
  close = () => {
    this.APP_STATUS = "CLOSED";
    add_style(this.APP_WINDOW, "CLOSED");
  }

  bindDrag = (el) => {
    console.log(el);
  }

  bindWindow = (el) => {
    this.APP_WINDOW = el;
    this.open();
  }
}
