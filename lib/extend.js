var clone = require('clone');

/**
 * Extend an object with source[s].
 *
 * @param [deep] {Boolean} If true, performs a deep (recursive) merge.
 * @param obj {Object} The object to extend.
 * @param source {Object} An object containing the source.
 */
module.exports = function _extend (deep, obj, source) {
  var copy;

  // Shallow.
  if (deep !== true) {
    source = obj;
    obj = deep;
    deep = false;
  }

  // Support arbitrary number of source objects.
  if (arguments.length > 2) {
    var sources = Array.prototype.slice.call(arguments, (deep === true) ? 2 : 1);
    if (sources.length > 1) {
      sources.forEach(function (source) {
        if (deep === true) {
          _extend(true, obj, source);
        }
        else {
          _extend(obj, source);
        }
      });
      return obj;
    }
  }

  // Clone the source so we dont transfer any properties by reference.
  if (deep === true) {
    copy = clone(source);
  }
  else {
    copy = source;
  }

  Object.keys(copy).forEach(function(key) {
    // Only dive into object literals.
    if (deep && isObjectLiteral(obj[key]) && isObjectLiteral(copy[key])) {
      _extend(deep, obj[key], copy[key]);
    }
    else {
      obj[key] = copy[key];
    }
  });

  return obj;
};

/**
 * Check if an object is an object literal. (Transplanted from Cantina 2).
 */
function isObjectLiteral (obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}
