var _ = require('lodash');

var dependencies = {
  nodes: [],
  links: []
};

module.exports = {
  addDependency: addDependency,
  getDependencies: function() { return dependencies; }
};

function addDependency(caller_name, callee_name) {
  var caller_node = addNodeIfNotExists(caller_name);
  var callee_node = addNodeIfNotExists(callee_name);
  addLink(caller_node, callee_node);
}

function addNodeIfNotExists(node_name) {
  var node = _.find(dependencies.nodes, {name: node_name});

  console.log('yolo', node);
  if (node) {
    return node;
  }

  node = {
    name: node_name
  };
  dependencies.nodes.push(node);

  return node;
}

function addLink(calle_node, callee_node) {
  dependencies.links.push({
    source: calle_node,
    target: callee_node,
    type: 'some_type'
  });
}
