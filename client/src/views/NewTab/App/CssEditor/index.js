import React from "react";
import { Application, ApplicationConnect } from "@/components/Application";
import { MinusOutlined, SwitcherOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';
import "./index.less";

@ApplicationConnect
export default class CssEditor extends Application {
  constructor(props) {
    super(props);
    this.APP_NAME = "CssEditor";
    this.props.APP_NAME = "CssEditor";
  }
  render() {
    const status = this.props.status[this.APP_NAME];
    return (
      <div id="css-editor" ref={this.bindWindow}>
        <div class="header" ref={this.bindDrag}>
          <div className="logo">LOGO</div>
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
        <div class="content">Content</div>
      </div>
    )
  }
}
