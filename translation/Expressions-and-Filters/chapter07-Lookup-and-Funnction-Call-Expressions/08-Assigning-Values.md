## 赋值
现在我们继续看一下表达式不仅可以在scope上访问数据，而且使用assignments可以给scope赋值。例如，表达式给scope的属性赋值是完全合法的：
```js
it('parses a simple attribute assignment', function() {
  var fn = parse('anAttribute = 42');
  var scope = {};
  fn(scope);
  expect(scope.anAttribute).toBe(42);
});
```
指定的值不必是简单的literal。它可以是任何基本的表达式，就像函数调用：
```js
it('can assign any primary expression', function() {
  var fn = parse('anAttribute = aFunction()');
  var scope = {aFunction: _.constant(42)};
  fn(scope);
  expect(scope.anAttribute).toBe(42);
});
```
你不仅可以给简单的identifiers，而且可以是computed和non-computed属性访问，并且可以是它们嵌套：
```js
it('can assign a computed object property', function() {
  var fn = parse('anObject["anAttribute"] = 42');
  var scope = {anObject: {}};
  fn(scope);
  expect(scope.anObject.anAttribute).toBe(42);
});
it('can assign a non-computed object property', function() {
  var fn = parse('anObject.anAttribute = 42');
  var scope = {anObject: {}};
  fn(scope);
  expect(scope.anObject.anAttribute).toBe(42);
});
it('can assign a nested object property', function() {
  var fn = parse('anArray[0].anAttribute = 42');
  var scope = {anArray: [{}]};
  fn(scope);
  expect(scope.anArray[0].anAttribute).toBe(42);
});
```
正如本章的新功能，我们将开始由Lexer返回的token给AST builder使用。是时候我们需要一个符号`=`，这意味着赋值：
```js
} else if (this.is('[],{}:.()=')) {
    this.tokens.push({
      text: this.ch
    });
    this.index++;
```
赋值不是我们一直称作的一个基本AST节点，也不像大多数我们见过的，它的AST不是我们目前存在的`AST.primary`函数所构建的。它将有一个自己的的函数，我们叫它`assignment`。
在它中，我们开始使用左边token,他是一个基本节点。紧跟着左边的token是等号，然后是右边，是另一个基本节点：
```js
AST.prototype.assignment = function() {
  var left = this.primary();
  if (this.expect('=')) {
    var right = this.primary();
  }
  return left;
};
```
将`left`和`right`子表达式组合在一起形成`AssignmentExpression`:
```js
AST.prototype.assignment = function() {
  var left = this.primary();
  if (this.expect('=')) {
    var right = this.primary();
    return {type: AST.AssignmentExpression, left: left, right: right};
  }
  return left;
};
```
我们需要定义`AssignmentExpression`常量：
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
AST.AssignmentExpression = 'AssignmentExpression';
```
在AST builder中剩下的问题就是`assignment`现在是一个"孤立"方法：它没有被调用。

注意我们是如何创建`assignment`的，检查左边后面是否跟着一个等号。如果没有等号，那么将返回左边本身。这意味着我们可以使用`assignment`去构建一个赋值表达式
或者只是一个简单的基本表达式。我们试图在下一张中看到更多的对象，试图建立一些东西。现在我们仅仅需要将`program`中调用`primary`的替换为调用`assignment`,
这将会覆盖到所有的表达式，不管是赋值还是别的什么：
```js
AST.prototype.program = function() {
  return {type: AST.Program, body: this.assignment()};
};
```
赋值也包含数组，因此我们改变数组表达式中调用的方法：
```js
AST.prototype.arrayDeclaration = function() {
    var elements = [];
    if (!this.peek(']')) {
      do {
        if (this.peek(']')) {
            break;
        }
        elements.push(this.assignment());
    } while (this.expect(','));
  }
  this.consume(']');
  return {type: AST.ArrayExpression, elements: elements};
};
```
对象表达式中的value也一样 - 但不是key,因为他们是字符串：
```js
AST.prototype.object = function() {
  var properties = [];
  if (!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      if (this.peek().identi er) {
        property.key = this.identi er();
      } else {
        property.key = this.constant();
      }
      this.consume(':');
      property.value = this.assignment();
      properties.push(property);
    } while (this.expect(','));
  }
  this.consume('}');
  return {type: AST.ObjectExpression, properties: properties};
};
```
函数的参数也是一样：
```js
AST.prototype.parseArguments = function() {
  var args = [];
  if (!this.peek(')')) {
    do {
        args.push(this.assignment());
    } while (this.expect(','));
  }
  return args;
};
```
在AST compiler中，我们先处理左边的 - 标识符或者成员赋值。我们使用前一章节context的功能收集进入递归的信息:
```js
case AST.AssignmentExpression:
  var leftContext = {};
  this.recurse(ast.left, leftContext);
