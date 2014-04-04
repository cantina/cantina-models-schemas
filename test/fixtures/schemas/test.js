/**
 * Test Schema.
 */
module.exports = {
  name: 'test',
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

/**
 * Sample Validator.
 */
function validateString (val) {
  return val.match(/^[A-Za-z -]+$/);
}