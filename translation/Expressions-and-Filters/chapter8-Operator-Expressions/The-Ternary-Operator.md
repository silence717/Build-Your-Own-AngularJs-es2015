## 三元运算符（ The Ternary Operator）
在本章实现的最后一个运算符是C-style的三元运算符，可以基于测试表达式返回一个或者两个可以选择的的值：
```js
it('parses the ternary expression', function() {
  expect(parse('a === 42 ? true : false')({a: 42})).toBe(true);
  expect(parse('a === 42 ? true : false')({a: 43})).toBe(false);
});
```
三元运算符在优先级队列仅仅在 OR 之下，所以 OR 首先会被计算：
```js
it('parses OR with a higher precedence than ternary', function() {
  expect(parse('0 || 1 ? 0 || 2 : 0 || 3')()).toBe(2);
});
```
你可以嵌套三元运算符，虽然你可以质疑这么做代码不会清晰：
```js
it('parses nested ternaries', function() {
  expect(
    parse('a === 42 ? b === 42 ? "a and b" : "a" : c === 42 ? "c" : "none"')({
      a: 44,
      b: 43,
      c: 42
  })).toEqual('c');
});
```
与在这章看到的大多数操作符不一样的是，三元运算符的实现不能作为`OPERATORS`对象的一个运算符函数。由于运算符有不同的两部分 - `?`和`:` - 它们的存在使在AST构建阶段更加方便。

Lexer需要为`?`字符返回什么，到目前为止我们还没有做。改变`Lexer.lex`考虑文本token到：
```js
} else if (this.is('[],{}:.()?')) {
```
在AST中我们引入一个新函数`ternary`用于构建这个运算符。它consumes这三元运算符像运算符本身的两部分，并且返回一个`ConditionalExpression`节点：
```js
AST.prototype.ternary = function() {
  var test = this.logicalOR();
  if (this.expect('?')) {
    var consequent = this.assignment();
    if (this.consume(':')) {
      var alternate = this.assignment();
      return {
        type: AST.ConditionalExpression,
        test: test,
        consequent: consequent,
        alternate: alternate
      };
    }
  }
  return test;
};
```
注意"中间"和"右边"表达式可以是任意表达式，因为我们consume他们作为assignments。另外，该方法对`logicalOR`有一个回调，一旦察觉表达式随之而来的是`?`部分，可供代替`:`
的部分是需要的，并且没有回调函数。这是因为我们为它使用`consume`，在不匹配的时候会抛出异常。

`ConditionalExpression`节点类型需要引入：
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
AST.ConditionalExpression = 'ConditionalExpression';
```
再一次我们需要从修改下一个运算符查找,从`assignment`到`ternary`:
```js
AST.prototype.assignment = function() {
    var left = this.ternary();
    if (this.expect('=')) {
    var right = this.ternary();
        return {type: AST.AssignmentExpression, left: left, right: right};
    }
    return left;
};
```
当`ConditionalExpression`被编译，它首先将测试表达式的值存储为一个变量：
```js
case AST.ConditionalExpression:
  var testId = this.nextId();
  this.state.body.push(this.assign(testId, this.recurse(ast.test)));
```
然后根据测试表达式的值执行后续或者替代表达式的值。其中的一个作为表达式的值返回：
```js
case AST.ConditionalExpression:
    intoId = this.nextId();
    var testId = this.nextId();
    this.state.body.push(this.assign(testId, this.recurse(ast.test)));
    this.if_(testId,
      this.assign(intoId, this.recurse(ast.consequent)));
    this.if_(this.not(testId),
      this.assign(intoId, this.recurse(ast.alternate)));
    return intoId;
```
运算符最终的优先级顺序可以逆向阅读AST的构建方法:
```
1. Primary expressions: Lookups, function calls, method calls.
2. Unary expressions: +a, -a, !a.
3. Multiplicative arithmetic expressions: a * b, a / b, and a % b.
4. Additive arithmetic expressions: a + b and a - b.
5. Relational expressions: a < b, a > b, a <= b, and a >= b.
6. Equality testing expressions: a == b, a != b, a === b, and a !== b.
7. Logical AND expressions: a && b.
8. Logical OR expressions: a || b.
9. Ternary expressions:a ? b : c.
10. Assignments: a = b.
```