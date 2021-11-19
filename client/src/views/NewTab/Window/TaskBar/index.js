import React, { Component } from 'react'
import { connect } from 'react-redux';
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
  active: (payload) => {
    return {
      type: "apps/switch",
      payload
    }
  }
})
export default class TaskBar extends Component {
  render() {
    return (
      <React.Fragment>
        <div className="task-list">
          {
            this.props.apps.list.map((item, index) => {
              if (item.status !== "CLOSED") {
                return (
                  <div
                    className={index === 0 ? "task-item active-task" : "task-item"}
                    style={{ order: item.order }} onClick={
                      this.props.active.bind(this, {
                        name: item.name,
                        status: "opened"
                      })
                    }>
                    <item.icon style={iconStyle}></item.icon>
                    <div className="icon">

                    </div>
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
