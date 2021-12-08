import React, { Component } from 'react'
import { connect } from 'react-redux';
import { WindowsOutlined, SearchOutlined } from "@ant-design/icons";
import "./index.less";

const iconStyle = {
  fontSize: "24px",
  color: "#ffffff"
}

@connect((state) => {
  return {
    apps: state.apps
  }
}, {
  switch: (payload) => {
    return {
      type: "apps/switch",
      payload
    }
  }
})
export default class TaskBar extends Component {

  switch(name) {
    this.props.apps.list.forEach(app => {
      if (app.name === name) {
        this.props.switch({
          name,
          status: app.status === "MIN" ? "OPENED" : "MIN"
        })
      }
    })
  }

  render() {
    return (
      <React.Fragment>
        <div className="logo">
          <WindowsOutlined style={iconStyle} />
        </div>
        <div className="search">
          <div className="search-icon">
            <SearchOutlined style={{ fontSize: "16px", color: "#000000" }} />
          </div>
          <div className="input-area">
            <input type="text" placeholder="输入你要搜索的内容" />
          </div>
        </div>
        <div className="task-list">
          {
            this.props.apps.list.map((item, index) => {
              if (item.status !== "CLOSED") {
                return (
                  <div
                    key={index}
                    className={index === 0 ? "task-item active-task" : "task-item"}
                    style={{ order: item.order }}
                    onClick={this.switch.bind(this, item.name)}
                  >
                    <item.icon style={iconStyle}></item.icon>
                  </div>
                )
              }
            })
          }
        </div>
      </React.Fragment>
    )
  }
}
