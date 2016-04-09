var _            = require('lodash');
var walk         = require('acorn/dist/walk.js');
var dependencies = require('./dependencies.js');

module.exports = {
  walk: walkAst
};

function walkAst(ast, scope_manager) {
  var current_scope = scope_manager.acquire(ast);
  var state         = {
    current_block_id: '<global>',
    current_scope   : current_scope,
    previous_node   : null
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
      // We should also return if the member expr is an argument of the call, and not the call itself
      // e.g. callback(node.object);
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
      dependencies.add('<global>', callee_name);
    }
  }
}
