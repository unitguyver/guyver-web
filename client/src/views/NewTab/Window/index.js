import React, { Component } from 'react';
import DeskTop from './DeskTop';
import TaskBar from './TaskBar';
import './index.less';

export default class Window extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div id="window">
        <div id="desktop">
          <DeskTop />
          <div id="appmain">
            {this.props.children}
          </div>
        </div>
        <div id="taskbar">
          <TaskBar />
        </div>
      </div>
    )
  }
}
