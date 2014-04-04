var clone = require('clone');

/**
 * Extend an object with defaults. (Transplanted from Cantina 2).
 *
 * @param [deep] {Boolean} If true, performs a deep (recursive) merge.
 * @param obj {Object} The object to extend.
 * @param defaults {Object} An object containing the defaults.
 */
module.exports = function _defaults (deep, obj, defaults) {
  var copy;

  // Shallow.
  if (deep !== true) {
    defaults = obj;
    obj = deep;
    deep = false;
  }

  // Support arbitrary number of defaults objects.
  if (arguments.length > 2) {
    var mixins = Array.prototype.slice.call(arguments, (deep === true) ? 2 : 1);
    if (mixins.length > 1) {
      mixins.forEach(function (mixin) {
        if (deep === true) {
          _defaults(true, obj, mixin);
        }
        else {
          _defaults(obj, mixin);
        }
      });
      return obj;
    }
  }

  // Clone the defaults so we dont transfer any properties by reference.
  if (deep === true) {
    copy = clone(defaults);
  }
  else {
    copy = defaults;
  }

  Object.keys(copy).forEach(function(key) {
    // Only dive into object literals.
    if (deep && isObjectLiteral(obj[key]) && isObjectLiteral(copy[key])) {
      _defaults(deep, obj[key], copy[key]);
    }
    else if (!obj.hasOwnProperty(key)) {
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
};

