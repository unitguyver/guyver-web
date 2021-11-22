import React, { Component } from 'react';
import { connect } from "react-redux";
import "./index.less";

const ApplicationConnect = connect((state, props) => {
  let zIndex = 0;
  const app = state.apps.list.filter((app, index) => {
    if (app.name === props.name) {
      zIndex = 99 - index;
      return true;
    }
    return app.name === props.name;
  })[0];
  return {
    status: app.status,
    zIndex
  }
}, {
  switch(payload) {
    return {
      type: "apps/switch",
      payload
    }
  },
  active(payload) {
    return {
      type: "apps/active",
      payload
    }
  }
});

class Application extends Component {

  APP_NAME = undefined;
  moving = false;
  whenMove = undefined;
  transformed = undefined;
  size = [];
  site = []

  constructor(props) {
    super(props);
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:16
   * @description 组件数据更新
   */
  componentDidUpdate() {
    this.transform(this.props.status);
  }

  /**
   * @author guyver
   * @date 2021/11/22 14:28
   * @description 修改大小、位置
   */
  transform(status = this.props.status) {
    let styles = {
      zIndex: this.props.zIndex
    };
    switch (status) {
      case "OPENED":
        styles["display"] = "flex"
        this.size = ["100%", "100%"];
        this.site = ["0", "0"];
        break;
      case "CLOSED":
        styles["display"] = "none";
        break;
      case "SMALL":
        if (this.transformed !== status) {
          if (!this.scaling) {
            this.size = ["500px", "300px"];
          }
          if (!this.moving) {
            this.site = ["100px", "100px"];
          }
        }
        break;
      case "MIN":
        this.size = ["0", "0"];
        break;
      case "MAX":
        this.size = ["100%", "100%"];
        this.site = ["0", "0"];
        break;
    }
    this.transformed = status;
    Object.entries(Object.assign(styles, {
      width: this.size[0],
      height: this.size[1],
      left: this.site[0],
      top: this.site[1]
    })).forEach(([key, value]) => {
      this.APP_WINDOW.style[key] = value;
    })
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:17
   * @description 绑定拖拽功能
   */
  bindDrag = (el) => {
    el.addEventListener("mousedown", (event) => {
      if (event.target === el) {
        this.moving = true;
        this.whenMove = {
          mouseX: event.x,
          mouseY: event.y
        }
      }

    });

    window.addEventListener("mousemove", (event) => {
      if (this.moving) {
        if (!this.whenMove.x) {
          if (this.props.status === "SMALL") {
            this.whenMove = Object.assign(this.whenMove, {
              x: this.APP_WINDOW.offsetLeft,
              y: this.APP_WINDOW.offsetTop
            })
          } else {
            this.whenMove = Object.assign(this.whenMove, {
              x: event.x - Math.floor(event.offsetX * 500 / el.clientWidth),
              y: event.y - event.offsetY
            });
            this.site = [
              this.whenMove.x + "px",
              this.whenMove.y + "px"
            ]
            this.switch("small");
            return;
          }
        }
        this.site = [
          this.whenMove.x + event.x - this.whenMove.mouseX + "px",
          this.whenMove.y + event.y - this.whenMove.mouseY + "px"
        ]
        this.transform();
      }
    });

    window.addEventListener("mouseup", (event) => {
      this.moving = false;
    });
  }

  /**
   * @author guyver
   * @date 2021/11/18 16:17
   * @description 绑定窗口
   */
  bindWindow = (el) => {
    this.APP_WINDOW = el;
    el.addEventListener("mousedown", () => {
      this.props.active(this.APP_NAME);
    })
  }

  /**
   * @author guyver
   * @date 2021/11/19 10:06
   * @description 切换状态
   */
  switch(status) {
    status = status.toUpperCase();
    this.transform(status);
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