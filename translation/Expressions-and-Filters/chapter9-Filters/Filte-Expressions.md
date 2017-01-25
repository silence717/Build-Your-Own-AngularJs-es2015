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
我们现在期望compiler的`filter`方法返回一个表达式，在运行时候计算用户想应用的filter函数。我们知道获取它需要使用filter服务，但是怎么样把它嵌入到表达式生成的JavaScript呢？

首先，在运行的时候在某些变量里面我们期望filter函数是有效的。我们仅仅生成一个变量并返回它：
```js
ASTCompiler.prototype.filter = function(name) {
  var filterId = this.nextId();
  return filterId;
};
```
这个变量在我们没有写任何东西或者没有赋值给它的时候自然地是`undefined`。我们需要以某种方式将filter函数赋值给它。具体来说，我们需要生成一些代码从filter服务中
获取过滤器，并在运行时将它放入变量。

我们将需要在表达式之前跟踪那些已经使用的filter是否可用。我们可以将信息存储在compiler的状态中，使用一个新属性：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {
    body: [],
    nextId: 0,
    vars: [],
    filters: {}
  };
  // ...
};
```
当`filter`被调用，我们将存储信息在状态对象中。我们可以使用filter的名称作为key,并且filter应该将变量的名字作为value值：
```js
ASTCompiler.prototype.filter = function(name) {
  var filterId = this.nextId();
  this.state.filters[name] = filterId;
  return  filterId;
};
```
如果filter已经被使用，我们应该重复使用最后一次生成的变量名而不是生成一个新的：
```js
ASTCompiler.prototype.filter = function(name) {
    if (!this.state.filters.hasOwnProperty(name)) {
      this.state.filters[name] = this.nextId();
    }
    return this.state.filters[name];
};
```
在这个点上，一旦AST被递归，`state.filter`将会包含所有的在表达式里使用的filter。现在我们需要为filter中的变量生成代码。为了在运行时有`filter`服务，我们将它
传递到生成的函数，就像之前的完成的其他几个函数一样：
```js
return new Function(
  'ensureSafeMemberName',
  'ensureSafeObject',
  'ensureSafeFunction',
  'ifDe ned',
  'filter',
fnString)(
  ensureSafeMemberName,
  ensureSafeObject,
  ensureSafeFunction,
  ifDefined,
  filter);

```
`filter`服务之前没有被引入`parse.js`，现在这么做：
```js
'use strict';
var _ = require('lodash');
var  lter = require('./filter').filter;
```
用于查找filter的JavaScript代码是我们首先要生成的函数.我们将在一个帮助函数`filterPrefix`实现它：

```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {
    body: [],
    nextId: 0,
    vars: [],
     lters: {}
  };
  this.recurse(ast);
  var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
        (this.state.vars.length ?
          'var ' + this.state.vars.join(',') + ';' :
    ''
    )+ this.state.body.join('') + '}; return fn;';
    // ...
};
```
如果没有在表达式里应用filter这个方法将返回一个空字符串：
```js
ASTCompiler.prototype.filterPrefix = function() {
  if (_.isEmpty(this.state. lters)) {
    return '';
  } else {
  }
};
```
如果这里有filter,这个方法将构建一个变量初始化的几个，并且为它们生成一个`var`声明：
```js
ASTCompiler.prototype.filterPrefix = function() {
  if (_.isEmpty(this.state. lters)) {
    return '';
  } else {
    var parts = [];
    return 'var ' + parts.join(',') + ';';
  }
};
```
每个filter使用的时候，我们返回一个之前在`ASTCompiler.prototype.filter`生成的变量名称，并且使用`filter`服务初始化查找filter,我们现在可以生成代码：
```js
ASTCompiler.prototype.filterPrefix = function() {
  if (_.isEmpty(this.state. lters)) {
    return '';
  } else {
    var parts = _.map(this.state. lters, _.bind(function(varName,  lterName) {
      return varName + '=' + ' lter(' + this.escape( lterName) + ')';
    }, this));
    return 'var ' + parts.join(',') + ';';
  }
};
```
这里还有一个问题，即当我们使用`nextId`生成变量名称,我们也会将它们加入到`vars`状态的变量，因为这是`nextId`做的。这意味着它们实际上会在表达式函数里面声明，
这样会覆盖我们刚刚创建的filter变量。如果我们有一个下面这样的表达式，实际上是：
```js
42 | increment
```
生成的东西是这样的：
```js
function(ensureSafeMemberName, ensureSafeObject, ensureSafeFunction,
         ifDefined, filter) {
    var v0 =  lter('increment');
    var fn = function(s, l) {
        var v0;
        return v0(42);
  };
  return fn;
}
```
第二个`var v0`就是问题。我们能做的是采用一种特殊的标记调用`nextId`去告诉它，只生成变量id而不声明 - 因为我们将在`filterPrefix`中单独处理声明：
```js
ASTCompiler.prototype. lter = function(name) {
  if (!this.state. lters.hasOwnProperty(name)) {
    this.state. lters[name] = this.nextId(true);
  }
  return this.state. lters[name];
};
```
在`nextId`中我们仅仅只有在标识为假的时候将生成id存储到`state.vars`中，这对所有变量都是一样的除了从`filter`生成的：
```js
ASTCompiler.prototype.nextId = function(skip) {
    var id = 'v' + (this.state.nextId++);
    if (!skip) {
      this.state.vars.push(id);
    }
    return id;
};
```
现在我们又通过了一个测试套件。我们能敢在表达式中应用过滤器！