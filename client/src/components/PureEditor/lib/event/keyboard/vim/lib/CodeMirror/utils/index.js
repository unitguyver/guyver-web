const utilFiles = require.context('./modules', true, /\.js$/)

const utils = utilFiles.keys().reduce((utils, modulePath) => {
  const util = utilFiles(modulePath).default;
  return Object.assign(utils, util);
}, {});

export default utils;
