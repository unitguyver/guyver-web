const stopPropagation = function () {
  this.propagationStopped = true;
};

const preventDefault = function () {
  this.defaultPrevented = true;
};

export default function EventEmitter(Sub) {

  EventEmitterUtils.call(Sub.prototype);
  return Sub;
}


const EventEmitterUtils = function () {

  this._emit =
    this._dispatchEvent = function (eventName, e) {
      this._eventRegistry || (this._eventRegistry = {});
      this._defaultHandlers || (this._defaultHandlers = {});

      var listeners = this._eventRegistry[eventName] || [];
      var defaultHandler = this._defaultHandlers[eventName];
      if (!listeners.length && !defaultHandler)
        return;

      if (typeof e != "object" || !e)
        e = {};

      if (!e.type)
        e.type = eventName;
      if (!e.stopPropagation)
        e.stopPropagation = stopPropagation;
      if (!e.preventDefault)
        e.preventDefault = preventDefault;

      listeners = listeners.slice();
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](e, this);
        if (e.propagationStopped)
          break;
      }

      if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e, this);
    };

  this._signal = function (eventName, e) {
    var listeners = (this._eventRegistry || {})[eventName];
    if (!listeners)
      return;
    listeners = listeners.slice();
    for (var i = 0; i < listeners.length; i++)
      listeners[i](e, this);
  };

  this.once = function (eventName, callback) {
    var _self = this;
    this.on(eventName, function newCallback() {
      _self.off(eventName, newCallback);
      callback.apply(null, arguments);
    });
    if (!callback) {
      /*global Promise*/
      return new Promise(function (resolve) {
        callback = resolve;
      });
    }
  };

  this.setDefaultHandler = function (eventName, callback) {
    var handlers = this._defaultHandlers;
    if (!handlers)
      handlers = this._defaultHandlers = { _disabled_: {} };

    if (handlers[eventName]) {
      var old = handlers[eventName];
      var disabled = handlers._disabled_[eventName];
      if (!disabled)
        handlers._disabled_[eventName] = disabled = [];
      disabled.push(old);
      var i = disabled.indexOf(callback);
      if (i != -1)
        disabled.splice(i, 1);
    }
    handlers[eventName] = callback;
  };

  this.removeDefaultHandler = function (eventName, callback) {
    var handlers = this._defaultHandlers;
    if (!handlers)
      return;
    var disabled = handlers._disabled_[eventName];

    if (handlers[eventName] == callback) {
      if (disabled)
        this.setDefaultHandler(eventName, disabled.pop());
    } else if (disabled) {
      var i = disabled.indexOf(callback);
      if (i != -1)
        disabled.splice(i, 1);
    }
  };

  this.on =
    this.addEventListener = function (eventName, callback, capturing) {
      this._eventRegistry = this._eventRegistry || {};

      var listeners = this._eventRegistry[eventName];
      if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

      if (listeners.indexOf(callback) == -1)
        listeners[capturing ? "unshift" : "push"](callback);
      return callback;
    };

  this.off =
    this.removeListener =
    this.removeEventListener = function (eventName, callback) {
      this._eventRegistry = this._eventRegistry || {};

      var listeners = this._eventRegistry[eventName];
      if (!listeners)
        return;

      var index = listeners.indexOf(callback);
      if (index !== -1)
        listeners.splice(index, 1);
    };

  this.removeAllListeners = function (eventName) {
    if (!eventName) this._eventRegistry = this._defaultHandlers = undefined;
    if (this._eventRegistry) this._eventRegistry[eventName] = undefined;
    if (this._defaultHandlers) this._defaultHandlers[eventName] = undefined;
  };
}
