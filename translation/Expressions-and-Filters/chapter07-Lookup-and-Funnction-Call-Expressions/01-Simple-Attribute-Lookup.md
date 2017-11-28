## 简单的属性查找
最简单的scope属性访问你可以做的是使用名字查找东西：表达式`aKey`从scope对象找到`aKey`属性并返回它：
```js
it('looks up an attribute from the scope', function() {
  var fn = parse('aKey');
  expect(fn({aKey: 42})).toBe(42);
  expect(fn({})).toBeUnde ned();
});
```

注意到`parse`返回的函数实际上是以一个JavaScript对象作为参数。这个对象基本上是`Scope`的实例，用于表达式访问或者操作。
它并不是一定是一个`Scope`，在单元测试中我们使用普通的对象就可以。由于常量表达式不做与任何`scope`相关的事情，我们没有使用这个
参数，但是再这个章节会改变。实际上，我们首先应该这个参数加入到生成，编译表达式函数。我们将会调用：

```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
  this.recurse(ast);
  /* jshint -W054 */
return new Function('s', this.state.body.join(''));
  /* jshint +W054 */
};
```
解析时，表达式`aKey`变成一个标识符token并且生成`Identfier`AST节点。我们已经使用标识符节点作为一个对象的key值。现在我们将会
扩展标识符去支持引入的属性查找。

在AST builder中，当我们构建一个基本的AST节点的时候，我们需要去检测标识符的变化。当构建对象属性节点的时候，我们将会以同样的方式去做：
当我们查找一个标识符token的时候，我们需要创建一个`Identfier`节点。
```js
AST.prototype.primary = function() {
  if (this.expect('[')) {
    return this.arrayDeclaration();
  } else if (this.expect('{')) {
    return this.object();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    return this.constants[this.consume().text];
  } else if (this.peek().identi er) {
    return this.identi er();
  } else {
    return this.constant();
  }
};
```
同样的，AST编译器需要在`recurse`方法去处理标识符。一旦看见，它应该作为一个成员属性被scope或者`s`查找。
```js
case AST.Identifier:
  return this.nonComputedMember('s', ast.name);
```
nonComputedMember方法需要两个参数：一个被查找的对象，一个需要查找的成员属性。它生成的JavaScript为非计算查找`a.b`
(而不是`a[b]`的计算查找):
```js
ASTCompiler.prototype.nonComputedMember = function(left, right) {
  return '(' + left + ').' + right;
};
```
通过我们的测试：我们为表达式`aKey`生成的函数体`return s.akey`。这立刻使表达式语言比之前变得有用，尤其是在watch表达的上下文，
我们经常需要查找属性。

如果你写过AngularJs的应用，你肯定注意到Angular表达式语言是非常宽容的当属性不存在的时候。不同的是JavaScript，当你引用一个不存在的
对象属性它不会抛出异常。这意味着，例如，当我们计算没有参数的表达式函数时，`s`就是`undefined`，没有异常需要抛出：
```js
it('returns unde ned when looking up attribute from unde ned', function() {
  var fn = parse('aKey');
  expect(fn()).toBeUnde ned();
});
```
这意味着我们需要生成一个有条件的JavaScript代码，在你查找一个属性之前检查该属性是否真实存在。从本质上讲，我们要对`aKey`表达式
生成像下面这样的：
```js
function (s) {
  var v0;
    if (s) {
    v0 = s.aKey;
  }
  return v0;
}
```
为if条件，我们引入一个叫做`if_`的方法，需要两个参数：一个条件表达式和当表达式为真的时候需要执行的结果语句。它生成相应的
JavaScript`if`语句，并且将它拼接到`body`表达式：
```js
ASTCompiler.prototype.if_ = function(test, consequent) {
  this.state.body.push('if(', test, '){', consequent, '}');
};
```
我们将用它来检测在标识符查找中`s`是否存在：
```js
case AST.Identi er:
    this.if_('s', '');
    return this.nonComputedMember('s', ast.name);
```
下一步我们需要在`if`语句块之前引入一个变量，填充scope的属性在if语句中，然后从`recurse`返回变量的值：
```js
case AST.Identi er:
    this.state.body.push('var v0;');
    this.if_('s', 'v0=' + this.nonComputedMember('s', ast.name) + ';');
    return 'v0';
```

我们的测试现在通过了，但是在我们往下进行之前，让我们花一点时间重构一下这些代码使它更加易于扩展。我们引入另外一个帮助函数去
做变量赋值：
```js
ASTCompiler.prototype.assign = function(id, value) {
 return id + '=' + value + ';';
};
```
我们在`if`语句中去使用它：
```js
case AST.Identifier:
  this.state.body.push('var v0;');
  this.if_('s', this.assign('v0', this.nonComputedMember('s', ast.name)));
  return 'v0';
```
此外，许多表达式需要几个变量，为它们生成没有冲突的名字变得困难。为了达到这个目标我们为编译器的state引入一个计数器,它是生成
唯一id的基础。我们将初始化它为0：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0};
  this.recurse(ast);
  /* jshint -W054 */
  return new Function('s', this.state.body.join(''));
  /* jshint +W054 */
};
```
这里我们需要创建一个方法，我们叫做`nextId`,生辰一个变量名称并且增加计数器:
```js
ASTCompiler.prototype.nextId = function() {
  var id = 'v' + (this.state.nextId++);
  return id;
};
```
我们在identifier查找中使用此函数：
```js
case AST.Identifier:
    var intoId = this.nextId();
    this.state.body.push('var ', intoId, ';');
    this.if_('s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
    return intoId;
```

最后，`var`变量声明不应该成为identifier查找的一部分。在JavaScript里，变量声明应该在函数的顶部，如果我们这么做了会更好。
所以，我们可以引入一个数组变量在编译器的state:
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);
  /* jshint -W054 */
  return new Function('s', this.state.body.join(''));
  /* jshint +W054 */
};
```
无论什么时候调用`nextId`，生成的变量名称都会被加入state:
```js
ASTCompiler.prototype.nextId = function() {
  var id = 'v' + (this.state.nextId++);
  this.state.vars.push(id);
  return id;
};
```
然后，对所有产生的变量var声明添加到生成的JavaScript的顶部：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);
  /* jshint -W054 */
  return new Function('s',
  (this.state.vars.length ?
    'var ' + this.state.vars.join(',') + ';' :
    ''
  ) + this.state.body.join(''));
  /* jshint +W054 */
};
```
Now we no longer need the var statement in the identifier branch:
现在我们不需要在identifier分支中需要var语句：
```js
case AST.Identifier:
  var intoId = this.nextId();
  this.if_('s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
  return intoId;
```
在这里我们有一个通用的工具，用于在表达式函数中引入任意数量的变量。这将在不久的将来非常方便。