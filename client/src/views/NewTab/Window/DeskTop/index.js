import React, { Component } from 'react'
import { connect } from 'react-redux';
import "./index.less";

const iconStyle = {
  fontSize: "72px"
}

@connect((state) => {
  return {
    desktop: state.desktop
  }
}, {
  active: (payload) => {
    return {
      type: "taskbar/active",
      payload
    }
  }
})
export default class DeskTop extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <React.Fragment>
        {
          this.props.desktop.list.map(item => {
            return (
              <div className="app-item" onClick={
                this.props.active.bind(this, {
                  name: item.name,
                  status: "opened"
                })
              }>
                <div className="icon">
                  <item.icon style={iconStyle}></item.icon>
                </div>
                <div className="text">
                  {item.text}
                </div>
              </div>
            )
          })
        }
      </React.Fragment>
    )
  }
}
