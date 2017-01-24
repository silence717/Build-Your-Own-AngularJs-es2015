## 声明（Statements）
在结束本章之前，我们就看一种方式你可以在的单一的Angular表达式执行多个东西。

目前我们已经看到的每个对象都是关于一个表达式，在最后，结果是一个返回值。然而，这不是一个硬限制。你可以有多个，一个表达式字符串对应一个独立的表达式，
如果你只是使用分号将它们分离：
```js
it('parses several statements', function() {
  var fn = parse('a = 1; b = 2; c = 3');
  var scope = {};
  fn(scope);
  expect(scope).toEqual({a: 1, b: 2, c: 3});
});
```

当你这么做了以后，最后一个表达式的值将会成为混合表达式的返回值。将前面任何表达式的返回值扔掉：
```js
it('returns the value of the last statement', function() {
  expect(parse('a = 1; b = 2; a + b')({})).toBe(3);
});
```

这意味着，如果你有多个表达式，每一个表达式但是最后一个值是什么有可能产生副作用，例如属性赋值或者函数调用。其他的一切没有任何影响除了消耗CPU周期。在命令式的编程语言
这些通常被成为声明，而不是表达式，这就是我们使用的名字从何而来。

为了实现声明，我们首先需要从 lexer 返回分号字符便于我们在AST builder中去识别。我们在`Lexer.lex`将它添加到文本token字符的集合里面：
```js
} else if (this.is('[],{}:.()?;')) {
```
在AST builder中，我们要去改变`AST.Program`节点类型的本职以便于`body`不仅仅是单个表达式，可以是一个表达式数组。我们形成body数组，只要在他们中间可以匹配分号去consuming表达式：
```js
AST.prototype.program = function() {
    var body = [];
    while (true) {
      if (this.tokens.length) {
        body.push(this.assignment());
      }
      if (!this.expect(';')) {
        return {type: AST.Program, body: body};
      }
    }
};
```
一个表达式没有分号，这是大多数的情况，当循环结束，`body`数组将持有一个。

在编译的阶段，所有但是在 body 里的最后一个声明首先生成，每一个都以分号结束。然后，在 body 里的最后一个声明的`return`语句生成：
```js
case AST.Program:
    _.forEach(_.initial(ast.body), _.bind(function(stmt) {
      this.state.body.push(this.recurse(stmt), ';');
    }, this));
    this.state.body.push('return ', this.recurse(_.last(ast.body)), ';');
    break;
```