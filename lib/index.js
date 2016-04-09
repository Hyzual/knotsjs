#!/usr/bin/env node

(function() {

  var argv = require('yargs')
    .usage('Usage: $0 <files to parse>')
    .demand(1, 'Not enough file arguments: got 0, need at least 1')
    .help('h')
    .alias('h', 'help')
    .version('v')
    .alias('v', 'version')
    .argv;

  var path         = require('path');
  var fs           = require('fs');
  var acorn        = require('acorn');
  var escope       = require('escope');
  var dependencies = require('./dependencies.js');
  var ast_walker   = require('./ast-walker.js');

  module.exports = {
    parse     : parseSingleFile,
    parseFiles: parseFiles
  };

  if (! module.parent) {
    // console.log('argv', argv._);

    var filenames = argv._;

    parseFiles(filenames, function (err, data) {
      console.log(data);
    });
  }

  function parseFiles(filenames, cb) {
    dependencies.clear();

    parse(filenames[0], cb);
  }

  function parseSingleFile(filename, cb) {
    dependencies.clear();

    parse(filename, cb);
  }

  function parse(filename, cb) {
    fs.readFile(filename, 'utf8', function(err, data) {
      if (err) {
        cb(err);
      }

      var ast           = acorn.parse(data);
      var scope_manager = escope.analyze(ast);

      ast_walker.walk(ast, scope_manager);

      cb(null, dependencies.getDependencies());
    });
  }

})();
