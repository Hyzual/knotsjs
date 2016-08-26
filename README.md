# knotsjs
> Untie the knots in your source code ⛓

[![NPM version][npm-image]][npm-url]

Have you ever found yourself staring at a file someone else had written, wondering where it all starts ? You pick a place at random and look for a function that's calling it, and slowly, you painstakingly retrace the path the code takes. What if you had a map 🗺 to follow that path ?

## What knotsjs does

knotsjs will parse through the javascript code for you and identify all the functions and the links between them. Which function calls which others ? How many dependencies does this function have ? What about the _transitive_ dependencies, how many functions do my dependencies call ? knotsjs can help you see them.

Why only functions ? Because the function is the atom of code. Ultimately, it's all functions calling other functions.

knotsjs is meant to be used with other programs to display the graph of function calls. For the moment, there is only one program: [knots-electron][knots-electron] which uses electron to run on any platform and display the graph as an interactive [D3.js][d3js] graph.

[![Screenshot from knots-electron][knots-electron-screenshot]][knots-electron]

Of course feel free to use it in your own program ! See the [Usage section][#usage] below.

## Installation

```sh
$ npm install --save knotsjs
```

<a id="usage"></a>
## Usage

```js
var knots = require('knotsjs');

// Parse a file
knots.parse(file_path).then(function (dependencies) {
  console.log(dependencies);
});

// Parse all .js files recursively in a directory
knots.parseDirectory(directory_path).then(function (dependencies) {
  console.log(dependencies);
});

```

`dependencies` will be a javascript object with the following format:

```js
{
  directed_graph: DirectedGraph // A DirectedGraph created by jsgraph. Allows you to make queries and walk the graph
  edges: Array, // An array of jsgraph edges
  ordered_vertices: { // An object representing vertices (functions) ordered from functions least depended upon (functions not called by anything) at level 0 to functions most depended upon (functions called by many other functions) at the highest level. It is used by knots-electron to dislay the visual representation.
    0: Array,
    1: Array,
    ...
  },
  vertices: Object // A map of all the jsgraph vertices (functions) found in the parsed source code. The key is the function's name.
}
```

## Example of result

For example, say you have the following code:

```js
function baz() {
  // nothing
}

function bar() {
  baz();
}

function foo() {
  bar();
}
```

After running knotsjs, you will have:

- two edges (there are only two calls):

```js
{
  edges: [
    {
      e: {
        source: "bar",
        target: "baz", // bar calls baz()
        u: "bar",
        v: "baz"
      },
      p: {
        type: null
      }
    },
    {
      e: {
        source: "foo",
        target: "bar", // source and target are added by knotsjs to make it easier to use
        u: "foo",
        v: "bar" // u and v are built-in jsgraph
      },
      p: {
        type: null // This is used for reverse edges: circular dependencies
      }
    }
  ]
}
```

- three vertices (there are three functions):

```js
{
  vertices: {
    "bar": {
      name: "bar",
      p: {
        max_dependency_depth: 1, // bar calls one function, which does not call another
        max_dependent_depth: 1, // bar is called by one function, which is itself never called
        sum_transitive_dependencies: 1,
        sum_transitive_dependents: 1
      },
      u: "bar"
    },
    "baz": {
      name: "baz", // name is added by knotsjs to make it easier to use
      p: {
        max_dependency_depth: 0, // baz calls nothing
        max_dependent_depth: 2, // bar is called by bar which is itself called by foo
        sum_transitive_dependencies: 0,
        sum_transitive_dependents: 2
      },
      u: "baz" // u is built-in jsgraph
    },
    "foo": {
      name: "foo",
      p: {
        max_dependency_depth: 2, // foo calls bar which calls baz
        max_dependent_depth: 0, // This property is used to build ordered_vertices (see below)
        sum_transitive_dependencies: 2,
        sum_transitive_dependents: 0
      },
      u: "foo"
    }
  }
}
```

- and three levels in `ordered_vertices`:

```js
{
  0: [
    {
      name: "foo", // foo is first because it's not called by anyone, it will go on top on the rendered graph
      p: {...},
      u: "foo"
    }
  ],
  1: [
    {
      name: "bar", // bar is second, it's called by one function and calls another one
      ...
    }
  ],
  2: [
    {
      name: "baz", // bar goes at the bottom, it has the highest max_dependent_depth
      ...
    }
  ]
}
```

This is what the rendered graph looks like:

![Rendered graph][example-three-func]

## Limitations

- As knotsjs is still a work in progress, it currently only supports Javascript ES5. I plan to support other versions of javascript (ES 2015, Typescript) but it's just a plan right now. I also want to provide a plugin system for other languages that I use, typically PHP. For those interested in Java, the inspiration for knotsjs has been [Spoiklin Soice][spoiklin], written in Java.
- The v1.0 of this program works best on single files. For example, when using it to parse its own source code, It did not link together the functions `get` and `dependencies.get` which is how it is used in other files.
- It auto-ignores files with the extension `*_test.js`. I'll work on a way to provide options as parameter, including a glob to ignore, which will prove useful for projects that mix production and test files.

## License

GPL v3 © Joris "Hyzual" MASSON

[example-three-func]: ./media/example-three-func.png
[knots-electron-screenshot]: ./media/knots-electron.png

[d3js]: https://d3js.org
[jsgraph-doc]: https://github.com/Encapsule/jsgraph/blob/master/docs/object-DirectedGraph.md
[jsgraph]: https://www.npmjs.com/package/jsgraph
[knots-electron]: https://github.com/Hyzual/knotsjs
[npm-image]: https://badge.fury.io/js/knotsjs.svg
[npm-url]: https://npmjs.org/package/knotsjs
[spoiklin]: http://edmundkirwan.com/general/spoiklin.html
