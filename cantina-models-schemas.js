var app = require('cantina')
  , path = require('path')
  , fs = require('fs')
  , Schema = require('./lib/schema');

app.Schema = Schema;
app.schemas = {};

// Register a loader for schemas.
app.loader('schemas', function (options) {
  var schemas = app.load('modules', options);
  Object.keys(schemas).forEach(function (name) {
    var schema = schemas[name];
    if (!schema.name) schema.name = name;
    app.schemas[schema.name] = new Schema(schema);
  });
});
