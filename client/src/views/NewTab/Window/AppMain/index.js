import React, { Component } from 'react'

export default class AppMain extends Component {
  constructor(props) {
    super(props);
    this.apps = props.apps;
  }

  render() {
    return (
      <React.Fragment>
        {this.apps.map(item => {
          return <item.app></item.app>;
        })}
      </React.Fragment>
    )
  }
}