```
生成左边的赋值表达式是不同的，他们取决于左边是否为computed：
```js
case AST.AssignmentExpression:
    var leftContext = {};
    this.recurse(ast.left, leftContext);
    var leftExpr;
    if (leftContext.computed) {
      leftExpr = this.computedMember(leftContext.context, leftContext.name);
    } else {
      leftExpr = this.nonComputedMember(leftContext.context, leftContext.name);
    }
```
赋值本身是左边和右边的组合，由`=`分隔：
```js
case AST.AssignmentExpression:
  var leftContext = {};
  this.recurse(ast.left, leftContext);
  var leftExpr;
  if (leftContext.computed) {
    leftExpr = this.computedMember(leftContext.context, leftContext.name);
  } else {
    leftExpr = this.nonComputedMember(leftContext.context, leftContext.name);
  }
  return this.assign(leftExpr, this.recurse(ast.right));
```
在Angular表达式中有一个有意思的事情就是嵌套赋值，如果路径中的对象不存在，他们是在飞行中创造的(they are created on the fly):
```js
it('creates the objects in the assignment path that do not exist', function() {
  var fn = parse('some["nested"].property.path = 42');
  var scope = {};
  fn(scope);
  expect(scope.some.nested.property.path).toBe(42);
});
```
这与JavaScript的做法形成了鲜明的对比。JavaScript由于`some`不存在，使用`some["nested"]`将会出现一个错误。Angular表达式引擎会很乐意复制给它。

这个使用给`recurse`传递一个新的，第三个参数完成，它将知道创建一个不存在的对象。我们传递一个`true`当左边赋值的时候：
```js
case AST.AssignmentExpression:
  var leftContext = {};
  this.recurse(ast.left, leftContext, true);
  // ...
```
在`recurse`中我们接收这个参数：
```js
ASTCompiler.prototype.recurse = function(ast, context, create) {
// ...
};
```
当处理`MemberExpressions`我们需要检查一下是否需要创建没有的对象。如果需要，我们给member赋值一个空对象。我们需要分别处理computed和non-computed的情况：
```js
case AST.MemberExpression:
  intoId = this.nextId();
  var left = this.recurse(ast.object);
  if (context) {
    context.context = left;
  }
  if (ast.computed) {
    var right = this.recurse(ast.property);
    if (create) {
      this.if_(this.not(this.computedMember(left, right)),
        this.assign(this.computedMember(left, right), '{}'));
    }
    this.if_(left,
        this.assign(intoId, this.computedMember(left, right)));
      if (context) {
        context.name = right;
        context.computed = true;
      }
  } else {
    if (create) {
      this.if_(this.not(this.nonComputedMember(left, ast.property.name)),
        this.assign(this.nonComputedMember(left, ast.property.name), '{}'));
    }
    this.if_(left,
      this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
      if (context) {
        context.name = ast.property.name;
        context.computed = false;
      }
  }
  return intoId;
```
这样我们考虑到了最后一个成员表达式，但是对于嵌套表达式像我们其中的一个测试用例，我们需要递归的将`create`标识传递到下一个左边表达式：
```js
case AST.MemberExpression:
    intoId = this.nextId();
    var left = this.recurse(ast.object, unde ned, create);
    // ...
```
路径将在`Identifier`表达式终止。它应该能够在scope上创建一个空对象，如果不存在，我们应该创建一个缺少的对象。我们将在locals和scope都匹配不道德时候去做：
```js
case AST.Identifier:
    intoId = this.nextId();
    this.if_(this.getHasOwnProperty('l', ast.name),this.assign(intoId, this.nonComputedMember('l', ast.name)));
    if (create) {
      this.if_(this.not(this.getHasOwnProperty('l', ast.name)) +
               ' && s && ' +
               this.not(this.getHasOwnProperty('s', ast.name)),
        this.assign(this.nonComputedMember('s', ast.name), '{}'));
    }
    this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',
      this.assign(intoId, this.nonComputedMember('s', ast.name)));
    if (context) {
      context.context = this.getHasOwnProperty('l', ast.name) + '?l:s';
      context.name = ast.name;
      context.computed = false;
}
return intoId;
```