/**
 * Test Schema.
 */
module.exports = {
  name: 'test',
  version: '0.0.1',
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
      },
      full: {
        type: 'string',
        prepare: function (model) {
          var full = [];
          if (model.name) {
            if (model.name.first) {
              full.push(model.name.first);
            }
            if (model.name.last) {
              full.push(model.name.last);
            }
          }
          return full.join(' ');
        }
      }
    }
  }
};

/**
 * Sample Validator.
 */
function validateString (val) {
  return val.match(/^[A-Za-z -]+$/);
}