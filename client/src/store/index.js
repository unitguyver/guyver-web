import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux';

const modulesFiles = require.context('./modules', true, /\.js$/)

const { reducers, actions } = modulesFiles.keys().reduce(({ reducers, actions }, modulePath) => {
  const moduleName = modulePath.replace(/^\.\/(.*)\.\w+$/, '$1')
  const value = modulesFiles(modulePath)
  const data = value.default;
  return {
    reducers: Object.assign(reducers, data.state),
    actions: Object.assign(actions, data.actions || {})
  }
}, { reducers: {}, actions: {} })

console.log(reducers)

const store = createStore(combineReducers(reducers))

console.log(store)

const _connect = connect(
  (state) => {
    console.log(state);
    return state
  },
  (dispatch) => {
    return {}
  }
);

export {
  store as store,
  _connect as connect
}