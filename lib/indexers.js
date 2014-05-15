module.exports = {
  mongo: function (collection, indexes, cb) {
    var latch = indexes.length
      , errored = false;
    indexes.forEach(function (idx) {
      collection._ensureIndex.apply(collection, (Array.isArray(idx) ? idx : [idx]).concat(done));
    });
    function done (err) {
      if (errored) return;
      if (err) {
        errored = true;
        return cb(err);
      }
      if (!--latch) cb();
    }
  }
};