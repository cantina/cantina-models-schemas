var nested = require('nested-objects');

/**
 * Merge the indexes in sources[s] into object.
 *
 * @param prop {String} Property where the indexes are defined.
 * @param obj {Object} The object to modify.
 * @param source {Object} An object containing the source indexes.
 */
module.exports = function _indexMerge (prop, obj, source) {
  // Support arbitrary number of source objects.
  if (arguments.length > 3) {
    var sources = Array.prototype.slice.call(arguments, 2);
    if (sources.length > 1) {
      sources.forEach(function (source) {
        _indexMerge(prop, obj, source);
      });
      return obj;
    }
  }

  var indexes = nested.get(source, prop);
  if (Array.isArray(indexes) && indexes.length) {
    indexes.forEach(function (index) {
      var current = nested.get(obj, prop) || [];
      var idx = indexOfIndex(index, current);
      if (~idx) {
        // extend (i.e., replace) indexes with the same keys
        nested.set(obj, prop + '.' + idx, index);
      }
      else {
        // add any other indexes
        nested.set(obj, prop, current.concat(Array.isArray(index) ? [index] : index));
      }
    });
  }
  return obj;
};

/**
 * A mongodb index definition may be either an object with the keys
 * or a 2-member array of [keys, options]
 */
function indexOfIndex (query, subject) {
  var subjectKeys = subject.map(function(idx){
    return Object.keys(Array.isArray(idx) ? idx[0] : idx).sort().join(' ');
  });
  var queryKey = Object.keys((Array.isArray(query) ? query[0] : query)).sort().join(' ');
  return subjectKeys.indexOf(queryKey);
}