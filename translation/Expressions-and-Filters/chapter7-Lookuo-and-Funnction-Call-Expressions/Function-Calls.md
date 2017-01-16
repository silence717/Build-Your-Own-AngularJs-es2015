### 函数调用
在Angular表达式中，除了查找东西，函数调用也是很常见的：
```js
it('parses a function call', function() {
  var fn = parse('aFunction()');
  expect(fn({aFunction: function() { return 42; }})).toBe(42);
});
```
函数调用有一个东西需要理解，那真的有两件事情：首先你需要查找哪个函数被调用，在上面表达式中为`aFunction`,然后你使用括号调用函数。查找部分与查找属性没什么不同。
毕竟，在JavaScript里，函数与其他values没什么不同。

这意味着我们可以使用已经看到的函数代码，待做的就是调用。让我们在Lexer中添加括号作为字符token。
```js
**} else if (this.is('[],{}:.()')) {**
    this.tokens.push({
      text: this.ch
    });
    this.index++;
```
函数调用组我诶基本的AST节点，就想属性访问。在`AST.primary`的`while`循环中我们不仅要consume方括号和点，还有(。当我们遇到一个，我们可以生成`CallExpression`
节点，并且设置上一个基本表达式作为调用方：
```js
var next;
while ((next = this.expect('.', '[', '('))) {
    if (next.text === '[') {
      primary = {
        type: AST.MemberExpression,
        object: primary,
        property: this.primary(),
        computed: true
      };
      this.consume(']');
    } else if (next.text === '.') {
        primary = {
          type: AST.MemberExpression,
          object: primary,
          property: this.identi er(),
          computed: false
        };
    } else if (next.text === '(') {
      primary = {type: AST.CallExpression, callee: primary};
      this.consume(')');
    }
}
```
`CallExpression`常量需要定义：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identi er = 'Identi er';
AST.ThisExpression = 'ThisExpression';
AST.LocalsExpression = 'LocalsExpression';
AST.MemberExpression = 'MemberExpression';
AST.CallExpression = 'CallExpression';
```
现在我们准备编译call表达式为JavaScript。我们首先通过递归获取`callee`被调用的函数，当被调用的函数存在的时候生成JavaScript函数：
```js
case AST.CallExpression:
  var callee = this.recurse(ast.callee);
  return callee + '&&' + callee + '()';
```
当然，大多数函数调用并不像我们看到的那样简单。你经常做的函数传参，和我们目前本地实现的函数没有什么。

我们应该可以处理简单的参数就像整数：
```js
it('parses a function call with a single number argument', function() {
  var fn = parse('aFunction(42)');
  expect(fn({aFunction: function(n) { return n; }})).toBe(42);
});
```
我们也应该能够处理从scope中查找其他东西的参数：
```js
it('parses a function call with a single identifier argument', function() {
  var fn = parse('aFunction(n)');
  expect(fn({n: 42, aFunction: function(arg) { return arg; }})).toBe(42);
});
```
一些参数将调用他们自己:
```js
it('parses a function call with a single function call argument', function() {
  var fn = parse('aFunction(argFn())');
  expect(fn({
    argFn: _.constant(42),
    aFunction: function(arg) { return arg; }
  })).toBe(42);
});
```
当然有可能是以上所有的组合，多个参数使用逗号分隔：
```js
it('parses a function call with multiple arguments', function() {
  var fn = parse('aFunction(37, n, argFn())');
  expect(fn({
    n: 3,
    argFn: _.constant(2),
    aFunction: function(a1, a2, a3) { return a1 + a2 + a3; }
  })).toBe(42);
});
```
在这些测试里面，我们在`parse_spec.js`中需要引用LoDash:
```js
'use strict';
var _ = require('lodash');
var parse = require('../src/parse');
```
在AST builder中，我们应该准备解析开始(和关闭)之间的任何数据。我们将在新方法`parseArguments`中处理它：
```js
} else if (next.text === '(') {
  primary = {
    type: AST.CallExpression,
    callee: primary,
    arguments: this.parseArguments()
  };
  this.consume(')');
```
这个方法收集基本表达式知道看到)括号，和我们处理数组使用同样的方式 - 除去我们不支持最后一个逗号：
```js
AST.prototype.parseArguments = function() {
  var args = [];
  if (!this.peek(')')) {
    do {
      args.push(this.primary());
    } while (this.expect(','));
  }
  return args;
};
```
当我们将这些参数表达式编译为JavaScript时候，我们递归到每一个并且将结果收集到一个数组中：
```js
case AST.CallExpression:
    var callee = this.recurse(ast.callee);
    var args = _.map(ast.arguments, _.bind(function(arg) {
      return this.recurse(arg);
    }, this));
    return callee + '&&' + callee + '()';
```
然后，我们可以将参数表达式加入到生成的函数中：
```js
case AST.CallExpression:
  var callee = this.recurse(ast.callee);
  var args = _.map(ast.arguments, _.bind(function(arg) {
    return this.recurse(arg);
  }, this));
  return callee + '&&' + callee + '(' + args.join(',') + ')';
```