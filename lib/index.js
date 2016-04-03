(function() {

  var path              = require('path');
  var fs                = require('fs');
  var acorn             = require('acorn');
  var walk              = require('acorn/dist/walk.js');
  var escope            = require('escope');
  var _                 = require('lodash');
  var DependencyService = require('./dependency-service.js');

  module.exports = {
    parse: parse
  };

  if (! module.parent) {
    parse(function (err, data) {
      console.log(data);
    });
  }

  var scope_manager;

  function parse(cb) {
    fs.readFile(path.join(__dirname, 'queue.js'), 'utf8', function(err, data) {
    // fs.readFile(path.join(__dirname, 'backlog-item-factory.js'), 'utf8', function(err, data) {
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
          MemberExpression   : onMemberExpression
        },
        walk.base
      );

      cb(null, DependencyService.getDependencies());
    });
  }

  function onFunctionDeclaration(node, state, callback) {
    state.current_scope = scope_manager.acquire(node);
    state.previous_node = node.type;
    callback(node.body, state);
  }

  function onCallExpression(node, state, callback) {
    if (node.callee.name) {
      var name = node.callee.name;
      addDependency(state, name);
    }

    state.previous_node = node.type;
    callback(node.callee, state);
    if (node.arguments) {
      _.map(node.arguments, function(sub_node) {
        callback(sub_node, state);
      });
    }
  }

  function onMemberExpression(node, state, callback) {
    if (state.previous_node != 'CallExpression') {
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

    state.previous_node = node.type;
    callback(node.object, state);
    if (node.computed) {
      callback(node.property, state);
    }
  }

  function addDependency(state, callee_name) {
    if (state.current_scope.block.type === 'Program') {
      DependencyService.addDependency('global', callee_name);
    } else {
      var caller_name = state.current_scope.block.id.name;
      DependencyService.addDependency(caller_name, callee_name);
    }
  }

})();
