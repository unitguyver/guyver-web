
export function isLine(cm, line) {
  return line >= cm.firstLine() && line <= cm.lastLine();
}

export function isLowerCase(k) {
  return (/^[a-z]$/).test(k);
}

export function isMatchableSymbol(k) {
  return '()[]{}'.indexOf(k) != -1;
}

export function isNumber(k) {
  return numberRegex.test(k);
}

export function isUpperCase(k) {
  return upperCaseChars.test(k);
}

export function isWhiteSpaceString(k) {
  return (/^\s*$/).test(k);
}

export function isEndOfSentenceSymbol(k) {
  return '.?!'.indexOf(k) != -1;
}

export function trim(s) {
  if (s.trim) {
    return s.trim();
  }
  return s.replace(/^\s+|\s+$/g, '');
}
export function escapeRegex(s) {
  return s.replace(/([.?*+$\[\]\/\\(){}|\-])/g, '\\$1');
}

export function inArray(val, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == val) {
      return true;
    }
  }
  return false;
}

const makeKeyRange = function (start, size) {
  var keys = [];
  for (var i = start; i < start + size; i++) {
    keys.push(String.fromCharCode(i));
  }
  return keys;
}

export function makeValidKeys(vailds) {
  const upperCaseAlphabet = makeKeyRange(65, 26);
  const lowerCaseAlphabet = makeKeyRange(97, 26);
  const numbers = makeKeyRange(48, 10);
  return [].concat(upperCaseAlphabet, lowerCaseAlphabet, numbers, vailds)
}