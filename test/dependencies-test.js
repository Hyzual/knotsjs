describe("dependencies -", function() {
  var dependencies;

  beforeEach(function() {
    dependencies = require('../lib/dependencies.js');
  });

  afterEach(function() {
    dependencies.clear();
  });

  describe("Given a caller and a callee", function() {
    it("when I add a dependency between them, then two nodes will be added, a link will be added, the caller's transitive dependencies will be counted, the callee's transitive dependents will be counted and the nodes will be ordered", function() {
      dependencies.add('caller', 'callee');

      var output = dependencies.getDependencies();

      expect(output.nodes).toEqual([
        {
          name                      : 'caller',
          nb_transitive_dependencies: 1,
          nb_transitive_dependents  : 0
        }, {
          name                      : 'callee',
          nb_transitive_dependencies: 0,
          nb_transitive_dependents  : 1
        }
      ]);

      expect(output.links).toEqual([
        {
          source: output.nodes[0],
          target: output.nodes[1],
          type  : 'some_type'
        }
      ]);

      expect(output.orderedNodes).toEqual({
        0: [
          output.nodes[0],
        ],
        1: [
          output.nodes[1]
        ]
      });
    });

    it("and given I had already added a dependency between caller and other_callee, when I add a dependency between them, then the caller node won't be added twice", function() {
      dependencies.add('caller', 'other_callee');

      dependencies.add('caller', 'callee');

      var output = dependencies.getDependencies();

      expect(output.nodes).toEqual([
        {
          name: 'caller',
          nb_transitive_dependencies: 2,
          nb_transitive_dependents: 0
        }, {
          name: 'other_callee',
          nb_transitive_dependencies: 0,
          nb_transitive_dependents: 1
        }, {
          name: 'callee',
          nb_transitive_dependencies: 0,
          nb_transitive_dependents: 1
        }
      ]);

      expect(output.links).toEqual([
        {
          source: output.nodes[0],
          target: output.nodes[1],
          type: 'some_type'
        }, {
          source: output.nodes[0],
          target: output.nodes[2],
          type: 'some_type'
        }
      ]);

      expect(output.orderedNodes).toEqual({
        0: [
          output.nodes[0]
        ],
        1: [
          output.nodes[1],
          output.nodes[2]
        ]
      });
    });
  });
});
