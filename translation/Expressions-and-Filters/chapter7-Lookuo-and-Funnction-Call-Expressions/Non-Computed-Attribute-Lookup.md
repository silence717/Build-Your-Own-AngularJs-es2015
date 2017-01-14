## Non-Computed Attribute Lookup
除了引用一个Scope的属性，你可以在同一表达式中更深入，并且使用点操作符在嵌套数据结构中查找一些内容：
```js
it('looks up a 2-part identi er path from the scope', function() {
  var fn = parse('aKey.anotherKey');
  expect(fn({aKey: {anotherKey: 42}})).toBe(42);
  expect(fn({aKey: {}})).toBeUndefined();
  expect(fn({})).toBeUndefined();
});
```
我们期望表达式能给找到`aKey.anotherKey`的值，或者如果一个两个keys找不到的时候返回`undefined`。

一般情况下，属性查找没有identifier快。这对有些表达式是有好处的，就像一个对象常量：
```js
it('looks up a member from an object', function() {
  var fn = parse('{aKey: 42}.aKey');
  expect(fn()).toBe(42);
});
```
我们目前不需要从 Lexer 传递点tokens,在这之前我们需要做点改变：
```js
} else if (this.is('[],{}:.')) {
    this.tokens.push({
      text: this.ch
    });
    this.index++;
```
在AST构建的时候，non-computed 属性使用点操作符是考虑基本节点，并且在`primary`属性中处理。处理完初始化节点后，我们需要检查它是否跟在点token后面：
```js
AST.prototype.primary = function() {
    var primary;
    if (this.expect('[')) {
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
    if (this.expect('.')) {

    }
    return primary;
};
```
If a dot is found, this primary expression becomes a MemberExpression node. 
We reuse the ini- tial primary node as the object of the member expression, 
and expect to have an identifier after the dot, which we’ll use as the property name to look up:
如果查找到dot,这个基本节点成为一个`MemberExpression`节点。
```js
AST.prototype.primary = function() {
  var primary;
  if (this.expect('[')) {
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
  if (this.expect('.')) {
    primary = {
      type: AST.MemberExpression,
      object: primary,
      property: this.identi er()
    };
  }
  return primary;
};
```
