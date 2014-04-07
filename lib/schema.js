var app = require('cantina')
  , nested = require('nested-objects')
  , extend = require('./extend');

/**
 * Schema object.
 *
 * A schema 'definition' is parsed and converted into a full-fledged schema
 * object, which is then used in the creation of model collections.
 */
var Schema = module.exports = function (schema) {
  if (!schema.name) throw new Error('A schema requires a name property');
  this._schema = schema;
  this.name = schema.name;
  this.indexes = schema.indexes;
  this.properties = schema.properties;
};

/**
 * Deep-extend the target schema, with one or more new schemas
 */
Schema.extend = function (/* target, source1, source2, etc. */) {
  if (arguments.length < 2) throw new Error('Extend method requires two or more schemas');
  return new Schema(extend.apply(null, [ true ].concat( [].slice.call(arguments) )));
};

/**
 * Create a new deep-extended schema from this schema, using the passed-in schemas.
 */
Schema.prototype.extend = function () {
  return Schema.extend.apply(null, [ {}, this._schema ].concat( [].slice.call(arguments) ));
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
    this._defs = this._parse();
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
            if (result instanceof Error) return cb(result);
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
      };

  if (this.properties) {
    Object.keys(this.properties).forEach(function (name) {
      createDefs(name, self.properties[name]);
    });
  }

  function createDefs (name, attrs) {
    if (!attrs.type) {
      if (Array.isArray(attrs)) {
        return attrs.map(function (attrs_member) {
          return createDefs(name, attrs_member);
        });
      }
      else {
        return Object.keys(attrs).map(function (child_name) {
          return createDefs(name + '.' + child_name, attrs[child_name]);
        });
      }
    }
    else {
      // defaults
      if ('default' in attrs) {
        // defaults will run on create, so no callback
        defs.create.push(function (model) {
          if ('undefined' === typeof nested.get(model, name)) {
            nested.set(model, name, attrs.default);
          }
        });
      }
      // required
      if (attrs.required) {
        defs.save.unshift(function (model) {
          if ('undefined' === typeof nested.get(model, name)) {
            return new Error('Missing required property ' + name);
          }
        });
      }
      // validators
      if (attrs.validators && Array.isArray(attrs.validators) && attrs.validators.length) {
        defs.save.push(function (model) {
          var fn
            , val = nested.get(model, name);
          if (val) {
            for (var i = 0, len = attrs.validators.length; i < len; i++) {
              fn = attrs.validators[i];
              if (!fn(nested.get(model, name))) {
                return new Error('Validator ' + fn.name + ' failed for property ' + name);
              }
            }
          }
        });
      }
    }
  }

  return defs;
};
