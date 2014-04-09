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
    assert(app.schemas.test instanceof app.Schema);
  });

  it('can parse a schema', function () {
    var parsed = app.schemas.test._parse();
    assert(parsed);
    assert(parsed.create);
    assert(parsed.save);
    assert.equal(parsed.create.length, 1);
    assert.equal(parsed.save.length, 5);
  });

  it('can extend an existing schema', function () {
    app.Schema.extend(app.schemas.test, {
      properties: {
        occupation: {
          type: 'string'
        }
      }
    }, {
      properties: {
        occupation: {
          default: 'ditch digger'
        }
      }
    });
    assert.strictEqual(nested.get(app.schemas.test.properties, 'occupation.type'), 'string');
    assert.strictEqual(nested.get(app.schemas.test.properties, 'occupation.default'), 'ditch digger');
  });

  it('can create an extended schema from an existing schema', function () {
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
    assert.equal(parsed.create.length, 3); // 1 from app.schemas.test originally, 1 added to app.schemas.test in previous test, and 1 added by extension here
    assert.equal(parsed.save.length, 6);
  });

  it('can generate options to pass into cantina-models', function () {
    var options = app.schemas.test.getOptions();
    assert(options);
    assert(options.create);
    assert(options.save);
    assert.equal(typeof options.create, 'function');
    assert.equal(typeof options.save, 'function');
  });

  it('runs the hooks', function (done) {
    var ct = 10
      , obj = {
          id: 1,
          name: {
            first: 'Zero',
            last:  'Mostel'
          }
        };
    // Push our observers onto the hook stacks
    app.on('schema:test:create', function (model) {
      assert(model); ct--;
      assert(model.id); ct--;
      assert(model.name.first); ct--;
      assert(model.name.last); ct--;
    });
    app.hook('schema:test:save').add(function (model, next) {
      assert(model); ct--;
      assert(model.id); ct--;
      assert(model.name.first); ct--;
      assert(model.name.last); ct--;
      assert(model.name.full); ct--;
      assert.strictEqual(model.name.full, 'Zero Mostel'); ct--;
      next();
    });
    var options = app.schemas.test.getOptions();
    options.create(obj);
    options.save(obj, function (err) {
      assert.ifError(err);
      assert.strictEqual(ct, 0);
      done();
    });
  });
});
