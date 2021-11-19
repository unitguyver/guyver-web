import { createStore } from 'redux';
import { combineReducers } from 'redux';

const modulesFiles = require.context('./modules', true, /\.js$/)

const reducers = modulesFiles.keys().reduce((reducers, modulePath) => {
  const moduleName = /^\.\/(.*?)\.js/.exec(modulePath)[1];

  const value = modulesFiles(modulePath)
  const data = value.default;

  reducers[moduleName] = function (state, action) {
    if (/^@@redux/.test(action.type)) {
      return data.state;
    } else {
      const actionModuleName = /^(.*?)\/\w+$/.exec(action.type)[1];
      const actionReducer = /^\w+\/(.*?)$/.exec(action.type)[1];
      if (actionModuleName === moduleName) {
        if (data.reducers.hasOwnProperty(actionReducer)) {
          data.reducers[actionReducer](state, action.payload);
        }
      }
    }
    return {
      ...state
    };
  };

  return reducers;
}, {})

const store = createStore(combineReducers(reducers));

export default store;