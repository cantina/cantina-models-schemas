var app = require('cantina')
  , path = require('path')
  , fs = require('fs')
  , Schema = require('./lib/schema');

app.Schema = Schema;
app.schemas = {};

/**
 * Load schemas from a directory.
 */
app.loadSchemas = function (dir, cwd) {
  var schemas = app.load(dir, cwd);
  Object.keys(schemas).forEach(function (name) {
    var schema = schemas[name];
    if (!schema.name) schema.name = name;
    app.schemas[schema.name] = new Schema(schema);
  });
};
