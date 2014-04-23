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
      var badSchema = new app.Schema({version: '0.0.0'});
    });
    assert.doesNotThrow(function () {
      var goodSchema = new app.Schema({name: 'good', version: '1.0.0'});
    });
  });

  it('throws if schema has no version', function () {
    assert.throws(function () {
      var badSchema = new app.Schema({name: 'bad'});
    });
    assert.doesNotThrow(function () {
      var goodSchema = new app.Schema({name: 'good', version: '1.0.0'});
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
    assert(app.schemas.test.privateProperties);
    assert.equal(parsed.create.length, 1);
    assert.equal(parsed.save.length, 4);
    assert.equal(typeof app.schemas.test.defaults, 'function');
    assert.equal(typeof app.schemas.test.prepare, 'function');
    assert.equal(typeof app.schemas.test.validate, 'function');
    assert.deepEqual(app.schemas.test.privateProperties, ['auth.hash', 'auth.secret']);
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
    assert.strictEqual(nested.get(extended.properties, 'occupation.type'), 'string');
    assert.strictEqual(nested.get(extended.properties, 'occupation.default'), 'ditch digger');

    var parsed = extended._parse();
    assert(parsed);
    assert(parsed.create);
    assert(parsed.save);

    var obj = {};
    extended.defaults(obj);
    assert.strictEqual(nested.get(obj, 'name.last'), '');
    assert.strictEqual(nested.get(obj, 'occupation'), 'ditch digger');
    assert.strictEqual(nested.get(obj, 'age'), 0);
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

  it('sets the version on the model', function (done) {
    var obj = {
      id: 1,
      name: {
        first: 'Zero',
        last:  'Mostel'
      }
    };
    var options = app.schemas.test.getOptions();
    options.create(obj);
    options.save(obj, function (err) {
      assert.ifError(err);
      assert.strictEqual(obj._version, app.schemas.test.version);
      done();
    });
  });

  it('enforces strict schemas', function (done) {
    var obj = {
      id: 2,
      name: {
        first: 'Zero',
        last: 'Mostel',
        nickname: 'ZeroM'
      },
      password: 'unsafe'
    };

    var options = app.schemas.test.getOptions();
    options.create(obj);
    assert(obj.password);
    assert(obj.name.nickname);
    options.save(obj, function (err) {
      assert.ifError(err);
      assert(!obj.password);
      assert(!obj.name.nickname);
      done();
    });
  });

  it('provides santize method', function () {
    var obj = {
      id: 3,
      name: {
        first: 'Zero',
        last: 'Mostel',
        nickname: 'ZeroM'
      },
      password: 'unsafe'
    };
    app.schemas.test.sanitize(obj);
    assert(obj.id);
    assert(obj.name.first);
    assert(obj.name.last);
    assert.strictEqual(obj.password, undefined);
    assert.strictEqual(obj.name.nickname, undefined);
  });

  it('provides defaults method', function () {
    var obj = {};
    app.schemas.test.defaults(obj);
    assert.strictEqual(obj.name.first, undefined);
    assert.strictEqual(obj.name.last, '');
    assert.strictEqual(obj.occupation, 'ditch digger');
  });

  it('provides prepare method', function () {
    var obj = {
      id: 4,
      name: {
        first: 'Zero',
        last: 'Mostel',
        nickname: 'ZeroM'
      },
      password: 'unsafe'
    };
    app.schemas.test.prepare(obj);
    assert.strictEqual(obj.name.full, 'Zero Mostel');
  });

  it('provides validate method', function () {
    var result = app.schemas.test.validate({});
    assert(Array.isArray(result) && result.length);
    result.every(function (err) {
      assert(err instanceof Error);
    });
  });
});
