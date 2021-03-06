/*
 * Copyright (C) 2016  Joris "Hyzual" MASSON
 *
 * This file is part of knotsjs.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var _       = require('lodash');
var jsgraph = require('jsgraph');

var dependencies   = {
  directed_graph  : null,
  edges           : [],
  vertices        : {},
  ordered_vertices: {}
};

module.exports = {
  add      : add,
  addObject: addObject,
  clear    : clear,
  get      : get
};

function init() {
  var response = jsgraph.directed.create();

  if (response.error) {
    // This should only happen when we use stupid params
    console.error('Error while creating jsgraph', response.error);
  }

  dependencies.directed_graph = response.result;
}

function clear() {
  init();
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
  dependencies.ordered_vertices = groupByMaxDependencyDepth(dependencies.vertices);

  return dependencies;
}

function addObject(object_name) {
  addVertexIfNotExists(object_name);
}

function add(caller_name, callee_name) {
  addVertexIfNotExists(caller_name);
  addVertexIfNotExists(callee_name);
  addEdge(caller_name, callee_name);
}

// TODO: we'll need to deal with functions that have the same name eventually
function addVertexIfNotExists(node_name) {
  if (dependencies.directed_graph.isVertex(node_name)) {
    return;
  }

  dependencies.directed_graph.addVertex({
    u: node_name,
    p: {
      max_dependency_depth       : 0,
      max_dependent_depth        : 0,
      sum_transitive_dependencies: 0,
      sum_transitive_dependents  : 0
    }
  });
}

function addEdge(caller_name, callee_name) {
  dependencies.directed_graph.addEdge({
    e: {
      u: caller_name,
      v: callee_name
    },
    p: {
      type: null
    }
  });
}

function traverse(directed_graph) {
  // will fail if no root vertices (every function called at least once by someone)
  var response = jsgraph.directed.depthFirstTraverse({
    digraph: directed_graph,
    visitor: {
      backEdge      : backEdge,
      discoverVertex: discoverVertex,
      examineEdge   : examineEdge,
      finishVertex  : finishVertex
    }
  });
}

function backEdge(request) {
  var edge           = request.e;
  var directed_graph = request.g;

  var edge_property = directed_graph.getEdgeProperty(edge);
  edge_property.type = 'reverse';

  return true;
}

function discoverVertex(request) {
  var vertex_id      = request.u;
  var directed_graph = request.g;

  setMaxDependentDepthOfVertex(directed_graph, vertex_id);

  return true;
}

function examineEdge(request) {
  var edge           = request.e;
  var directed_graph = request.g;

  incrementVertexProperty(directed_graph, edge.u, 'sum_transitive_dependencies');
  incrementVertexProperty(directed_graph, edge.v, 'sum_transitive_dependents');

  return true;
}

function finishVertex(request) {
  var vertex_id      = request.u;
  var directed_graph = request.g;

  sumDependentsOfVertex(directed_graph, vertex_id);
  sumDependenciesOfVertex(directed_graph, vertex_id);
  setMaxDependencyDepthOfVertex(directed_graph, vertex_id);

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

  var sum_transitive_dependents_of_callers = _(directed_graph.inEdges(vertex_id))
    .reduce(function (sum, edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.u);

      return sum + vertex_property.sum_transitive_dependents;
    }, 0);

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.sum_transitive_dependents += sum_transitive_dependents_of_callers;
}

function sumDependenciesOfVertex(directed_graph, vertex_id) {
  if (directed_graph.outDegree(vertex_id) === 0) {
    return;
  }

  var sum_transitive_dependencies_of_callees = _(directed_graph.outEdges(vertex_id))
    .reduce(function (sum, edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.v);

      return sum + vertex_property.sum_transitive_dependencies;
    }, 0);

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.sum_transitive_dependencies += sum_transitive_dependencies_of_callees;
}

function setMaxDependentDepthOfVertex(directed_graph, vertex_id) {
  if (directed_graph.inDegree(vertex_id) === 0) {
    return;
  }

  var max_dependent_depth_of_callers = _(directed_graph.inEdges(vertex_id))
    .map(function (edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.u);

      return vertex_property.max_dependent_depth;
    })
    .max();

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.max_dependent_depth += 1 + max_dependent_depth_of_callers;
}

function setMaxDependencyDepthOfVertex(directed_graph, vertex_id) {
  if (directed_graph.outDegree(vertex_id) === 0) {
    return;
  }

  var max_dependency_depth_of_callees = _(directed_graph.outEdges(vertex_id))
    .map(function (edge) {
      var vertex_property = directed_graph.getVertexProperty(edge.v);

      return vertex_property.max_dependency_depth;
    })
    .max();

  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property.max_dependency_depth += 1 + max_dependency_depth_of_callees;
}

function incrementVertexProperty(directed_graph, vertex_id, property_name) {
  var vertex_property = directed_graph.getVertexProperty(vertex_id);
  vertex_property[property_name]++;
}

function groupByMaxDependencyDepth(vertices) {
  return _.groupBy(vertices, 'p.max_dependent_depth');
}
