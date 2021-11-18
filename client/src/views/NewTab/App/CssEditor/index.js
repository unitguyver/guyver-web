import React from "react";
import { Application, ApplicationConnect } from "@/components/Application";
import { MinusOutlined, SwitcherOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';
import "./index.less";

@ApplicationConnect
export default class CssEditor extends Application {
  constructor(props) {
    super(props);
    this.APP_NAME = "CssEditor";
  }
  render() {
    return (
      <div id="css-editor" ref={this.bindWindow}>
        <div class="header" ref={this.bindDrag}>
          <div className="logo">LOGO</div>
          <div className="control">
            <div className="control-item">
              <MinusOutlined onClick={this.switch.bind(this, "min")} />
            </div>
            <div className="control-item">
              {
                this.APP_STATUS === "MIN"
                  ? <BorderOutlined onClick={this.switch.bind(this, "max")} />
                  : <SwitcherOutlined onClick={this.switch.bind(this, "small")} />
              }
            </div>
            <div className="control-item">
              <CloseOutlined onClick={this.switch.bind(this, "closed")} />
            </div>
          </div>
        </div>
        <div class="content">Content</div>
      </div>
    )
  }
}
