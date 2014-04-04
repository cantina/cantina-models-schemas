cantina-models-schemas
======================

Schemas for cantina-models

###Provides:

- **app.loadSchemas(dir, cwd)**
  - Load schema definitions from a directory.
- **app.schemas**
  - Loaded schemas, keyed by name.
- **app.Schema**
  - The Schema class. Instances are created from definitions loaded by `app.loadSchemas()`.

###Usage:

```js
var app = require('cantina');

app.boot(function (err) {
  assert.ifError(err);

  // You probably want models too.
  require('cantina-models');
  require('cantina-models-redis');

  // Load this plugin.
  require('cantina-models-schemas');

  // Load schemas from the `[app.root]/schemas` folder.
  //
  // See 'Schema Definition' below for more information about what should go
  // in this folder. For now, we'll assume we have a `user` schema to load.
  app.loadSchemas('schemas');

  // Create a collection from a loaded schema.
  app.createRedisCollection('users', app.schemas.users.getOptions({
    // You can override or add options here.
  }));

  app.start(done);
});
```

###Schema:

A `Schema` objects wraps a schema definition (see below) with functionality
to help integrate it into your `cantina-models` collections.

**Schema(schema)**

Constructor. Pass your schema's definition.


**schema.extend**

Extend an existing schema, creating a new instance from it. Example:

```js
// [app-root]/schemas/teacher.js
module.exports = app.schemas.user.extend({
  name: 'teacher',
  properties: {
    grade: {
      type: 'number',
      required: true
    }
  }
})
```

**schema.getOptions(options)**

Returns options ready to be passed into `app.create[Store]Collection`. Most
importantly, the schema definition will be converted into model hooks (create,
 save, etc.).

###Schema Definitions:

A schema definition is an plain `Object` with the following properties:

- **name (required)** {String}
- **indexes** {Array}
- **properties** {Object}

####Schema Property:

Each schema property is a `name => value` pair, where `name` is a `String`
representing the name of the property and `value` is a plain `Object` with the
following properties:

- **type (required)***
  - one of: `string`, `number`, `date`, `array`, `object`
  - * **NOTE** if a property is a parent of one or more child properties, `type` **MUST BE OMITTED**
- **required** {Boolean} [default: false]
  - it is an error if a required property is absent on `save`
- **default**
  - default value for the property to apply if absent on `create`
- **validators** {Array}
  - an array of validator functions to apply to the property on `save`

@todo
- **private** {Boolean} [default: false]
  - private properties will not be included among the returned model's fields
- **prepare** {Function}
  - property will be assigned the return value of the prepare function on `save`

###Example Schema Definition:

```js
module.exports = {
  name: 'users',
  indexes: [
    { email_lc: 1 },
    { 'name.sortable': 1 }
  ],
  properties: {
    id: {
      type: 'string',
      required: true
    },
    created: {
      type: 'date',
      required: true
    },
    updated: {
      type: 'date',
      required: true
    },
    username: {
      type: 'string',
      required: true,
      validators: [app.validators.matches(/^[a-zA-Z0-9_]{3,32}$/)]
    },
    email: {
      type: 'string',
      required: true,
      validators: [app.validators.isEmail]
    },
    email_lc: {
      type: 'string',
      private: true,
      prepare: function (model) {
        return model.email.toLowerCase();
      }
    },
    email_other: [{
      type: 'string',
      validators: [app.validators.isEmail]
    }],
    auth: {
      type: 'string',
      private: true,
      validators: [app.validators.isType('string')],
      default: ''
    },
    name: {
      first: {
        type: 'string',
        validators: [app.validators.isType('string')],
        default: ''
      },
      last: {
        type: 'string',
        validators: [app.validators.isType('string')],
        default: ''
      },
      full: {
        type: 'string',
        prepare: function (model) {
          var name = [];
          if (model.last_name) name.push(model.last_name);
          if (model.first_name) name.push(model.first_name);
          if (name.length === 2) {
            return name.join(' ');
          }
          else if (name.length === 1) {
            return name[0];
          }
          else {
            return '';
          }
        }
      },
      sortable: {
        type: 'string',
        prepare: function (model) {
          var name = [];
          if (model.last_name) name.push(model.last_name);
          if (model.first_name) name.push(model.first_name);
          if (name.length === 2) {
            return name.join(', ');
          }
          else if (name.length === 1) {
            return name[0];
          }
          else {
            return model.username;
          }
        }
      }
    },
    status: {
      type: 'string',
      required: true,
      validators: [app.validators.matches(/^(?:active|disabled)$/)],
      default: 'active'
    }
  }
};
```