var app = require('cantina')
  , clone = require('clone')
  , nested = require('nested-objects');

app.schemas = {
  getCollectionOptions: getCollectionOptions,
  parse: parseSchema,
  extend: extendSchema
};

function getCollectionOptions (schema) {
  if (!schema._name) throw new Error('A schema requires a _name property');
  var defs = parseSchema(schema)
    , parsed = {};

  for (var def in defs) {
    if (defs[def].length) {
      if ('create' === def) {
        parsed.create = (function (def) {
          return function (model) {
            defs[def].forEach(function (listener) {
              listener(model);
            });
          };
        })(def);
      }
      else {
        var hookName = 'schema:' + schema._name + ':' + def;
        defs[def].forEach(function (fn) {
          app.hook(hookName).add((def === 'required' ? 'first' : 'last'), fn);
        });
        parsed[def] || (parsed[def] = (function (hookName) {
          return function (model, cb) {
            app.hook(hookName).forEach(function (fn) {
              var result = fn(model);
              if (result instanceof Error) return cb(result);
            });
            cb();
          };
        })(hookName));
      }
    }
  }
  return parsed;

}

function parseSchema (schema) {
  var defs = {
        create: [],
        save: [],
        afterSave: [],
        load: [],
        destroy: [],
        afterDestroy: []
      };

  if (schema.properties) {
    Object.keys(schema.properties).forEach(function (name) {
      createHooks(name, schema.properties[name]);
    });
  }

  function createHooks (name, attrs) {
    if (!attrs.type) {
      if (Array.isArray(attrs)) {
        return attrs.map(function (attrs_member) {
          return createHooks(name, attrs_member);
        });
      }
      else {
        return Object.keys(attrs).map(function (child_name) {
          return createHooks(name + '.' + child_name, attrs[child_name]);
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
}

function extendSchema (destination, source) {
  return _defaults(true, {}, source, destination);
}

/**
 * Extend an object with defaults. (Transplanted from Cantina 2).
 *
 * @param [deep] {Boolean} If true, performs a deep (recursive) merge.
 * @param obj {Object} The object to extend.
 * @param defaults {Object} An object containing the defaults.
 */
function _defaults (deep, obj, defaults) {
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
    if (deep && _isObjectLiteral(obj[key]) && _isObjectLiteral(copy[key])) {
      _defaults(deep, obj[key], copy[key]);
    }
    else if (!obj.hasOwnProperty(key)) {
      obj[key] = copy[key];
    }
  });

  return obj;
}

/**
 * Check if an object is an object literal. (Transplanted from Cantina 2).
 */
function _isObjectLiteral (obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}
