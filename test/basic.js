describe('basic', function () {

  var nested = require('nested-objects');

  var app
    , schema = {
        _name: 'test',
        properties: {
          id: {
            type: 'string',
            required: true,
            validators: [(function (val) { return 'number' === typeof val; })]
          },
          name: {
            first: {
              type: 'string',
              validators: [validateString]
            },
            last: {
              type: 'string',
              validators: [validateString],
              default: ''
            }
          }
        }
      };

  function validateString (val) {
    return val.match(/^[A-Za-z -]+$/);
  }

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

  it('can parse a schema', function () {
    var parsed = app.schemas.parse(schema);
    assert(parsed);
    assert(parsed.create);
    assert(parsed.save);
    assert.equal(parsed.create.length, 1);
    assert.equal(parsed.save.length, 4);
  });

  it('can extend a schema', function () {
    schema = app.schemas.extend(schema, {
      properties: {
        name: {
          first: {
            required: true
          }
        }
      }
    });
    assert.strictEqual(nested.get(schema, 'properties.name.first.required'), true);
    assert.strictEqual(nested.get(schema, 'properties.name.first.type'), 'string');
    assert.strictEqual(nested.get(schema, 'properties.name.last.type'), 'string');
    var parsed = app.schemas.parse(schema);
    assert(parsed);
    assert(parsed.create);
    assert(parsed.save);
    assert.equal(parsed.create.length, 1);
    assert.equal(parsed.save.length, 5);
  });

  it('can generate options to pass into cantina-models', function () {
    var options = app.schemas.getCollectionOptions(schema);
    assert(options);
    assert(options.create);
    assert(options.save);
    assert.equal(typeof options.create, 'function');
    assert.equal(typeof options.save, 'function');
  });
});
