## 过滤器额外参数 (Additional Filter Arguments)
到目前我们知道filter确实有一个参数：输入表达式的值。但是filters实际上可以有额外的参数。这是非常有用的，因为你可以参数化一个filter在不同情况下有不同的行为。

例如，如果你有一个filter它多次重复一个字符串，并且你要指定重复的次数。你可以通过冒号字符和给filter名称添加数字来完成它。这个数字将成为fiter函数的第二个参数：
```js
it('can pass an additional argument to  lters', function() {
  register('repeat', function() {
    return function(s, times) {
      return _.repeat(s, times);
    };
  });
  var fn = parse('"hello" | repeat:3');
  expect(fn()).toEqual('hellohellohello');
});
```
你可以传递多个参数，不止是一个，仅仅只需要在每个额外参数的后面循环使用冒号即可：
```js
it('can pass several additional arguments to  lters', function() {
  register('surround', function() {
    return function(s, left, right) {
      return left + s + right;
    };
  });
  var fn = parse('"hello" | surround:"*":"!"');
  expect(fn()).toEqual('*hello!');
});
```
冒号字符已经通过Lexer返回（因为我们已经在三元运算符里面使用它）。AST compiler也准备好处理任意数量的fiter参数，因为返回的代码在一个循环中。唯一缺少的是对这些参数的构建：

首先我们需要将参数数组从`CallExpression`分离到一个变量：
```js
AST.prototype.filter = function() {
  var left = this.assignment();
  while (this.expect('|')) {
    var args = [left];
    left = {
      type: AST.CallExpression,
      callee: this.identi er(),
      arguments: args,
      filter: true
    };
  }
  return left;
};
```
现在，我们可以添加一个循环consume冒号字符，其次是任意的（非过滤）的只要我们找到的表达式。每一个都会成为一个参数，并且拼接到`args`数组：
```js
AST.prototype. lter = function() {
  var left = this.assignment();
  while (this.expect('|')) {
    var args = [left];
    left = {
      type: AST.CallExpression,
      callee: this.identi er(),
      arguments: args,
       lter: true
    };
    while (this.expect(':')) {
      args.push(this.assignment());
    }
  }
  return left;
};
```
这里我们队过滤器表达式的支持就完成了！