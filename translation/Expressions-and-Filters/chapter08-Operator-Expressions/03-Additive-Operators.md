## 添加操作符
在 multiplicative 操作符后面的就是添加操作符：加法和减法。我们已经将他们
用于一元的上下文，现在我们将他们作为binary函数：
```js
it('parses an addition', function() {
  expect(parse('20 + 22')()).toBe(42);
});
it('parses a subtraction', function() {
  expect(parse('42 - 22')()).toBe(20);
});
```
就像讨论的一样，在优先级上添加是在乘法后面的：
```js
it('parses multiplicatives on a higher precedence than additives', function() {
  expect(parse('2 + 3 * 5')()).toBe(17);
  expect(parse('2 + 3 * 2 + 3')()).toBe(11);
});
```
在`OPERATORS`对象中我们已经将这些操作符覆盖。在AST构建方面，我们将创建一个新方法叫做
`additive`,它看上去就像`multiplicative`操作符字符是期望的，并且下一个操作符函数调用：
```js
AST.prototype.additive = function() {
  var left = this.multiplicative();
  var token;
  while ((token = this.expect('+')) || (token = this.expect('-'))) {
      left = {
        type: AST.BinaryExpression,
        left: left,
        operator: token.text,
        right: this.multiplicative()
      };
  }
   return left;
};
```
Additive操作符在优先级顺序里面插入到assignments和multiplicative操作符中间，这意味着
`assignment`应该调用`additive`,就像`additive`调用`multiplicative`:
```js
AST.prototype.assignment = function() {
    var left = this.additive();
    if (this.expect('=')) {
    var right = this.additive();
        return {type: AST.AssignmentExpression, left: left, right: right};
    }
    return left;
};
```
当我们添加对multiplicative操作符支持的时候，由于我们已经实现了AST编译binary操作符，
这个已经使我们的测试通过！从编译器的角度来看，multiplicative和additive操作符没什么不同
- 除了一件事情:

就像我们看到的一元操作符，丢失`+`或者`-`会被当作0。这也是二进制加法和减法的情况。
一个或两个操作符丢失也会被0代替。

```js
it('substitutes undefined with zero in addition', function() {
  expect(parse('a + 22')()).toBe(22);
  expect(parse('42 + a')()).toBe(42);
});
it('substitutes undefined with zero in subtraction', function() {
  expect(parse('a - 22')()).toBe(-22);
  expect(parse('42 - a')()).toBe(42);
});
```

编译代码的参数需要被`ifDefined`包裹，但是仅仅对加法和减法：
```js
case AST.BinaryExpression:
    if (ast.operator === '+' || ast.operator === '-') {
      return '(' + this.ifDe ned(this.recurse(ast.left), 0) + ')' +
        ast.operator +
        '(' + this.ifDe ned(this.recurse(ast.right), 0) + ')';
    } else {
    return '(' + this.recurse(ast.left) + ')' +
      ast.operator +
      '(' + this.recurse(ast.right) + ')';
    }
    break;
```