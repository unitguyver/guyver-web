import headers from "./headers.json";

class Connent {

  httpConnentionId = 0;
  httpThreads = {};

  constructor(name) {
    this.$conn = chrome.runtime.connect({ name });
    this.$conn.onMessage.addListener(this.onMessage.bind(this));
  }

  onMessage(response) {
    if (this.httpThreads[response.id]) {
      const status = response.data.status;
      if (response.isSuccess && status === 200) {
        this.httpThreads[response.id].resolve(response.data.data);
      } else {
        this.httpThreads[response.id].reject(response.data.data);
      }
      delete this.httpThreads[response.id];
    }
  }

  $http(opts) {
    const httpOptions = {
      headers: opts.header || {},
      url: opts.url,
      method: opts.method.toUpperCase(),
      data: opts.data
    }

    if (opts.mobile) {
      httpOptions.headers["z-User-Agent"] = headers["User-Agent"]["mobile"];
    };
    return new Promise((resolve, reject) => {
      const id = ++this.httpConnentionId;
      this.$conn.postMessage({
        id,
        httpOptions
      });
      this.httpThreads[id] = { resolve, reject };
    });
  }
}

export default Connent