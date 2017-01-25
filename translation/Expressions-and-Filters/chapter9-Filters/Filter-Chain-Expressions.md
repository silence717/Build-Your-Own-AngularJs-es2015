## 链式过滤器表达式（ Filter Chain Expressions ）
过滤器的一个重要方面就是如何将它们组合成过滤器链。那意味着你可以添加任意数量的filter,通过在后面添加管道符:
```js
it('can parse filter chain expressions', function() {
  register('upcase', function() {
    return function(s) {
      return s.toUpperCase();
    };
  });
  register('exclamate', function() {
    return function(s) {
      return s + '!';
    };
  });
  var fn = parse('"hello" | upcase | exclamate');
  expect(fn()).toEqual('HELLO!');
});
```
现在在第一个filter后面终止了表达式。

实际上很简单，我们只需要将`AST.prototype.filter`的`if`语句替换为`while`。只要我们发现管道符，我们应该更多过滤器。`CallExpression`的结果成为下一个的参数：
```js
AST.prototype.filter = function() {
  var left = this.assignment();
  while (this.expect('|')) {
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