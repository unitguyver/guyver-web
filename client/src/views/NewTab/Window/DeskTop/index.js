import React, { Component } from 'react'
import { connect } from 'react-redux';
import "./index.less";

const iconStyle = {
  fontSize: "36px"
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
export default class DeskTop extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <React.Fragment>
        {
          this.props.apps.list.map((item, index) => {
            return (
              <div key={index} className="app-item" style={{ order: item.order }} onClick={
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
