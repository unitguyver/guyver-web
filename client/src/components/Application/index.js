import React, { Component } from 'react';
import { connect } from "react-redux";
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
    width: "500px",
    height: "300px",
    left: "100px",
    top: "100px"
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


const add_style = function (el, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    el.style[key] = value;
  })
}

const ApplicationConnect = connect((state) => {
  return {
    status: state.apps.list.reduce((tempObj, app) => {
      tempObj[app.name] = app.status;
      return tempObj;
    }, {})
  }
}, {
  switch(payload) {
    return {
      type: "apps/switch",
      payload
    }
  }
})

class Application extends Component {

  APP_NAME = undefined;
  moving = false;
  whenMove = undefined;

  constructor(props) {
    super(props);
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:16
   * @description 组件数据更新
   */
  componentDidUpdate() {
    add_style(this.APP_WINDOW, APP_STATUS_STYLE[this.props.status[this.APP_NAME]]);
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:17
   * @description 绑定拖拽功能
   */
  bindDrag = (el) => {
    el.addEventListener("mousedown", (event) => {
      console.log(event)
      if (event.target === el) {
        this.moving = true;
        this.whenMove = {
          mouseX: event.x,
          mouseY: event.y
        }
      }

    });

    el.addEventListener("mousemove", (event) => {
      if (this.moving) {
        if (!this.whenMove.x) {
          if (this.props.status[this.APP_NAME] === "SMALL") {
            this.whenMove = Object.assign(this.whenMove, {
              x: this.APP_WINDOW.offsetLeft,
              y: this.APP_WINDOW.offsetTop
            })
          } else {
            this.switch("small");
            this.whenMove = Object.assign(this.whenMove, {
              x: event.x - Math.floor(event.offsetX * 500 / el.clientWidth),
              y: event.y - event.offsetY
            });
            add_style(this.APP_WINDOW, {
              left: this.whenMove.x + "px",
              top: this.whenMove.y + "px"
            });
            return;
          }
        }
        const left = this.whenMove.x + event.x - this.whenMove.mouseX;
        const top = this.whenMove.y + event.y - this.whenMove.mouseY;
        add_style(this.APP_WINDOW, {
          left: left + "px",
          top: top + "px"
        });
      }
    });

    el.addEventListener("mouseup", (event) => {
      this.moving = false;
    });

    el.addEventListener("mouseleave", (event) => {
      this.moving = false;
    })
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:17
   * @description 绑定窗口
   */
  bindWindow = (el) => {
    this.APP_WINDOW = el;
  }

  /**
   * @author guyver
   * @date 2021/11/19 10:06
   * @description 切换状态
   */
  switch(status) {
    status = status.toUpperCase();
    add_style(this.APP_WINDOW, APP_STATUS_STYLE[status]);
    this.props.switch({
      name: this.APP_NAME,
      status
    })
  }
}

export {
  Application,
  ApplicationConnect
}