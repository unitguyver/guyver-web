import React, { Component } from 'react';
import { FormOutlined, SnippetsOutlined, CodeOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import Window from '../Window';
import CssEditor from './CssEditor';
import JsEditor from './JsEditor';
import NoteBook from './NoteBook';

@connect(undefined, {
  initApps(payload) {
    return {
      type: "apps/init",
      payload
    }
  }
})
export default class App extends Component {
  constructor(props) {
    super(props);
    this.props.initApps([
      {
        order: 1,
        name: "CssEditor",
        text: "css注入",
        status: "CLOSED",
        icon: FormOutlined
      },
      {
        order: 2,
        name: "JsEditor",
        text: "js注入",
        status: "CLOSED",
        icon: CodeOutlined
      },
      {
        order: 3,
        name: "NoteBook",
        text: "笔记本",
        status: "CLOSED",
        icon: SnippetsOutlined
      }
    ])
  }
  render() {
    return (
      <Window>
        <CssEditor></CssEditor>
        <JsEditor></JsEditor>
        <NoteBook></NoteBook>
      </Window>
    )
  }
}
