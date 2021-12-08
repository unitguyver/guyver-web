import React, { Component } from 'react';
import { Button } from 'antd';
import { SaveOutlined, FontSizeOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons';
import PureEditor from '@/components/PureEditor';
import "./index.less";

let editor;

export default class CssInject extends Component {

  state = {
    light: true
  }

  constructor(props) {
    super(props);
  }

  toggleTheme = () => {
    if (this.state.light) {
      editor.setTheme("ace/theme/night");
    } else {
      editor.setTheme("ace/theme/dawn")
    }
    this.setState({
      light: !this.state.light
    })
  }

  render() {
    const light = this.state.light;

    return (
      <div className="css-inject-container">
        <div id="css-code-area"></div>
        <div className="css-taskbar">
          <Button
            shape="circle"
            icon={<SaveOutlined />}
          ></Button>
          <Button
            shape="circle"
            icon={<FontSizeOutlined />}
          ></Button>
          <Button
            shape="circle"
            onClick={this.toggleTheme}
            icon={
              light
                ? <BulbFilled />
                : <BulbOutlined />
            }
          ></Button>
        </div>
      </div>
    )
  }

  componentDidMount() {
    editor = new PureEditor("css-code-area", {
      mode: "css",
      theme: "dawn"
    });
  }
}
