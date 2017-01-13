## 解析this
一种特殊的属性查找就是我们需要处理`this`的引用。Angular表达式中的`this`角色和JavaScript中的非常相似：就是表达式
执行的上下文。表达式函数的上下文一般是它正在执行的作用域，所以`this`指的是：
```js
it('will parse this', function() {
  var fn = parse('this');
  var scope = {};
  expect(fn(scope)).toBe(scope);
  expect(fn()).toBeUnde ned();
});
```
从Lexer，`this`是一个标识符，在AST builder中我们为`constants`查找对象添加一个特殊的AST节点：
```js
AST.prototype.constants = {
  'null': {type: AST.Literal, value: null},
  'true': {type: AST.Literal, value: true},
  'false': {type: AST.Literal, value: false},
  'this': {type: AST.ThisExpression}
};
```
我们还没有引入AST.ThisExpression,所以我们需要做：
```js
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identi er = 'Identi er';
AST.ThisExpression = 'ThisExpression';
```
在AST Compiler中`recurse`方法我们可以编译` AST.ThisExpression`节点给一个简答的引用`s` - 表达式函数的作用域：
```js
case AST.ThisExpression:
  return 's';
```
