export default class FilteredList {

  constructor(array, filterText) {
    this.all = array;
    this.filtered = array;
    this.filterText = filterText || "";
    this.exactMatch = false;
  };

  setFilter = function (str) {
    if (str.length > this.filterText && str.lastIndexOf(this.filterText, 0) === 0)
      var matches = this.filtered;
    else
      var matches = this.all;

    this.filterText = str;
    matches = this.filterCompletions(matches, this.filterText);
    matches = matches.sort(function (a, b) {
      return b.exactMatch - a.exactMatch || b.$score - a.$score
        || (a.caption || a.value).localeCompare(b.caption || b.value);
    });

    // make unique
    var prev = null;
    matches = matches.filter(function (item) {
      var caption = item.snippet || item.caption || item.value;
      if (caption === prev) return false;
      prev = caption;
      return true;
    });

    this.filtered = matches;
  };

  filterCompletions = function (items, needle) {
    var results = [];
    var upper = needle.toUpperCase();
    var lower = needle.toLowerCase();
    loop: for (var i = 0, item; item = items[i]; i++) {
      var caption = item.caption || item.value || item.snippet;
      if (!caption) continue;
      var lastIndex = -1;
      var matchMask = 0;
      var penalty = 0;
      var index, distance;

      if (this.exactMatch) {
        if (needle !== caption.substr(0, needle.length))
          continue loop;
      } else {
        /**
         * It is for situation then, for example, we find some like 'tab' in item.value="Check the table"
         * and want to see "Check the TABle" but see "Check The tABle".
         */
        var fullMatchIndex = caption.toLowerCase().indexOf(lower);
        if (fullMatchIndex > -1) {
          penalty = fullMatchIndex;
        } else {
          // caption char iteration is faster in Chrome but slower in Firefox, so lets use indexOf
          for (var j = 0; j < needle.length; j++) {
            // TODO add penalty on case mismatch
            var i1 = caption.indexOf(lower[j], lastIndex + 1);
            var i2 = caption.indexOf(upper[j], lastIndex + 1);
            index = (i1 >= 0) ? ((i2 < 0 || i1 < i2) ? i1 : i2) : i2;
            if (index < 0)
              continue loop;
            distance = index - lastIndex - 1;
            if (distance > 0) {
              // first char mismatch should be more sensitive
              if (lastIndex === -1)
                penalty += 10;
              penalty += distance;
              matchMask = matchMask | (1 << j);
            }
            lastIndex = index;
          }
        }
      }
      item.matchMask = matchMask;
      item.exactMatch = penalty ? 0 : 1;
      item.$score = (item.score || 0) - penalty;
      results.push(item);
    }
    return results;
  };
}
