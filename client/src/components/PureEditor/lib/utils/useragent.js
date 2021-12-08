let useragent = {};

useragent.OS = {
    LINUX: "LINUX",
    MAC: "MAC",
    WINDOWS: "WINDOWS"
};

/*
 * Return an useragent.OS constant
 */
useragent.getOS = function () {
    if (useragent.isMac) {
        return useragent.OS.MAC;
    } else if (useragent.isLinux) {
        return useragent.OS.LINUX;
    } else {
        return useragent.OS.WINDOWS;
    }
};

// this can be called in non browser environments (e.g. from ace/requirejs/text)
var _navigator = typeof navigator == "object" ? navigator : {};

var os = (/mac|win|linux/i.exec(_navigator.platform) || ["other"])[0].toLowerCase();
var ua = _navigator.userAgent || "";
var appName = _navigator.appName || "";

// Is the user using a browser that identifies itself as Windows
useragent.isWin = (os == "win");

// Is the user using a browser that identifies itself as Mac OS
useragent.isMac = (os == "mac");

// Is the user using a browser that identifies itself as Linux
useragent.isLinux = (os == "linux");

// Windows Store JavaScript apps (aka Metro apps written in HTML5 and JavaScript) do not use the "Microsoft Internet Explorer" string in their user agent, but "MSAppHost" instead.
useragent.isIE =
    (appName == "Microsoft Internet Explorer" || appName.indexOf("MSAppHost") >= 0)
        ? parseFloat((ua.match(/(?:MSIE |Trident\/[0-9]+[\.0-9]+;.*rv:)([0-9]+[\.0-9]+)/) || [])[1])
        : parseFloat((ua.match(/(?:Trident\/[0-9]+[\.0-9]+;.*rv:)([0-9]+[\.0-9]+)/) || [])[1]); // for ie

useragent.isOldIE = useragent.isIE && useragent.isIE < 9;

// Is this Firefox or related?
useragent.isGecko = useragent.isMozilla = ua.match(/ Gecko\/\d+/);

// Is this Opera 
useragent.isOpera = typeof opera == "object" && Object.prototype.toString.call(window.opera) == "[object Opera]";

// Is the user using a browser that identifies itself as WebKit 
useragent.isWebKit = parseFloat(ua.split("WebKit/")[1]) || undefined;

useragent.isChrome = parseFloat(ua.split(" Chrome/")[1]) || undefined;

useragent.isEdge = parseFloat(ua.split(" Edge/")[1]) || undefined;

useragent.isAIR = ua.indexOf("AdobeAIR") >= 0;

useragent.isAndroid = ua.indexOf("Android") >= 0;

useragent.isChromeOS = ua.indexOf(" CrOS ") >= 0;

useragent.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

if (useragent.isIOS) useragent.isMac = true;

useragent.isMobile = useragent.isIOS || useragent.isAndroid;

export default useragent;