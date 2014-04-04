describe('basic', function () {

  var nested = require('nested-objects');

  var app
    , testSchema = require('./fixtures/schemas/test');

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
    assert.equal(typeof app.Schema, 'function');
    assert.equal(typeof app.loadSchemas, 'function');
  });

  it('throws if schema has no name', function () {
    assert.throws(function () {
      var badSchema = new app.Schema({});
    });
    assert.doesNotThrow(function () {
      var goodSchema = new app.Schema({name: 'good'});
    });
  });

  it('can load schemas from a directory', function () {
    app.loadSchemas('test/fixtures/schemas');
    assert(app.schemas.test);
  });

  it('can parse a schema', function () {
    var parsed = app.schemas.test._parse();
    assert(parsed);
    assert(parsed.create);
    assert(parsed.save);
    assert.equal(parsed.create.length, 1);
    assert.equal(parsed.save.length, 4);
  });

  it('can extend a schema', function () {
    var extended = app.schemas.test.extend({
      name: 'extended',
      properties: {
        name: {
          first: {
            required: true
          }
        },
        age: {
          type: 'number',
          default: 0
        }
      }
    });
    assert.equal(extended.name, 'extended');
    assert.strictEqual(nested.get(extended.properties, 'name.first.required'), true);
    assert.strictEqual(nested.get(extended.properties, 'name.first.type'), 'string');
    assert.strictEqual(nested.get(extended.properties, 'name.last.type'), 'string');
    assert.strictEqual(nested.get(extended.properties, 'age.type'), 'number');

    var parsed = extended._parse();
    assert(parsed);
    assert(parsed.create);
    assert(parsed.save);
    assert.equal(parsed.create.length, 2);
    assert.equal(parsed.save.length, 5);
  });

  it('can generate options to pass into cantina-models', function () {
    var options = app.schemas.test.getOptions();
    assert(options);
    assert(options.create);
    assert(options.save);
    assert.equal(typeof options.create, 'function');
    assert.equal(typeof options.save, 'function');
  });
});
