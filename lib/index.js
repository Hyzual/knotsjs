/*
 * Copyright (C) 2016  Joris "Hyzual" MASSON
 *
 * This file is part of knotsjs.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {

  var argv = require('yargs')
    .usage('Usage: $0 <file or directory path>')
    .demand(1, 'Not enough file arguments: got 0, need at least 1')
    .help('h')
    .alias('h', 'help')
    .version('v')
    .alias('v', 'version')
    .argv;
    // TODO: should probably be in the future bin/knotsjs script

  var Promise = require('bluebird');
  require('any-promise/register')('bluebird');
  var path         = require('path');
  var fs           = require('mz/fs');
  var acorn        = require('acorn');
  var escope       = require('escope');
  var _            = require('lodash');
  var recursive    = require('recursive-readdir');
  var dependencies = require('./dependencies.js');
  var ast_walker   = require('./ast-walker.js');

  module.exports = {
    parse         : parseSingleFile,
    parseFiles    : parseFiles,
    parseDirectory: parseDirectory
  };

  if (! module.parent) {
    runAsCLI();
  }

  function runAsCLI() {
    var paths_to_parse = argv._;

    if (paths_to_parse.length === 1) {
      var path_to_parse = paths_to_parse[0];

      parsePath(path_to_parse).then(function (data) {
        console.log(data);
      });
    } else {
      _.forEach(paths_to_parse, parsePath);
    }
  }

  function parsePath(path_to_parse) {
    var promise = fs.stat(path_to_parse).then(function (stats) {
      if (stats.isDirectory()) {
        return parseDirectory(path_to_parse);
      }

      if (stats.isFile()) {
        return parseSingleFile(path_to_parse);
      }
    });

    return promise;
  }

  function ignoreNonJS(file_path, stats) {
    return (stats.isFile() && path.extname(file_path) !== '.js');
  }

  function parseDirectory(directory_path) {
    var recursiveReadDir = Promise.promisify(recursive);
    var promise = recursiveReadDir(directory_path, ['*_test.js', ignoreNonJS]).then(function (file_paths) {
      return parseFiles(file_paths);
    });

    return promise;
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
