import React, { Component } from 'react';
import { FormOutlined, SnippetsOutlined, CodeOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import Window from '../Window';
import CssEditor from './CssEditor';
import JsEditor from './JsEditor';
import NoteBook from './NoteBook';

@connect(undefined, {
  initDeskTop(payload) {
    return {
      type: "desktop/init",
      payload
    }
  }
})
export default class App extends Component {
  constructor(props) {
    super(props);
    this.props.initDeskTop([
      {
        name: "CssEditor",
        text: "css注入",
        icon: FormOutlined
      },
      {
        name: "JsEditor",
        text: "js注入",
        icon: CodeOutlined
      },
      {
        name: "CssEditor",
        text: "笔记本",
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
