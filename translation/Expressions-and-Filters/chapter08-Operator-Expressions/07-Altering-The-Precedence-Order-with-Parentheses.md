## 使用括号改变优先级顺序（Altering The Precedence Order with Parentheses）
当然，正常优先级顺序往往不是你想要的，像JavaScript和许多其他的语言一样，Angular表达式给你改变优先级顺序的的方式就是使用括号将运算符分组。
```js
it('parses parentheses altering precedence order', function() {
  expect(parse('21 * (3 - 1)')()).toBe(42);
  expect(parse('false && (true || true)')()).toBe(false);
  expect(parse('-((a % 2) === 0 ? 1 : 2)')({a: 42})).toBe(-1);
});
```
实现的方式真的是非常简单。由于括号切断整个优先级表，他们首先应该尝试构建一个表达式或者子表达式。具体来说，这意味着他们首先应该测试`primary`函数。

如果在基本表达式的开始碰到一个开始圆括号，对于一个表达式来说在括号内一个新的优先级队列开始了。这样有效的强制括号里面的表达式在它周围的任何事物之前被执行：
```js
AST.prototype.primary = function() {
    var primary;
    if (this.expect('(')) {
      primary = this.assignment();
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
        primary = {
          type: AST.CallExpression,
          callee: primary,
          arguments: this.parseArguments()
        };
        this.consume(')');
      }
    }
  return primary;
};
```