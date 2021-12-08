import React, { Component } from 'react';
import { Button } from 'antd';
import { PlusOutlined, CloseOutlined, FormOutlined, SnippetsOutlined, CodeOutlined } from '@ant-design/icons';
import CssInject from './CssInject';
import JsInject from './JsInject';
import NoteBook from './NoteBook';
import "./index.less";

export default class App extends Component {

  state = {
    showList: false,
    active: ""
  }

  constructor(props) {
    super(props);
  }

  toggle = () => {
    this.setState({
      showList: !this.state.showList
    })
  }

  toggleWindow = ({ currentTarget }) => {
    const active = currentTarget.dataset.dialog;
    if (this.state.active === active) {
      this.setState({ active: "" });
    } else {
      this.setState({ active });
    }
  }

  close = () => {
    this.setState({
      active: ""
    })
  }

  render() {
    const showList = this.state.showList;
    const active = this.state.active;

    const toolbar = (
      <div className="toolbar">
        <Button
          className="fadeInUp-3"
          data-dialog="css"
          onClick={this.toggleWindow}
          type="primary"
          shape="circle"
          size="large"
          icon={<FormOutlined />}
        ></Button>
        <Button
          className="fadeInUp-2"
          data-dialog="js"
          onClick={this.toggleWindow}
          type="primary"
          shape="circle"
          size="large"
          icon={<CodeOutlined />}
        ></Button>
        <Button
          className="fadeInUp-1"
          data-dialog="note"
          onClick={this.toggleWindow}
          type="primary"
          shape="circle"
          size="large"
          icon={<SnippetsOutlined />}
        ></Button>
      </div>
    )

    const appMain = (
      <div className={"app-main" +
        {
          "css": " app-main-css",
          "js": " app-main-js",
          "note": " app-main-note"
        }[active]
      }>
        {/* <div className="close" onClick={this.close}>
          <Button
            type="primary"
            shape="circle"
            size="small"
            danger
            icon={<CloseOutlined />}
          ></Button>
        </div> */}
        {active === "css" ? <CssInject></CssInject> : ""}
        {active === "js" ? <JsInject></JsInject> : ""}
        {active === "note" ? <NoteBook></NoteBook> : ""}
      </div>
    )

    return (
      <React.Fragment>
        {showList && active ? appMain : ''}
        <div className="tool">
          {showList ? toolbar : ''}
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={
              showList
                ? <CloseOutlined />
                : <PlusOutlined />
            }
            onClick={this.toggle}
          />
        </div>
      </React.Fragment>
    )
  }
}