## 确保函数安全
我们只是看到了不能在表达式中调用函数，如果这个函数恰好是构造函数。Angular还阻止你对函数做一件事情，那就是重新绑定接收者(`this`)给其他：
```js
it('does not allow calling call', function() {
  var fn = parse('fun.call(obj)');
  expect(function() { fn({fun: function() { }, obj: {}}); }).toThrow();
});
it('does not allow calling apply', function() {
  var fn = parse('fun.apply(obj)');
  expect(function() { fn({fun: function() { }, obj: {}}); }).toThrow();
});
```
`call`和`apply`方法（也就是`bind`）都是不同的调用函数的方式，从而使它的接收方从原来的发生变化。在上面所有的测试用例里面，`this`在`fun`体内都会被绑定到`obj`。
由于重新绑定`this`会导致函数和作者原来的意愿相违背，Angular简单地在表达式中不允许他们，这样就不会造成注入攻击。

在上一部分我们使用`ensureSafeObject`确保调用函数安全。现在我们把它切换为一个叫做`ensureSafeObject`的新方法。首先需要做的是检测函数不是一个构造函数，就像`ensureSafeObject`一样：
```js
function ensureSafeFunction(obj) {
  if (obj) {
    if (obj.constructor === obj) {
      throw 'Referencing Function in Angular expressions is disallowed!';
    }
  }
  return obj;
}

```
`ensureSafeFunction`第二个作用就是判断函数不是一个`call`,`apply`,或者`bind`。我们在`parse.js`中将它们作为常量引入，所以我们可以将他们和函数对比：
```js
var CALL = Function.prototype.call;
var APPLY = Function.prototype.apply;
var BIND = Function.prototype.bind;
```
现在我们应该使`ensureSafeFunction`在运行时有用:
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);
  var fnString = 'var fn=function(s,l){' +
    (this.state.vars.length ?
     'var ' + this.state.vars.join(',') + ';' :
    ''
    )+ this.state.body.join('') + '}; return fn;';
    /* jshint -W054 */
    return new Function(
      'ensureSafeMemberName',
      'ensureSafeObject',
    'ensureSafeFunction',
    fnString)(
      ensureSafeMemberName,
      ensureSafeObject,
    ensureSafeFunction);
    /* jshint +W054 */
};
```
然后我们为callee一个函数调用表达式生成一个安全函数：
```js
case AST.CallExpression:
  var callContext = {};
  var callee = this.recurse(ast.callee, callContext);
  var args = _.map(ast.arguments, _.bind(function(arg) {
    return 'ensureSafeObject(' + this.recurse(arg) + ')';
  }, this));
  if (callContext.name) {
    this.addEnsureSafeObject(callContext.context);
    if (callContext.computed) {
      callee = this.computedMember(callContext.context, callContext.name);
    } else {
      callee = this.nonComputedMember(callContext.context, callContext.name);
    }
  }
  this.addEnsureSafeFunction(callee);
  return callee + '&&ensureSafeObject(' + callee + '(' + args.join(',') + '))';
```
在完成之前我们需要添加`addEnsureSafeFunction`帮助方法：
```js
ASTCompiler.prototype.addEnsureSafeFunction = function(expr) {
  this.state.body.push('ensureSafeFunction(' + expr + ');');
};
```
这就是Angular如何阻止安全表达式的攻击。安全措施绝对不是完美的，几乎可以确定的是在我们做了安全检测的地方仍然有几种方式给scope添加一些危险的属性。
然而，与此相关的风险却大大降低了，在攻击者可以使用这些危险属性的时候，应用程序的开发者必须将这些放到scope上，但是这些事情是它们不应该做的。
然而，与此相关的风险却大大降低了，在攻击者可以使用这些危险属性的时候，应用程序的开发者必须将这些放到scope上，但是这些事情是它们不应该做的。