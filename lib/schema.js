var app = require('cantina')
  , nested = require('nested-objects')
  , extend = require('./extend')
  , indexMerge = require('./indexMerge')
  , indexers = require('./indexers');

/**
 * Schema object.
 *
 * A schema 'definition' is parsed and converted into a full-fledged schema
 * object, which is then used in the creation of model collections.
 */
var Schema = module.exports = function Schema (schema) {
  if (!(this instanceof Schema)) return new Schema(schema);
  if (!schema.name) throw new Error('A schema requires a name property');
  if (!schema.version) throw new Error('A schema requires a version');
  this._schema = schema;
  this.name = schema.name;
  this.indexes = schema.indexes;
  this.properties = schema.properties;
  this.version = schema.version;
  this.strict = schema.strict !== false;
  this.privateProperties = [];
  this._parse();
  return this;
};

/**
 * Deep-extend the target schema, with one or more new schemas
 */
Schema.extend = function (/* target, source1, source2, etc. */) {
  if (arguments.length < 2) throw new Error('Extend method requires two or more schemas');
  var args = [].slice.call(arguments);
  // 1. Merge in the indexes
  // 2. Extend the schema
  indexMerge.apply(null, ['indexes.mongo'].concat( args ));
  return new Schema(extend.apply(null, [ true ].concat( args.map(function (schema, idx) { return deinitialize(schema, idx > 0); }) )));
};

/**
 * Create a new deep-extended schema from this schema, using the passed-in schemas.
 */
Schema.prototype.extend = function () {
  return Schema.extend.apply(null, [ {}, this._schema ].concat( [].slice.call(arguments) ));
};

/**
 * Attach schema-defined model methods to target collection
 */
Schema.prototype.attach = function (collection, cb) {
  cb || (cb = function (err) { if (err) app.emit('error', err); });
  extend(collection, {
    sanitize: this.sanitize || noop,
    defaults: this.defaults || noop,
    prepare: this.prepare || noop,
    validate: this.validate || function noopValid () { return null; }
  });
  var indexes = this.indexes && this.indexes[collection.__type];
  var error;
  if (indexes) {
    if (!indexers[collection.__type]) error = new Error('Index type not supported');
    else indexers[collection.__type](collection, indexes, cb);
  }
  else {
    process.nextTick(function () {
      cb(error);
    });
  }
};

/**
 * Produce collection options from this schema.
 *
 * Non-hook options will be copied over directly. Hook options will be merged.
 *
 * If there are collisions on the model 'hooks', we run our functions first
 * and then call the collision.
 */
Schema.prototype.getOptions = function (options) {
  var self = this;

  options = options || {};

  if (!this._hooks) {
    this._hooks = this._createHooks();
  }

  // After running this._createHooks() we can copy over any properties to pass along
  options.privateProperties = this.privateProperties.concat(); // make a copy

  // Merge in our hooks.
  Object.keys(this._hooks).forEach(function (hook) {
    var handler = self._hooks[hook];
    if (options[hook]) {
      if (hook === 'create') {
        options.create = function (model) {
          handler(model);
          options.create(model);
        };
      }
      else {
        options[hook] = function (model, cb) {
          handler(model, function (err) {
            if (err) return cb(err);
            options[hook](model, cb);
          });
        };
      }
    }
    else {
      options[hook] = handler;
    }
  });

  return options;
};

/**
 * Create `cantina-models` hooks from parsed schema definitions.
 */
Schema.prototype._createHooks = function () {
  var hooks = {}
    , defs
    , self = this;

  if (!this._defs) {
    this._parse();
  }

  defs = this._defs;
  Object.keys(defs).forEach(function (name) {
    var handlers = defs[name]
      , hookName = 'schema:' + self.name + ':' + name;

    if (handlers.length) {
      if (name === 'create') {
        // Register event listeners.
        handlers.forEach(function (handler) {
          app.on(hookName, handler);
        });

        // Add create hook.
        hooks.create = function schemaHandler (model) {
          app.emit(hookName, model);
        };
      }
      else {
        // Register hook handlers.
        handlers.forEach(function (handler) {
          app.hook(hookName).add(function (model, cb) {
            var result = handler(model);
            if ((result instanceof Error) ||
              (Array.isArray(result) && result.length && result[0] instanceof Error)) return cb(result);
            cb();
          });
        });

        // Add hook.
        hooks[name] = function (model, cb) {
          app.hook(hookName).runSeries(model, cb);
        };
      }
    }
  });

  return hooks;
};

/**
 * Parse a schema and return the hook 'definitions'.
 */
