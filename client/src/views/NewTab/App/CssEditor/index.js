import React from "react";
import Application from "@/components/Application";
import { MinusOutlined, SwitcherOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';
import { connect } from "@/store";
import "./index.less";

@connect
export default class CssEditor extends Application {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div id="css-editor" ref={this.bindWindow}>
        <div class="header" ref={this.bindDrag}>
          <div className="logo">LOGO</div>
          <div className="control">
            <div className="control-item">
              <MinusOutlined onClick={this.minimize} />
            </div>
            <div className="control-item">
              {
                this.STATUS === "MIN"
                  ? <BorderOutlined onClick={this.maximize} />
                  : <SwitcherOutlined onClick={this.narrow} />
              }
            </div>
            <div className="control-item">
              <CloseOutlined onClick={this.close} />
            </div>
          </div>
        </div>
        <div class="content">Content</div>
      </div>
    )
  }
}
