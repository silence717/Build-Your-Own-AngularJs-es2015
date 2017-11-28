## External Assignment
当一个表达式求值时，点通常在当前作用域上获取他们的值。这就是Angular的整个数据绑定系统的基础。

在一些情况中，调用表达式的不同模式被调用。即在作用域上为它们赋新值。这样的模式通过表达式函数的`assign`方法暴露出来。

例如，如果你有一个类似于`a.b`的表达式。你可以在scope上调用它：
```js
var exprFn = parse('a.b');
var scope = {a: {b: 42}};
```
exprFn(scope); // => 42
你可以在Scope上为它赋值，这意味着我们确实可以在给的的scope上去替换表达式的值：
```js
var exprFn = parse('a.b');
var scope = {a: {b: 42}};
exprFn.assign(scope, 43);
scope.a.b; // => 43
```
在本书的后面，我们将利用`assign`来实现隔离作用域的双向绑定。

实际上是将`AssignmentExpression`的逻辑作为一个函数暴露在外部。表示为测试用例，我们可以为简单identifiers和嵌套成员赋值：
```js
it('allows calling assign on identi er expressions', function() {
  var fn = parse('anAttribute');
  expect(fn.assign).toBeDefined();
  var scope = {};
  fn.assign(scope, 42);
  expect(scope.anAttribute).toBe(42);
 });
it('allows calling assign on member expressions', function() {
    var fn = parse('anObject.anAttribute');
    expect(fn.assign).toBeDefined();
    var scope = {};
    fn.assign(scope, 42);
    expect(scope.anObject).toEqual({anAttribute: 42});
});
```
我们要做的是生成不止一个表达式函数，作为主表达式函数的`assign`方法。它有自己的编译器状态和compiler平台：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
    filters: {},
    assign: {body: [], vars: []},
    inputs: [] };
    this.stage = 'inputs';
    _.forEach(getInputs(ast.body), _.bind(function(input, idx) {
      var inputKey = 'fn' + idx;
      this.state[inputKey] = {body: [], vars: []};
      this.state.computing = inputKey;
      this.state[inputKey].body.push('return ' + this.recurse(input) + ';');
      this.state.inputs.push(inputKey);
    }, this));
    this.stage = 'assign';
    this.stage = 'main';
  this.state.computing = 'fn';
  this.recurse(ast);
  // ...
};
```
如果可以为表达式形成叫做"assignable AST"，那么`assign`方法就会产生：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  markConstantAndWatchExpressions(ast);
  this.state = {
    nextId: 0,
    fn: {body: [], vars: []},
    filters: {},
    assign: {body: [], vars: []},
    inputs: []
  };
  this.stage = 'inputs';
  _.forEach(getInputs(ast.body), _.bind(function(input, idx) {
    var inputKey = 'fn' + idx;
    this.state[inputKey] = {body: [], vars: []};
    this.state.computing = inputKey;
    this.state[inputKey].body.push('return ' + this.recurse(input) + ';');
    this.state.inputs.push(inputKey);
  }, this));
  this.stage = 'assign';
  var assignable = assignableAST(ast);
  if (assignable) {
  }
  this.stage = 'main';
  this.state.computing = 'fn';
  this.recurse(ast);
  // ...
};
```
如果表达式只要一个语句，它的类型是identifier或者member，那么一个assignable AST就形成了：
```js
function isAssignable(ast) {
  return ast.type === AST.Identi er || ast.type == AST.MemberExpression;
}
function assignableAST(ast) {
  if (ast.body.length == 1 && isAssignable(ast.body[0])) {

  }
}
```
事实上assignable AST是将原始的表达式包裹在`AST.AssignmentExpression`里面。赋值的右边是特殊的 - 它的类型是`AST.NGValueParameter`，并且表示在运行时
提供的参数化值。它本质上对于值来说是一个当赋值发生时的占位符：
```js
function assignableAST(ast) {
  if (ast.body.length == 1 && isAssignable(ast.body[0])) {
    return {
      type: AST.AssignmentExpression,
      left: ast.body[0],
      right: {type: AST.NGValueParameter}
    };
  }
}
```
现在我们（可能）有assignable AST，我们可以继续并且使用`recurse`编译：
```js
ASTCompiler.prototype.compile = function(text) {
  //...
  if (assignable) {
    this.state.computing = 'assign';
    this.state.assign.body.push(this.recurse(assignable));
  }
  //...
}
```
从编译的结果我们可以生成赋值函数。它需要3个参数：一个Scope，赋值的值，和locals。我们将这个函数的代码放到一个新的变量叫做`extra`，并且把它附加到主表达式函数：
```js
ASTCompiler.prototype.compile = function(text) {
  var extra = '';
  //...
  if (assignable) {
    this.state.computing = 'assign';
    this.state.assign.body.push(this.recurse(assignable));
  extra = 'fn.assign = function(s,v,l){' +
    (this.state.assign.vars.length ?
      'var ' + this.state.assign.vars.join(',') + ';' :
  ''
  )+ this.state.assign.body.join('') + '};';
  }
  //...
}
```
现在唯一缺少的部分就是在`recurse`的`NGValueParameter`节点编译。它的工作是在生成的代码中指定分配给外部`assign`的参数的位置。我们给这个参数在生成的代码中的名称是
`v`,所以我们可以简单地编译AST节点给`v`并且落入地方：
```js
case AST.NGValueParameter:
  return 'v';
```