Schema.prototype._parse = function () {
  var self = this
    , defs = {
        create: [],
        save: [],
        afterSave: [],
        load: [],
        destroy: [],
        afterDestroy: []
      }
    , methods = {
        defaults: [],
        prepare: [],
        validate: []
      };

  if (this.properties) {
    Object.keys(this.properties).forEach(function (name) {
      parseMethods(name, self.properties[name]);
    });

    if (self.strict) {
      defs.save.push(function (model) {
        deepFilterProperties(model, self.properties);
      });
    }
  }

  defs.save.push(function (model) {
    model._version = self.version;
  });

  extend(this, {
    // Returns the sanitized model
    sanitize: function sanitize (model) {
      self.privateProperties.forEach(function (name) {
        nested.delete(model, name);
      });
      if (self.strict) {
        deepFilterProperties(model, self.properties);
      }
      return model;
    },
    // Returns the model with defaults applied
    defaults: function defaults (model) {
      methods.defaults.forEach(function (fn) {
        fn(model);
      });
      return model;
    },
    // Returns the prepared model
    prepare: function prepare (model) {
      methods.prepare.forEach(function (fn) {
        fn(model);
      });
      return model;
    },
    // Returns null or error having a `properties` property containing an array of errors
    validate: function validate (model) {
      var err = null;
      var properties = methods.validate.reduce(function (stack, fn) {
        var err = fn(model);
        if (err instanceof Error) stack.push(err);
        return stack;
      }, []);

      if (properties.length) {
        err = new Error('model not valid');
        err.name = 'ValidationError';
        err.code = 'ECANTINANOTVALID';
        err.properties = properties;
      }

      return err;
    }
  });

  defs.create.push(this.defaults);
  defs.save.push(this.prepare, this.validate);

  return this._defs = defs;

  function parseMethods (name, attrs) {
    if (!attrs.type) {
      if (Array.isArray(attrs)) {
        return attrs.map(function (attrs_member) {
          return parseMethods(name, attrs_member);
        });
      }
      else {
        return Object.keys(attrs).map(function (child_name) {
          return parseMethods(name + '.' + child_name, attrs[child_name]);
        });
      }
    }
    else {
      // private
      if (attrs.private && self.privateProperties.indexOf(name) === -1) {
        self.privateProperties.push(name);
      }
      // defaults
      if ('default' in attrs) {
        // defaults will run on create, so no callback
        methods.defaults.push(function (model) {
          if ('undefined' === typeof nested.get(model, name)) {
            nested.set(model, name, attrs.default);
          }
        });
      }
      // prepare
      if (attrs.prepare && 'function' === typeof attrs.prepare) {
        methods.prepare.push(function (model) {
          nested.set(model, name, attrs.prepare(model));
        });
      }
      // required -- a type of validate
      if (attrs.required) {
        methods.validate.unshift(function (model) {
          if ('undefined' === typeof nested.get(model, name)) {
            var err = new Error('Missing required property: ' + name);
            err.name = 'ValidationError';
            err.property = name;
            return err;
          }
        });
      }
      // validators
      if (attrs.validators && Array.isArray(attrs.validators) && attrs.validators.length) {
        methods.validate.push(function (model) {
          var fn
            , val = nested.get(model, name)
            , err
            , errmsg;
          if ('undefined' !== typeof val) {
            for (var i = 0, len = attrs.validators.length; i < len; i++) {
              if (Array.isArray(attrs.validators[i])) {
                fn = attrs.validators[i][0];
                errmsg = attrs.validators[i][1];
              }
              else if ('object' === typeof attrs.validators[i]) {
                fn = attrs.validators[i].validator;
                errmsg = attrs.validators[i].message;
              }
              else {
                fn = attrs.validators[i];
                errmsg = null;
              }
              if (!fn(val)) {
                err = new Error('Validator ' + fn.name + ' failed for property ' + name);
                err.name = 'ValidationError';
                err.property = name;
                errmsg && (err.message = errmsg);
                return err;
              }
            }
          }
        });
      }
    }
  }

  function deepFilterProperties (attrs, schemaProperties) {
    Object.keys(attrs).forEach(function (prop) {
      if (!schemaProperties[prop]) {
        delete attrs[prop];
      }
      else if (!schemaProperties[prop].type) {
        deepFilterProperties(attrs[prop], schemaProperties[prop]);
      }
    });
  }
};

var uninheritableProps = [ '_defs', '_hooks' ];

function deinitialize (schema, clone) {
  if (!clone) {
    uninheritableProps.forEach(function (prop) {
      delete schema[prop];
    });
    return schema;
  }
  else {
    // shallow copy excluding uninheritableProps and indexes
    // indexes are uninheritable in that they are smartly merged
    // in a separate procedure
    return Object.keys(schema).reduce(function (copy, prop) {
      if (uninheritableProps.indexOf(prop) === -1 && prop !== 'indexes') {
        copy[prop] = schema[prop];
      }
      return copy;
    }, {});
  }
}

function noop (model) { return model; }
