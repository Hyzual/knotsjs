describe("dependencies -", function() {
  var dependencies;

  beforeEach(function() {
    dependencies = require('../lib/dependencies.js');
  });

  it("should be true", function() {
    expect(dependencies).toBeDefined();
  });
});
