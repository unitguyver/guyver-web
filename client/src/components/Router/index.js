import React, { Component } from 'react';
import Loading from './Loading';

export default class Router extends Component {
  routes = [];
  $route = null;

  constructor(props) {
    super(props);
    this.routes = props.routes;
    this.$route = this.routes[0];
  }

  view() {
    if (this.$route) {
      console.log("---")
      const Content = this.$route.component;
      if (this.$route.layout) {
        const Layout = this.$route.layout;
        return (
          <Layout>
            <Content></Content>
          </Layout>
        )
      } else {
        return <Content></Content>;
      }
    } else {
      return <Loading></Loading>;
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.view()}
      </React.Fragment>
    )
  }
}
