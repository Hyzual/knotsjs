describe("dependencies -", function() {
  var dependencies;

  beforeEach(function() {
    dependencies = require('../lib/dependencies.js');
    dependencies.clear();
  });

  describe("Given a caller and a callee", function() {
    it("when I add a dependency between them, then two vertices will be added, an edge will be added, the caller's transitive dependencies will be counted, the callee's transitive dependents will be counted and the vertices will be ordered", function() {
      dependencies.add('caller', 'callee');

      var output = dependencies.get();

      expect(output.vertices).toEqual({
        caller: {
          u   : 'caller',
          name: 'caller',
          p: {
            max_dependency_depth       : 1,
            max_dependent_depth        : 0,
            sum_transitive_dependencies: 1,
            sum_transitive_dependents  : 0
          }
        },
        callee: {
          u   : 'callee',
          name: 'callee',
          p: {
            max_dependency_depth       : 0,
            max_dependent_depth        : 1,
            sum_transitive_dependencies: 0,
            sum_transitive_dependents  : 1
          }
        }
      });

      expect(output.edges).toEqual([
        {
          e: {
            u     : 'caller',
            v     : 'callee',
            source: 'caller',
            target: 'callee'
          },
          p: {
            type: null
          }
        }
      ]);

      expect(output.ordered_vertices).toEqual({
        0: [
          output.vertices.caller,
        ],
        1: [
          output.vertices.callee
        ]
      });
    });

    it("and given I had already added a dependency between caller and other_callee, when I add a dependency between caller and calee, then the caller vertex won't be added twice", function() {
      dependencies.add('caller', 'other_callee');

      dependencies.add('caller', 'callee');
      var output = dependencies.get();

      expect(output.vertices).toEqual({
        caller: {
          u   : 'caller',
          name: 'caller',
          p: {
            max_dependency_depth       : 1,
            max_dependent_depth        : 0,
            sum_transitive_dependencies: 2,
            sum_transitive_dependents  : 0
          }
        },
        other_callee: {
          u   : 'other_callee',
          name: 'other_callee',
          p: {
            max_dependency_depth       : 0,
            max_dependent_depth        : 1,
            sum_transitive_dependencies: 0,
            sum_transitive_dependents  : 1
          }
        },
        callee: {
          u   : 'callee',
          name: 'callee',
          p: {
            max_dependency_depth       : 0,
            max_dependent_depth        : 1,
            sum_transitive_dependencies: 0,
            sum_transitive_dependents  : 1
          }
        }
      });

      expect(output.edges).toEqual([
        {
          e: {
            u     : 'caller',
            v     : 'other_callee',
            source: 'caller',
            target: 'other_callee'
          },
          p: {
            type: null
          }
        },
        {
          e: {
            u     : 'caller',
            v     : 'callee',
            source: 'caller',
            target: 'callee'
          },
          p: {
            type: null
          }
        }
      ]);

      expect(output.ordered_vertices).toEqual({
        0: [
          output.vertices.caller
        ],
        1: [
          output.vertices.other_callee,
          output.vertices.callee
        ]
      });
    });
  });

  it("Given three functions A, B and C and given I had already added a dependency from A to B and B to C, when I add a reverse dependency from C to B, then an edge with the 'reverse' type will be added", function() {
    dependencies.add('A', 'B');
    dependencies.add('B', 'C');
    dependencies.add('C', 'B');

    var output = dependencies.get();

    expect(output.vertices).toEqual({
      A: {
        u   : 'A',
        name: 'A',
        p: {
          max_dependency_depth       : 3,
          max_dependent_depth        : 0,
          sum_transitive_dependencies: 4,
          sum_transitive_dependents  : 0
        }
      },
      B: {
        u   : 'B',
        name: 'B',
        p: {
          max_dependency_depth       : 2,
          max_dependent_depth        : 1,
          sum_transitive_dependencies: 3,
          sum_transitive_dependents  : 5
        }
      },
      C: {
        u   : 'C',
        name: 'C',
        p: {
          max_dependency_depth       : 1,
          max_dependent_depth        : 2,
          sum_transitive_dependencies: 2,
          sum_transitive_dependents  : 3
        }
      }
    });

    expect(output.edges).toEqual([
      {
        e: {
          u     : 'A',
          v     : 'B',
          source: 'A',
          target: 'B'
        },
        p: {
          type: null
        }
      }, {
        e: {
          u     : 'B',
          v     : 'C',
          source: 'B',
          target: 'C'
        },
        p: {
          type: null
        }
      }, {
        e: {
           u     : 'C',
           v     : 'B',
           source: 'C',
           target: 'B'
        },
        p: {
          type: 'reverse'
        }
      }
    ]);
  });
});
