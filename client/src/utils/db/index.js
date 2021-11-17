export default {
  get(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ [key]: '' }, function (data) {
        resolve(data[key]);
      });
    })
  },
  set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, resolve);
    })
  }
}