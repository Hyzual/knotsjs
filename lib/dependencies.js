var _       = require('lodash');
var jsgraph = require('jsgraph');

var dependencies   = {
  directed_graph: null,
  links         : [],
  nodes         : {},
  orderedNodes  : {}
};

module.exports = {
  add  : add,
  clear: clear,
  get  : get
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
  dependencies.nodes        = {};
  dependencies.links.length = 0;
  dependencies.orderedNodes = {};
}

function get() {
  console.log(dependencies.directed_graph.toObject());

  var object_graph = dependencies.directed_graph.toObject();

  dependencies.nodes = _.chain(object_graph.vlist)
    .keyBy('u')
    .mapValues(function (vertex) {
      vertex.name = vertex.u;

      return vertex;
    })
    .value();

  dependencies.links = _.map(object_graph.elist, function (edge) {
    _.assign(edge.e, {
      source: edge.e.u,
      target: edge.e.v
    });

    return edge;
  });

  // TODO: traverse the graph depth first and compute those properties
  dependencies.nodes = _.mapValues(dependencies.nodes, function (node) {
    node.p.sum_transitive_dependencies = countTransitiveDependencies(node);
    node.p.sum_transitive_dependents   = countTransitiveDependents(node);

    return node;
  });

  // TODO: Build during Depth first traversal
  dependencies.orderedNodes = groupByNumberOfTransitiveDependencies(dependencies.nodes);

  return dependencies;
}

function traverse(directed_graph) {

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
    .filter({
      e: {
        source: node.name
      }
    })
    .reduce(function(sum, link) {
        sum++;
        sum += countTransitiveDependencies(link.e.target);

      return sum;
    }, 0);

  return nb_transitive_dependencies;
}

// TODO: handle circular dependencies here
function countTransitiveDependents(node) {
  var nb_transitive_dependents = _(dependencies.links)
  .filter({
    e: {
      target: node.name
    }
  })
  .reduce(function(sum, link) {
    sum++;
    sum += countTransitiveDependents(link.e.source);

    return sum;
  }, 0);

  return nb_transitive_dependents;
}

function groupByNumberOfTransitiveDependencies(nodes) {
  // TODO: still not right. We don't care if a function is called by two functions directly
  // e.g. a() -> c() and b() -> c()
  // we want to group them by levels of dependents,
  // e.g. a() -> b() -> c()
  return _.groupBy(nodes, 'p.sum_transitive_dependents');
}
