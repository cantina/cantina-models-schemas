describe('basic', function () {

  var app;

  before(function (done) {
    app = require('cantina');
    app.boot(function (err) {
      assert.ifError(err);

      require('../');

      app.start(done);
    });
  });

  after(function (done) {
    app.destroy(done);
  });

  it('works', function () {
    assert(app.schemas);
    assert.equal(typeof app.schemas.parse, 'function');
    assert.equal(typeof app.schemas.extend, 'function');
  });
});
