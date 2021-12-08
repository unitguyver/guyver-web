import React from "react";
import { Application, ApplicationConnect } from "@/components/Application";
import { MinusOutlined, SwitcherOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';
import PureEditor from "@/components/PureEditor";
import "./index.less";
let editor;

@ApplicationConnect
export default class CssEditor extends Application {

  constructor(props) {
    super(props);
    this.APP_NAME = this.props.name;
  }

  render() {
    const status = this.props.status;
    return (
      <div id="js-editor" ref={this.bindWindow}>
        <div className="header" ref={this.bindDrag}>
          <div className="logo">{this.APP_NAME}</div>
          <div className="control">
            <div className="control-item" onClick={this.switch.bind(this, "min")}>
              <MinusOutlined />
            </div>
            {
              status === "SMALL"
                ? <div className="control-item" onClick={this.switch.bind(this, "max")}>
                  <BorderOutlined />
                </div>
                : <div className="control-item" onClick={this.switch.bind(this, "small")}>
                  <SwitcherOutlined />
                </div>
            }
            <div className="control-item close" onClick={this.switch.bind(this, "closed")}>
              <CloseOutlined />
            </div>
          </div>
        </div>
        <div className="content">
          <div id="js-editor-container"></div>
        </div>
      </div>
    )
  }

  componentDidMount() {
    editor = new PureEditor(document.getElementById("js-editor-container"), {
      mode: "javascript",
      theme: "night"
    })
  }
}
