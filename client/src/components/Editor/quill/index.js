import React, { Component } from 'react';
import Quill from './quill';

export default class QuillEditor extends Component {
  render() {
    return (
      <div id="editor"></div>
    )
  }

  componentDidMount() {
    const editor = new Quill('#editor');
  }
}
