cantina-models-schemas
======================

Schemas for cantina-models

###Provides:

- **app.schemas.getCollectionOptions(schema)**
  - parses a schema and returns an options hash to pass to (cantina-models)[//github.com/cantina/cantina-models]
- **app.schemas.parse(schema)**
  - parses a schema and returns an hash of defined defaults, validators, etc. (only really useful for `app.schemas.getCollectionOptions`)
- **app.schemas.extend(destination, source)**
  - returns a new copy of the `destination` schema as extended by `source`; performs deep extend

###Schema:

A schema is an plain `Object` with the following properties:

- **_name (required)** {String}
- **_indexes** {Array}
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

###Example:

```js
module.exports = {
  _name: 'users',
  _indexes: [
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