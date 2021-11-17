import React, { Component } from 'react';
import Window from '../Window';
import CssEditor from './CssEditor';
import JsEditor from './JsEditor';
import NoteBook from './NoteBook';

const apps = [
  {
    name: "CssEditor",
    app: CssEditor
  },
  {
    name: "JsEditor",
    app: JsEditor
  },
  {
    name: "NoteBook",
    app: NoteBook
  }
]

export default class App extends Component {
  render() {
    return <Window apps={apps}></Window>
  }
}
