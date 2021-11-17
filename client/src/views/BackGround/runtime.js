import axios from 'axios';

/**
 * @author guyver
 * @date 2021/11/15 16:16
 * @description 添加请求头
 */
chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
  if (details.initiator.match(/^chrome\-extension\:\/\//)) {
    return {
      requestHeaders: details.requestHeaders.reduce((newHeaders, header) => {
        if (/^z\-/.test(header.name)) {
          const newHeaderName = /^z\-(.*?)$/.exec(header.name)[1];
          newHeaders = newHeaders.filter(item => item.name !== newHeaderName);
          newHeaders.push({
            name: newHeaderName,
            value: header.value
          })
        }
        return newHeaders;
      }, [])
    };
  }
}, { "urls": ["<all_urls>"] }, ["requestHeaders", "blocking", "extraHeaders"]);

/**
 * @author guyver
 * @date 2021/11/15 17:30
 * @description 代理网络请求
 */
chrome.runtime.onConnect.addListener(function (connent) {
  connent.onMessage.addListener(function (data) {
    axios(data.httpOptions).then(res => {
      connent.postMessage(Object.assign(data, {
        isSuccess: true,
        data: res
      }))
    }).catch(err => {
      connent.postMessage(Object.assign(data, {
        isSuccess: false,
        data: err
      }))
    })
  });
});