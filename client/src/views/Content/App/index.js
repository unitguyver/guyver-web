import React, { Component } from 'react';
import { PlusOutlined, CloseOutlined, FormOutlined, SnippetsOutlined, CodeOutlined } from '@ant-design/icons';

export default class App extends Component {

  state = 'off';

  constructor(props) {
    super(props);
  }

  render() {
    const toolbar = (
      <div className="toolbar">
        <div className="icon">
          <FormOutlined />
        </div>
        <div className="icon">
          <CodeOutlined />
        </div>
        <div className="icon">
          <SnippetsOutlined />
        </div>
      </div>
    )

    const appMain = (
      <div className="app-main"></div>
    )

    return (
      <React.Fragment>
        <div className="tool">
          <div className="switch">
            {
              this.state === 'on'
                ? <CloseOutlined />
                : this.state === 'off'
                  ? <PlusOutlined />
                  : ''
            }
          </div>
          {this.state === 'on' ? toolbar : ''}
        </div>
        {this.state === 'on' ? appMain : ''}
      </React.Fragment>
    )
  }
}