import EventEmitter from "./lib/event/EventEmitter";

@EventEmitter
class Sender {

  callback = function (data, callbackId) {
    postMessage({
      type: "call",
      id: callbackId,
      data: data
    });
  };

  emit = function (name, data) {
    postMessage({
      type: "event",
      name: name,
      data: data
    });
  };
};

const sender = new Sender();

window.onmessage = function (e) {
  const msg = e.data;

  console.log(msg)
  if (msg.event && sender) {
    sender._signal(msg.event, msg.data);
  }
};

window.onerror = function (message, file, line, col, err) {
  postMessage({
    type: "error", data: {
      message: message,
      data: err.data,
      file: file,
      line: line,
      col: col,
      stack: err.stack
    }
  });
};
