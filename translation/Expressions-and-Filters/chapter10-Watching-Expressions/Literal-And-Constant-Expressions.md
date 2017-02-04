## 字面和常量表达式（Literal And Constant Expressions）
我们已经看到了如何使用解析器返回一个函数，它可以被用于计算原始表达式。返回的函数不应该只是一个简单的函数。它应该有属性附加到它：

* `literal` - 一个布尔值表示表达式是否为一个literal值，例如整形或者数组literal。
* `constant` - 一个布尔值表示表达式是否是一个常量，例如原始类型literal，或者一个literal常量值得集合。当表达式是一个常量，它的值不会随着时间的推移而改变。

例如，`42`是literal也是一个常量，就像`[42, 'abc']`。另一方面，一些类似于`[42, 'abc', aVariable]`是一个literal但是不是一个常量，因为`aVariable`不是常量。

`$parse`的用户偶尔使用这两个标识来决定如何使用表达式。`constant`标识在本章中将应用于表达式监听中的一些优化。

让我们先谈谈`literal`标识，因为它更容易实现。各种简单的literal值，包括数字、字符串，和布尔值应该都标为literal：
```js
it('marks integers literal', function() {
  var fn = parse('42');
  expect(fn.literal).toBe(true);
});
it('marks strings literal', function() {
  var fn = parse('"abc"');
  expect(fn.literal).toBe(true);
});
it('marks booleans literal', function() {
  var fn = parse('true');
  expect(fn.literal).toBe(true);
});
```
数组和对象也应该被标识为literal:
```js
it('marks arrays literal', function() {
  var fn = parse('[1, 2, aVariable]');
  expect(fn.literal).toBe(true);
});
it('marks objects literal', function() {
  var fn = parse('{a: 1, b: aVariable}');
  expect(fn.literal).toBe(true);
});
```
任何其他的都应该被标识为non-literal:
```js
it('marks unary expressions non-literal', function() {
     var fn = parse('!false');
     expect(fn.literal).toBe(false);
   });
   it('marks binary expressions non-literal', function() {
     var fn = parse('1 + 2');
     expect(fn.literal).toBe(false);
   });
```
我们需要做是使用帮助函数`isLiteral`检测是否为一个AST literal。然后我我们将编译后的表达式函数中附加结果：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {
    body: [],
    nextId: 0,
    vars: [],
     lters: {}
  };
  this.recurse(ast);
  var fnString = this. lterPre x() +
    'var fn=function(s,l){' +
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
      )+ this.state.body.join('') + '}; return fn;';
  /* jshint -W054 */
    var fn = new Function(
    'ensureSafeMemberName',
      'ensureSafeObject',
      'ensureSafeFunction',
      'ifDe ned',
      'filter',
      fnString)(
        ensureSafeMemberName,
        ensureSafeObject,
        ensureSafeFunction,
        ifDe ned,
     filter);
    /* jshint +W054 */
    fn.literal = isLiteral(ast);
    return fn;
};
```
`isLiteral`函数像下面一样定义：

* 一个空program是literal
* 如过一个非空的program仅仅只有一个表达式并且类型是literal，一个数组或者一个对象，那么它是literal

在代码中这些表达：
```js
function isLiteral(ast) {
  return ast.body.length === 0 ||
      ast.body.length === 1 && (
      ast.body[0].type === AST.Literal ||
      ast.body[0].type === AST.ArrayExpression ||
      ast.body[0].type === AST.ObjectExpression);
}
```
设置`constant`标识有点复杂。我们需要独立地考虑每个AST节点类型如何确定它是"不变的"。

我们从简单的literal开始。数字、字符串，和布尔值都是常量：
