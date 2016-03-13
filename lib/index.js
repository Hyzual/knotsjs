var fs    = require('fs');
var acorn = require('acorn');
var walk  = require('acorn/dist/walk.js');

fs.readFile('lib/queue.js', 'utf8', function(err, data) {
  // console.log(data);

  var parsed = acorn.parse(data);

  // console.log(parsed);
  walk.simple(parsed, {
    CallExpression     : onCallExpression,
    FunctionDeclaration: onFunctionDeclaration,
    MemberExpression   : onMemberExpression
  },
  null,
  'yolo');
});

function onFunctionDeclaration(node) {
  // console.log(node.id.name);
}

function onCallExpression(node) {
  if (node.callee.name) {
    console.log(node.callee.name);
  }
}

function onMemberExpression(node, state) {
  var name = '';
  console.log('state', state);

  if (node.object.name) {
    name += node.object.name;
  }

  if (! node.callee) {
    console.log('not callee', node);
    name += '.' + node.property.name + '()';
  }

  console.log(name);

  return name;
}
