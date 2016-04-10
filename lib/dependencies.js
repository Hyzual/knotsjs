var _       = require('lodash');
var jsgraph = require('jsgraph');

var dependencies   = {
  directed_graph: null,
  links         : [],
  nodes         : [],
  orderedNodes  : {}
};

module.exports = {
  add            : add,
  clear          : clear,
  getDependencies: getDependencies
};

function init(cb) {
  var response = jsgraph.directed.create();

  if (response.error) {
    cb(error);
  } else {
    dependencies.directed_graph = response.result;
    cb(null);
  }
}

function clear(cb) {
  init(cb);
  dependencies.nodes.length = 0;
  dependencies.links.length = 0;
  dependencies.orderedNodes = {};
}

function getDependencies() {
  // console.log(dependencies.directed_graph.toJSON(null, 4));
  // TODO: maybe return toObject() instead of rebuilding our own collection
  // console.log(dependencies.directed_graph.toObject());
  var nodes = dependencies.directed_graph.getVertices();

  // TODO: traverse the graph depth first and compute those properties
  dependencies.nodes = _.map(nodes, function (node_name) {
    return {
      name                       : node_name,
      sum_transitive_dependencies: 0,
      sum_transitive_dependents  : 0,
      max_dependent_level        : 0
    };
  });

  var links = dependencies.directed_graph.getEdges();
  dependencies.links = _.map(links, function (link) {
    return {
      source: _.find(dependencies.nodes, { name: link.u }),
      target: _.find(dependencies.nodes, { name: link.v })
    };
  });

  dependencies.nodes = _.map(dependencies.nodes, function (node) {
    node.sum_transitive_dependencies = countTransitiveDependencies(node);
    node.sum_transitive_dependents   = countTransitiveDependents(node);

    return node;
  });
  orderNodesByNumberOfTransitiveDependencies();

  console.log(dependencies);
  return dependencies;
}

function add(caller_name, callee_name) {
  addNodeIfNotExists(caller_name);
  addNodeIfNotExists(callee_name);
  addLink(caller_name, callee_name);
}

function addNodeIfNotExists(node_name) {
  if (dependencies.directed_graph.isVertex(node_name)) {
    return;
  }

  dependencies.directed_graph.addVertex({
    u: node_name,
    p: {
      sum_transitive_dependencies: 0,
      sum_transitive_dependents  : 0,
      max_dependent_level        : 0
    }
  });
}

function addLink(caller_name, callee_name) {
  dependencies.directed_graph.addEdge({
    e: {
      u: caller_name,
      v: callee_name
    }
  });
}

// TODO: handle circular dependencies here
function countTransitiveDependencies(node) {
  var nb_transitive_dependencies = _(dependencies.links)
    .filter({ source: node })
    .reduce(function(sum, link) {
        sum++;
        sum += countTransitiveDependencies(link.target);

      return sum;
    }, 0);

  return nb_transitive_dependencies;
}

// TODO: handle circular dependencies here
function countTransitiveDependents(node) {
  var nb_transitive_dependents = _(dependencies.links)
  .filter({ target: node })
  .reduce(function(sum, link) {
    sum++;
    sum += countTransitiveDependents(link.source);

    return sum;
  }, 0);

  return nb_transitive_dependents;
}

function orderNodesByNumberOfTransitiveDependencies() {
  // TODO: still not right. We don't care if a function is called by two functions directly
  // e.g. a() -> c() and b() -> c()
  // we want to group them by levels of dependents,
  // e.g. a() -> b() -> c()
  dependencies.orderedNodes = _.groupBy(dependencies.nodes, 'sum_transitive_dependents');
}
