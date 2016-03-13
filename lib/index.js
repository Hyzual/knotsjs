var acorn = require('acorn');

console.log('acorn', acorn);
acorn.parse('function a() { var x = "yolo"; }');
