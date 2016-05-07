(function() {

  var argv = require('yargs')
    .usage('Usage: $0 <files to parse>')
    .demand(1, 'Not enough file arguments: got 0, need at least 1')
    .help('h')
    .alias('h', 'help')
    .version('v')
    .alias('v', 'version')
    .argv;

  var Promise = require('bluebird');
  require('any-promise/register')('bluebird');
  var path         = require('path');
  var fs           = require('mz/fs');
  var acorn        = require('acorn');
  var escope       = require('escope');
  var _            = require('lodash');
  var dependencies = require('./dependencies.js');
  var ast_walker   = require('./ast-walker.js');

  module.exports = {
    parse     : parseSingleFile,
    parseFiles: parseFiles
  };

  if (! module.parent) {
    // console.log('argv', argv._);

    var file_paths = argv._;

    parseFiles(file_paths).then(function (data) {
      console.log(data);
    });
  }

  function parseFiles(file_paths) {
    dependencies.clear();
    var promises = _.map(file_paths, function (file_path) {
      return parse(file_path);
    });

    var promise = Promise.all(promises)
      .then(function() {
        return dependencies.get();
      });
    // TODO: catch ?

    return promise;
  }

  function parseSingleFile(file_path) {
    dependencies.clear();
    var promise = parse(file_path)
      .then(function() {
        return dependencies.get();
      });

    return promise;
  }

  function parse(file_path) {
    return fs.readFile(file_path, 'utf8').then(function(data) {
      // TODO: try acorn's program option, need to know a 'first' file.
      // This could be possible in ES2015 or node because of modules, but I'm not sure about scripts like angular
      // TODO: provide option for acorn's ecmaVersion ?
      // TODO: detect acorn's sourceType option ?
      var ast           = acorn.parse(data);
      var scope_manager = escope.analyze(ast);

      ast_walker.walk(ast, scope_manager);
    });
  }
})();
