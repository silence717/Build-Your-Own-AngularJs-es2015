## Locals
到现在所有`parse`返回的函数需要一个参数 - scope。literal表达式函数忽略的那一个。

表达式接受第二个参数，叫做`locals`。这个参数是另一个对象，就像`scope`参数。该规则表示表达式可以从`scope`和`locals`
对象查找。他们应该首先尝试使用`locals`，失败了再去调用`scope`。

这意味着你可以有效地增加或者覆盖`scope`属性和`locals`。换句话说，你可以使表达式中的属性不在任何scope上。这在有时候非常有用，
尤其是在指令和它们的表达式绑定上。例如，`ngClick`指令可以让你从点击处理表达式`$event`处获得点击事件对象。通过这样将它附加到本地。
```js
it('uses locals instead of scope when there is a matching key', function() {
  var fn = parse('aKey');
  var scope  = {aKey: 42};
  var locals = {aKey: 43};
  expect(fn(scope, locals)).toBe(43);
});
it('does not use locals instead of scope when no matching key', function() {
  var fn = parse('aKey');
  var scope  = {aKey: 42};
  var locals = {otherKey: 43};
  expect(fn(scope, locals)).toBe(42);
});
```
locals VS scope的规则只适用于key值的第一部分。如果第一级的多个查找匹配`locals`，查找完成，即使第二部分没有匹配：
```js
it('uses locals instead of scope when the  rst part matches', function() {
  var fn = parse('aKey.anotherKey');
  var scope  = {aKey: {anotherKey: 42}};
  var locals = {aKey: {}};
  expect(fn(scope, locals)).toBeUnde ned();
});
```
我们生成JavaScript的函数现在需要两个参数，第二个参数就是local对象。在生成代码中叫`l`:
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);
  /* jshint -W054 */
  **return new Function('s', 'l',**
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
    ) + this.state.body.join(''));
  /* jshint +W054 */
};
```
在编译器里面，对我们有关的部分就是修改生成`AST.Identifier`的代码，它现在主要做的是Scope属性查找。我们需要添加一个额外检查，看看是否应该做一个本地查找
代替scope查找：
```js
case AST.Identi er:
  intoId = this.nextId();
  this.if_('l',
    this.assign(intoId, this.nonComputedMember('l', ast.name)));
  this.if_(this.not('l') + ' && s',
    this.assign(intoId, this.nonComputedMember('s', ast.name)));
return intoId;
```
这个版本首先主要检查`l`,如果没有`l`只看标识符`s`。`not`是一个方法，所以我们需要定义它。它仅仅只是对JavaScript函数的值取反：
```js
ASTCompiler.prototype.not = function(e) {
  return '!(' + e + ')';
};
```
我们的测试还没有通过，问题在如何检测locals查找。规则是locals只能用在locals上真实存在属性，而我们当前总是用于locals仅仅存在。我们必须替换检测`l`真实
存在和identifier匹配的属性，我们可以在新添加的帮助方法`getHasOwnProperty`里面做：
```js
case AST.Identi er:
  intoId = this.nextId();
  this.if_(this.getHasOwnProperty('l', ast.name),
    this.assign(intoId, this.nonComputedMember('l', ast.name)));
  this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',
    this.assign(intoId, this.nonComputedMember('s', ast.name)));
  return intoId;
```
`getHasOwnProperty`方法需要一个对象和一个属性名称参数。它首先检查对象存在，并且包含该属性名称。最后在操作符中使用JavaScript:
```js
return object + '&&(' + this.escape(property) + ' in ' + object + ')';
```
除了查找locals对象的每个属性。解析表达式通过`$locals`特殊的名字可以访问整个locals对象。当你需要反思locals有效的时候非常有用：
```js
it('will parse $locals', function() {
  var fn = parse('$locals');
  var scope = {};
  var locals = {};
  expect(fn(scope, locals)).toBe(locals);
  expect(fn(scope)).toBeUnde ned();
  fn = parse('$locals.aKey');
  scope  = {aKey: 42};
  locals = {aKey: 43};
  expect(fn(scope, locals)).toBe(43);
});
```
对这种表达式需要一个新的AST token:
```js
AST.Program = 'Program’;
AST.Literal = ‘Literal’;
AST.ArrayExpression = ‘ArrayExpression’;
AST.ObjectExpression = ‘ObjectExpression’;
AST.Property = ‘Property’;
AST.Identi er = ‘Identi er’;
AST.ThisExpression = ‘ThisExpression’;
**AST.LocalsExpression = 'LocalsExpression';**
AST.MemberExpression = ‘MemberExpression’;
```
和`this`表达式相似，`$local`表达式是一个常量，所以我们把它添加到已经存在的`constants`对象中：
```js
AST.prototype.constants = {
  ‘null’: {type: AST.Literal, value: null},
  ‘true’: {type: AST.Literal, value: true},
  ‘false’: {type: AST.Literal, value: false},
  ‘this’: {type: AST.ThisExpression},
  '$locals': {type: AST.LocalsExpression}
};
```
在`ASTCompiler.recurse`中当我们遇到这个token的时候，可以简单的返回表达式函数参数l：
```js
case AST.LocalsExpression:
  return 'l';
```