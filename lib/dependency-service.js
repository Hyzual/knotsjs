var _ = require('lodash');

var dependencies = {
  nodes       : [],
  links       : [],
  orderedNodes: []
};

module.exports = {
  addDependency  : addDependency,
  getDependencies: function() { return dependencies; }
};

function addDependency(caller_name, callee_name) {
  var caller_node = addNodeIfNotExists(caller_name);
  var callee_node = addNodeIfNotExists(callee_name);
  addLink(caller_node, callee_node);
  caller_node.nb_transitive_dependencies = countTransitiveDependencies(caller_node);
  orderNodesByNumberOfTransitiveDependencies();
}

function addNodeIfNotExists(node_name) {
  var node = _.find(dependencies.nodes, {name: node_name});

  if (node) {
    return node;
  }

  node = {
    name                      : node_name,
    nb_transitive_dependencies: 0
  };
  dependencies.nodes.push(node);

  return node;
}

function addLink(caller_node, callee_node) {
  dependencies.links.push({
    source: caller_node,
    target: callee_node,
    type: 'some_type'
  });
}

function countTransitiveDependencies(node) {
  var nb_transitive_dependencies = _.reduce(dependencies.links, function(sum, link) {
    if (link.source === node) {
      sum++;
      sum += countTransitiveDependencies(link.target);
    }

    return sum;
  }, 0);

  return nb_transitive_dependencies;
}

function orderNodesByNumberOfTransitiveDependencies() {
  dependencies.orderedNodes = _.groupBy(dependencies.nodes, 'nb_transitive_dependencies');
}
