import React, { Component } from 'react';
import DeskTop from './DeskTop';
import TaskBar from './TaskBar';
import AppMain from './AppMain';
import './index.less';

export default class Window extends Component {
  constructor(props) {
    super(props);
    this.apps = props.apps;
  }
  render() {
    return (
      <div id="window">
        <div id="desktop">
          <DeskTop />
        </div>
        <div id="taskbar">
          <TaskBar />
        </div>
        <div id="appmain">
          <AppMain apps={this.apps} />
        </div>
      </div>
    )
  }
}
