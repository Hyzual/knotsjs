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

  var path              = require('path');
  var fs                = require('fs');
  var acorn             = require('acorn');
  var walk              = require('acorn/dist/walk.js');
  var escope            = require('escope');
  var _                 = require('lodash');
  var dependencies = require('./dependencies.js');

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

  var scope_manager;

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
      scope_manager     = escope.analyze(ast);
      var current_scope = scope_manager.acquire(ast);
      var state         = {
        current_scope: current_scope,
        previous_node: undefined
      };

      walk.recursive(ast,
        state,
        {
          CallExpression     : onCallExpression,
          FunctionDeclaration: onFunctionDeclaration,
          FunctionExpression : onFunctionExpression,
          MemberExpression   : onMemberExpression,
          Property           : onProperty,
        },
        walk.base
      );

      cb(null, dependencies.getDependencies());
    });
  }

  function onFunctionDeclaration(node, state, callback) {
    state.current_scope    = scope_manager.acquire(node);
    state.previous_node    = node;
    state.current_block_id = node.id.name;
    callback(node.body, state);
  }

  function onProperty(node, state, callback) {
    state.previous_node = node;
    if (node.value.type === 'FunctionExpression') {
      callback(node.value, state);
    }
  }

  function onFunctionExpression(node, state, callback) {
    if (state.previous_node.type === 'Property') {
      state.current_scope    = scope_manager.acquire(node);
      state.current_block_id = state.previous_node.key.name;
    }

    callback(node.body, state);
  }

  function onCallExpression(node, state, callback) {
    if (node.callee.name) {
      var name = node.callee.name;
      addDependency(state, name);
    }

    state.previous_node = node;
    callback(node.callee, state);
    if (node.arguments) {
      _.map(node.arguments, function(sub_node) {
        callback(sub_node, state);
      });
    }
  }

  function onMemberExpression(node, state, callback) {
    if (state.previous_node.type != 'CallExpression') {
      return;
    }

    var name = '';

    if (node.object.name) {
      name += node.object.name;
    }

    if (! node.callee) {
      name += '.' + node.property.name;
    }

    //TODO: I also need to do call chains correctly, such as backlog_item.children.data

    addDependency(state, name);

    state.previous_node = node;
    callback(node.object, state);
    if (node.computed) {
      callback(node.property, state);
    }
  }

  function addDependency(state, callee_name) {
    if (state.current_block_id) {
      dependencies.add(state.current_block_id, callee_name);
    } else if (state.current_scope.block.type === 'Program') {
      dependencies.add('global', callee_name);
    }
  }

})();
