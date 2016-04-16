var _       = require('lodash');
var jsgraph = require('jsgraph');

var dependencies   = {
  directed_graph  : null,
  edges           : [],
  vertices        : {},
  ordered_vertices: {}
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
  dependencies.vertices         = {};
  dependencies.edges.length     = 0;
  dependencies.ordered_vertices = {};
}

function get() {
  var object_graph = dependencies.directed_graph.toObject();

  dependencies.vertices = _(object_graph.vlist)
    .keyBy('u')
    .mapValues(function (vertex) {
      vertex.name = vertex.u;

      return vertex;
    })
    .value();

  dependencies.edges = _.map(object_graph.elist, function (edge) {
    _.assign(edge.e, {
      source: edge.e.u,
      target: edge.e.v
    });

    return edge;
  });

  traverse(dependencies.directed_graph);
  dependencies.ordered_vertices = groupByMaxDependentLevel(dependencies.vertices);

  return dependencies;
}

function add(caller_name, callee_name) {
  addNodeIfNotExists(caller_name);
  addNodeIfNotExists(callee_name);
  addLink(caller_name, callee_name);
}

// TODO: we'll need to deal with functions that have the same name eventually
function addNodeIfNotExists(node_name) {
  if (dependencies.directed_graph.isVertex(node_name)) {
    return;
  }

  dependencies.directed_graph.addVertex({
    u   : node_name,
    name: node_name,
    p   : {
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

function traverse(directed_graph) {
  // will fail if no root vertices (everything called at least once)
  var response = jsgraph.directed.depthFirstTraverse({
    digraph: directed_graph,
    visitor: {
      examineEdge    : examineEdge,
      finishVertex: finishVertex
    }
  });
}

function examineEdge(request) {
  var edge           = request.e;
  var directed_graph = request.g;

  incrementVertexProperty(directed_graph, edge.u, 'sum_transitive_dependencies');
  incrementVertexProperty(directed_graph, edge.v, 'sum_transitive_dependents');
  setAtLeastOneDependentLevel(directed_graph, edge.u);

  return true;
}

function finishVertex(request) {
  var vertex_id      = request.u;
  var directed_graph = request.g;

  sumDependentsOfVertex(directed_graph, vertex_id);
  sumDependenciesOfVertex(directed_graph, vertex_id);
  setMaxDependentLevelOfVertex(directed_graph, vertex_id);

  return true;
}

// TODO: move those jsgraph dependent methods to another file ?
// a DirectedGraph class ?
// TODO: those mehods should not mutate the property but return it
// Pure function (idempotence)
function sumDependentsOfVertex(directed_graph, vertex_id) {
  if (directed_graph.inDegree(vertex_id) === 0) {
    return;
  }
  var sum_transitive_dependents_of_parents = _(directed_graph.inEdges(vertex_id))
    .reduce(function (sum, edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.u);

      return sum + vertex_property.sum_transitive_dependents;
    }, 0);

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.sum_transitive_dependents += sum_transitive_dependents_of_parents;
}

function sumDependenciesOfVertex(directed_graph, vertex_id) {
  if (directed_graph.outDegree(vertex_id) === 0) {
    return;
  }
  var sum_transitive_dependencies_of_children = _(directed_graph.outEdges(vertex_id))
    .reduce(function (sum, edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.v);

      return sum + vertex_property.sum_transitive_dependencies;
    }, 0);

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.sum_transitive_dependencies += sum_transitive_dependencies_of_children;
}

function setMaxDependentLevelOfVertex(directed_graph, vertex_id) {
  if (directed_graph.outDegree(vertex_id) === 0) {
    return;
  }
  var max_dependent_level_of_children = _(directed_graph.outEdges(vertex_id))
    .map(function (edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.v);

      return vertex_property.max_dependent_level;
    })
    .max();

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.max_dependent_level += max_dependent_level_of_children;
}

function setAtLeastOneDependentLevel(directed_graph, vertex_id) {
  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  if (vertex_property.max_dependent_level === 0) {
    vertex_property.max_dependent_level = 1;
  }
}

function incrementVertexProperty(directed_graph, vertex_id, property_name) {
  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property[property_name]++;
}

function groupByMaxDependentLevel(nodes) {
  return _.groupBy(nodes, 'p.max_dependent_level');
}
