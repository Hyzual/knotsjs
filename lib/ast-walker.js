var _            = require('lodash');
var walk         = require('acorn/dist/walk.js');
var dependencies = require('./dependencies.js');

module.exports = {
  walk: walkAst
};

var GLOBAL_OBJECT_NAME = '<global>';

function walkAst(ast, scope_manager) {
  var current_scope = scope_manager.acquire(ast);
  var state         = {
    current_function_id: GLOBAL_OBJECT_NAME,
    current_object_id  : GLOBAL_OBJECT_NAME,
    current_scope      : current_scope,
    previous_node      : null
  };

  walk.recursive(ast,
    state,
    {
      AssignmentExpression: onAssignmentExpression,
      CallExpression      : onCallExpression,
      FunctionDeclaration : onFunctionDeclaration,
      FunctionExpression  : onFunctionExpression,
      MemberExpression    : onMemberExpression,
      ObjectExpression    : onObjectExpression,
      Property            : onProperty,
      VariableDeclarator  : onVariableDeclarator
    },
    walk.base
  );

  function onVariableDeclarator(node, state, callback) {
    state.previous_node = node;

    if (node.init) {
      callback(node.init, state);
    }
  }

  function onAssignmentExpression(node, state, callback) {
    // Reset the state's previous node to avoid erroneous memberExpression added as dependencies
    state.previous_node = node;

    if (_.has(node, 'right')) {
      callback(node.right, state);
    }
  }

  function onFunctionDeclaration(node, state, callback) {
    state.current_function_id = node.id.name;

    var caller_name = getFullCallerName(state);
    dependencies.addObject(caller_name);

    state.previous_node = node;
    state.current_scope = scope_manager.acquire(node);

    callback(node.body, state);
  }

  function onObjectExpression(node, state, callback) {
    if (state.previous_node.type === 'VariableDeclarator') {
      state.current_object_id = state.previous_node.id.name;
    }

    _.map(node.properties, function(sub_node) {
      callback(sub_node, state);
    });

    state.current_object_id = GLOBAL_OBJECT_NAME;
  }

  function onProperty(node, state, callback) {
    state.previous_node = node;

    if (node.value.type === 'FunctionExpression') {
      callback(node.value, state);
    }
  }

  function onFunctionExpression(node, state, callback) {
    if (state.previous_node.type === 'Property') {
      state.current_scope       = scope_manager.acquire(node);
      state.current_function_id = state.previous_node.key.name;
    }

    callback(node.body, state);
  }

  function onCallExpression(node, state, callback) {
    state.previous_node = node;

    if (node.callee.name) {
      var name = node.callee.name;
      addDependency(state, name);
    }

    callback(node.callee, state);

    _(node.arguments)
      .filter(['type', 'FunctionExpression'])
      .forEach(function (sub_node) {
        callback(sub_node, state);
      });
  }
  // TODO: Need to handle call chains like lodash _.keyBy().mapValues();

  function onMemberExpression(node, state, callback) {
    if (state.previous_node.type != 'CallExpression') {
      return;
    }

    state.previous_node = node;

    var name = getPropertyCallChainFullName(node);

    addDependency(state, name);

    callback(node.object, state);
    if (node.computed) {
      callback(node.property, state);
    }
  }

  function getPropertyCallChainFullName(node) {
    var name = '';

    if (_.has(node, 'object')) {
      name += getPropertyCallChainFullName(node.object);
    }

    if (_.has(node, 'name')) {
      name += node.name;
    }

    if (_.has(node, 'property.name')) {
      name += '.' + node.property.name;
    }

    return name;
  }

  function getFullCallerName(state) {
    var caller_name = state.current_object_id + '.' + state.current_function_id;

    if (state.current_object_id === GLOBAL_OBJECT_NAME) {
      caller_name = state.current_function_id;
    }

    return caller_name;
  }

  function addDependency(state, callee_name) {
    var caller_name = getFullCallerName(state);

    dependencies.add(caller_name, callee_name);
  }
}
