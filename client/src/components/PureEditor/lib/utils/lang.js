const lang = {};

lang.last = function (a) {
    return a[a.length - 1];
};

lang.stringReverse = function (string) {
    return string.split("").reverse().join("");
};

lang.stringRepeat = function (string, count) {
    var result = '';
    while (count > 0) {
        if (count & 1)
            result += string;

        if (count >>= 1)
            string += string;
    }
    return result;
};

var trimBeginRegexp = /^\s\s*/;
var trimEndRegexp = /\s\s*$/;

lang.stringTrimLeft = function (string) {
    return string.replace(trimBeginRegexp, '');
};

lang.stringTrimRight = function (string) {
    return string.replace(trimEndRegexp, '');
};

lang.copyObject = function (obj) {
    var copy = {};
    for (var key in obj) {
        copy[key] = obj[key];
    }
    return copy;
};

lang.copyArray = function (array) {
    var copy = [];
    for (var i = 0, l = array.length; i < l; i++) {
        if (array[i] && typeof array[i] == "object")
            copy[i] = this.copyObject(array[i]);
        else
            copy[i] = array[i];
    }
    return copy;
};

lang.deepCopy = function deepCopy(obj) {
    if (typeof obj !== "object" || !obj)
        return obj;
    var copy;
    if (Array.isArray(obj)) {
        copy = [];
        for (var key = 0; key < obj.length; key++) {
            copy[key] = deepCopy(obj[key]);
        }
        return copy;
    }
    if (Object.prototype.toString.call(obj) !== "[object Object]")
        return obj;

    copy = {};
    for (var key in obj)
        copy[key] = deepCopy(obj[key]);
    return copy;
};

lang.arrayToMap = function (arr) {
    var map = {};
    for (var i = 0; i < arr.length; i++) {
        map[arr[i]] = 1;
    }
    return map;

};

lang.createMap = function (props) {
    var map = Object.create(null);
    for (var i in props) {
        map[i] = props[i];
    }
    return map;
};

/*
 * splice out of 'array' anything that === 'value'
 */
lang.arrayRemove = function (array, value) {
    for (var i = 0; i <= array.length; i++) {
        if (value === array[i]) {
            array.splice(i, 1);
        }
    }
};

lang.escapeRegExp = function (str) {
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
};

lang.escapeHTML = function (str) {
    return ("" + str).replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
};

lang.getMatchOffsets = function (string, regExp) {
    var matches = [];

    string.replace(regExp, function (str) {
        matches.push({
            offset: arguments[arguments.length - 2],
            length: str.length
        });
    });

    return matches;
};

/* deprecated */
lang.deferredCall = function (fcn) {
    var timer = null;
    var callback = function () {
        timer = null;
        fcn();
    };

    var deferred = function (timeout) {
        deferred.cancel();
        timer = setTimeout(callback, timeout || 0);
        return deferred;
    };

    deferred.schedule = deferred;

    deferred.call = function () {
        this.cancel();
        fcn();
        return deferred;
    };

    deferred.cancel = function () {
        clearTimeout(timer);
        timer = null;
        return deferred;
    };

    deferred.isPending = function () {
        return timer;
    };

    return deferred;
};


lang.delayedCall = function (fcn, defaultTimeout) {
    var timer = null;
    var callback = function () {
        timer = null;
        fcn();
    };

    var _self = function (timeout) {
        if (timer == null)
            timer = setTimeout(callback, timeout || defaultTimeout);
    };

    _self.delay = function (timeout) {
        timer && clearTimeout(timer);
        timer = setTimeout(callback, timeout || defaultTimeout);
    };
    _self.schedule = _self;

    _self.call = function () {
        this.cancel();
        fcn();
    };

    _self.cancel = function () {
        timer && clearTimeout(timer);
        timer = null;
    };

    _self.isPending = function () {
        return timer;
    };

    return _self;
};

export default lang;