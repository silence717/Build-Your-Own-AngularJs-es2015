## Multiplicative Operators
unary操作符完了，高级别的运算符就是数字多元运算符：乘法、除法和余数。不出所料，他们的工作和在JavaScript中一样：

```js
it('parses a multiplication', function() {
  expect(parse('21 * 2')()).toBe(42);
});
it('parses a division', function() {
  expect(parse('84 / 2')()).toBe(42);
});
it('parses a remainder', function() {
  expect(parse('85 % 43')()).toBe(42);
});
```
First we’ll put them in the collection of OPERATORS so that they will be emitted by the Lexer:
首先我们将他们放在`OPERATORS`的集合里面，再从Lexer返回token:

```js
var OPERATORS = {
  '+': true,
  '!': true,
  '-': true,
  '*': true,
  '/': true,
  '%': true
};
```
在AST builder里面这些操作符被一个叫做`multiplicative`的新方法处理。它返回一个`BinaryExpression`节点（这意味着一个表达式有两个参数）。左边和右边的表达式参数都期望是一个一元表达式：

```js
AST.prototype.multiplicative = function() {
    var left = this.unary();
    var token;
    if ((token = this.expect('*', '/', '%'))) {
	    left = {
	      type: AST.BinaryExpression,
	      left: left,
	      operator: token.text,
	      right: this.unary()
		}; 
	}
  return left;
};
```
注意到之前的AST builder里面的方法，这些方法都有一个回调模式：如果匹配不到一个多元表达式，它将返回一个一元表达式。

需要添加一个AST新节点：

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
```
现在，在`AST.assignment`里面我们使用`multiplicative`去替换`unary`以便于多元操作符可以被真实应用：

```js
AST.prototype.assignment = function() {
	var left = this.multiplicative();
	if (this.expect('=')) {
		var right = this.multiplicative();
		return {type: AST.AssignmentExpression, left: left, right: right};
	}
    return left;
};
```

在AST compiler里面，我们需要添加对binary表达式的支持。他们和unary表达式真的非常相似。不同的是有两个操作数：一个在操作符的左边，另一个在右边。

```js
case AST.BinaryExpression:
  return '(' + this.recurse(ast.left) + ')' +
    ast.operator +
    '(' + this.recurse(ast.right) + ')';
```

在这个章节开始的部分，我们讨论了优先级规则的重要性。现在我们开始关注它们如何真实的被定义。而不是有一个特殊的“优先级顺序表”的地方，优先级顺序隐藏在不同的AST builder函数里面调用彼此。

现在，我们的“top-level”AST builder函数是`assignment`。反过来，`assignment`调用`multiplicative`，它调用`unary`，
最后调用`primary`。每个方法首先要做的就是在他们的链中使用下一个函数来构建“左手边”的操作数。这意味着最后一个方法就是链中优先级最高的。我们目前的优先级顺序是：

```js
1. Primary
2. Unary
3. Multiplicative 
4. Assignment
```
我们将继续添加更多的多元操作符，但是如果你有好几个它们在一起会发生什么？

```js
it('parses several multiplicatives', function() {
  expect(parse('36 * 2 % 5')()).toBe(2);
});
```
由于`multiplicative`仅仅只能解析一个操作数并返回所以目前还不能工作。












