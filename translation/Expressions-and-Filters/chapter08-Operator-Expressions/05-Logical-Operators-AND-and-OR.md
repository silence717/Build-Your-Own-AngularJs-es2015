## 逻辑操作符 与和或（ Logical Operators AND and OR）

剩下的两个 binary 运算符我们打算实现的逻辑运算符&&和||。他们在表达式的功能正是你所期望的：
```js
it('parses logical AND', function() {
  expect(parse('true && true')()).toBe(true);
  expect(parse('true && false')()).toBe(false);
});
it('parses logical OR', function() {
  expect(parse('true || true')()).toBe(true);
  expect(parse('true || false')()).toBe(true);
  expect(parse('false || false')()).toBe(false);
});
```

就像其他的 binary 操作符一样，你可以把几个逻辑操作符串联在一起:
```js
it('parses multiple ANDs', function() {
  expect(parse('true && true && true')()).toBe(true);
  expect(parse('true && true && false')()).toBe(false);
});
it('parses multiple ORs', function() {
  expect(parse('true || true || true')()).toBe(true);
  expect(parse('true || true || false')()).toBe(true);
  expect(parse('false || false || true')()).toBe(true);
  expect(parse('false || false || false')()).toBe(false);
});
```

An interesting detail about logical operators is that they are short-circuited.
When the left hand side of an AND expression is falsy,
the right hand side expression does not get evaluated at all, just like it would not in JavaScript:

一个关于逻辑运算符的有趣的细节是他们是short-circuited。当一个表达式的左手边是假的，表达式右边根本不会执行，在JavaScript里面不是这样的：
```js
it('short-circuits AND', function() {
  var invoked;
  var scope = {fn: function() { invoked = true; }};
  parse('false && fn()')(scope);
  expect(invoked).toBeUnde ned();
});
```
相应地，如果左边或者一个或表达式是真的，右边的是不会被执行的：
```js
it('short-circuits OR', function() {
  var invoked;
  var scope = {fn: function() { invoked = true; }};
  parse('true || fn()')(scope);
  expect(invoked).toBeUnde ned();
});
```
In precedence order, AND comes before OR:
在优先级顺序，并且先于或：
```js
it('parses AND with a higher precedence than OR', function() {
  expect(parse('false && true || true')()).toBe(true);
});
```
这里我们测试表达式`(false && true) || true` 而不是 `false && (true || true)`。

在优先级上等值运算优先OR和AND：
```js
it('parses OR with a lower precedence than equality', function() {
  expect(parse('1 === 2 || 2 === 2')()).toBeTruthy();
});
```
这些操作符的实现方式是我们现在熟悉的一个模式。在`OPERATORS`对象里面又两个实体：
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
  '||': true
};
```
在AST builder里面我们有两个新函数将操作符构建为`LogicalExpression`节点 - 一个用于OR，一个用于`AND`：
```js
AST.prototype.logicalOR = function() {
  var left = this.logicalAND();
  var token;
  while ((token = this.expect('||'))) {
    left = {
      type: AST.LogicalExpression,
      left: left,
      operator: token.text,
      right: this.logicalAND()
    };
  }
  return left;
};
AST.prototype.logicalAND = function() {
  var left = this.equality();
  var token;
  while ((token = this.expect('&&'))) {
    left = {
      type: AST.LogicalExpression,
      left: left,
      operator: token.text,
      right: this.equality()
    };
  }
  return left;
};
```
`LogicalExpression`类型是新的：
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
AST.UnaryExpression = 'UnaryExpression';
AST.BinaryExpression = 'BinaryExpression';
AST.LogicalExpression = 'LogicalExpression';
```
再次，由于我们会遵守操作符的优先级下行，这些操作符会插入构建链的右边在`assigment`:
```js
AST.prototype.assignment = function() {
    var left = this.logicalOR();
    if (this.expect('=')) {
    var right = this.logicalOR();
        return {type: AST.AssignmentExpression, left: left, right: right};
    }
    return left;
};
```
在AST compiler里面，我们对`AST.LogicalExpression`有一个新分支，首先递归左边的argument，并且存储他的值作为整个表达式的结果：
```js
case AST.LogicalExpression:
  intoId = this.nextId();
  this.state.body.push(this.assign(intoId, this.recurse(ast.left)));
  return intoId;
```
接着生成一个条件计算右手边的值，如果左边的值是真的（在&&的情况下）或者假的（在||的情况下）。如果右边的值被计算，他的值将成为整个表达式的值：
```js
case AST.LogicalExpression:
  intoId = this.nextId();
  this.state.body.push(this.assign(intoId, this.recurse(ast.left)));
  this.if_(ast.operator === '&&' ? intoId : this.not(intoId),
    this.assign(intoId, this.recurse(ast.right)));
  return intoId;
```
这里我们已经实现了`&&`和`||`在`if`条件下。这种特殊的 short-circuiting 行为就是为什么我们没有将 AND 和 OR作为`BinaryExpression`节点，即使他们严格来说是binary表达式。