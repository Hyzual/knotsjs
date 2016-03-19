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
  addNodeIfNotExists(caller_name);
  addNodeIfNotExists(callee_name);
  addLink(caller_name, callee_name);
}

function addNodeIfNotExists(node_name) {
  if (! _.find(dependencies.nodes, {name: node_name})) {
    dependencies.nodes.push({
      name: node_name
    });
  }
}

function addLink(caller_name, callee_name) {
  dependencies.links.push({
    source: caller_name,
    target: callee_name,
    type: 'CallExpression'
  });
}
