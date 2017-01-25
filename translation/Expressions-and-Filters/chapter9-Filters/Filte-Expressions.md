## 过滤器表达式（Filter Expressions）
现在我们开始在表达式的解析中查看过滤器的实现。我们希望使用管道符在表达式中的能力去改变表达式的值。在管道符后面我们应该提供之前注册好的filter的名称，然后调用输入值：
```js
it('can parse  lter expressions', function() {
  register('upcase', function() {
    return function(str) {
      return str.toUpperCase();
    };
  });
  var fn = parse('aString | upcase');
  expect(fn({aString: 'Hello'})).toEqual('HELLO');
});
```
我们需要在测试中引入`register`函数：
```js
'use strict';
var _ = require('lodash');
var parse = require('../src/parse');
var register = require('../src/ lter').register;
```
我们处理管道符作为一个运算符表达式，因此我们将它添加到运算符的列表获取Lexer支持：
```js
var OPERATORS = {
  '+': true,
  '-': true,
  '!': true,
  '*': true,
  '/': true,
  '%': true,
  '=': true,
  '==': true,
  '!=': true,
  '===': true,
  '!==': true,
  '<': true,
  '>': true,
  '<=': true,
  '>=': true,
  '&&': true,
  '||': true,
  '|': true
};
```
当遇到单个管道符字符串的时候Lexer就会返回一个token。

下一步，我们为filter表达式创建一个AST节点。一个叫做`filter`的AST builder新方法处理它。它首先consume一个赋值表达式（或者其他更高优先级的表达式）作为左手边，
然后看它接下来是否有一个管道符：
```js
AST.prototype.filter = function() {
  var left = this.assignment();
  if (this.expect('|')) {

  }
  return left;
};
```
如果这里有一个管道符，那么`CallExpression`节点被创建。callee将是filter的名称，我们consume它作为一个identifier节点。唯一的参数调用将是早期consume的左手边：
```js
AST.prototype. lter = function() {
  var left = this.assignment();
  if (this.expect('|')) {
    left = {
      type: AST.CallExpression,
      callee: this.identifier(),
      arguments: [left]
    };
  }
  return left;
};
```
之前我们讨论的filter仅仅是函数调用。这里我们看到它具体的形式：如果函数是filter我们有一个调用表达式，并且函数的参数是filter表达式的左边。

同样我们需要在AST compiler里面做一些工作，在做之前，我们将`filter`加入AST builder的调用链中。我们已经看到`filter`如何回调`assignment`,这表明`filter`
比`assignment`的优先级更低。实际上是这样的情况 - filter表达式是所有表达式中优先级最低的。因此，它是当我们consuming一个表达式语句的时候我们首先要调用的。

```js
AST.prototype.program = function() {
  var body = [];
  while (true) {
    if (this.tokens.length) {
      body.push(this.filter());
    }
    if (!this.expect(';')) {
      return {type: AST.Program, body: body};
    }
} };
```
当使用括号重置优先级的时候，过滤器是第一个需要我们做解析的：
```js
AST.prototype.primary = function() {
  var primary;
  if (this.expect('(')) {
    primary = this. lter();
    this.consume(')');
  } else if (this.expect('[')) {
    primary = this.arrayDeclaration();
  } else if (this.expect('{')) {
    primary = this.object();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    primary = this.constants[this.consume().text];
  } else if (this.peek().identi er) {
    primary = this.identi er();
  } else {
    primary = this.constant();
  }
// ...
};
```
在AST compiler做一些对`CallExpression`有用的事情之前，它需要知道`CallExpression`是一个特殊的filter。这就是为什么在正常的call表达式，函数或者方法在Scope上
被调用（callee）是期望的，这不是过滤器的情况。我们添加一个`filter`标识符给AST节点使编译器知道它：
```js
AST.prototype.filter = function() {
  var left = this.assignment();
  if (this.expect('|')) {
    left = {
      type: AST.CallExpression,
      callee: this.identi er(),
      arguments: [left],
      filter: true
    };
  }
  return left;
};
```
在compiler里面引入一个`if`语句块，在这个块里我们可以分别处理来自其他调用表达式的过滤器调用：
```js
case AST.CallExpression:
    var callContext, callee, args;
    if (ast. lter) {

    } else {
      callContext = {};
      callee = this.recurse(ast.callee, callContext);
      args = _.map(ast.arguments, _.bind(function(arg) {
        return 'ensureSafeObject(' + this.recurse(arg) + ')';
      }, this));
      if (callContext.name) {
          this.addEnsureSafeObject(callContext.context);
          if (callContext.computed) {
            callee = this.computedMember(callContext.context, callContext.name);
          } else {
            callee = this.nonComputedMember(callContext.context, callContext.name);
          }
    }
    this.addEnsureSafeFunction(callee);
    return callee + '&&ensureSafeObject(' + callee + '(' + args.join(',') + '))';
    }
    break;
```
在这里我们需要做的是，使用一个新的叫做`filter`的帮助方法为filter的函数获取Javascript。然后我们使用`recurse`处理参数，并且返回函数和参数组合的一部分代码。
```js
case AST.CallExpression:
  var callContext, callee, args;
  if (ast.filter) {
    callee = this. lter(ast.callee.name);
    args = _.map(ast.arguments, _.bind(function(arg) {
      return this.recurse(arg);
    }, this));
    return callee + '(' + args + ')';
  } else {
    // ...
  }
  break;
```