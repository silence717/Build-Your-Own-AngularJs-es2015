## 确保成员访问安全
由于表达式经常用于html，并且经常与用户生成的内容结合，我们需要做一些非常重要的事情，我们可以防止注入攻击，在这里用户可以通过特定表达式执行任意代码。
这种保护必须基于这样的事实：通过AST compiler所有的表达式必须的Scope对象的严格作用域。

除了literals，你可以使用添加到scope上的东西（或者locals）。具有潜在危险的操作对象，就像`window`是不可访问的。

基于我们目前的实现有几种方式：在这一章节中我们已经看到JavaScript`Function`构造函数接收一个字符串，并且计算字符串作为新函数的源码。我们用它来生成表达式函数。如果我们
不采取措施阻止它，那么相同的构造函数可以用于执行表达式中的任意代码。

Function的构造函数事实是，它是链接`constructor`属性给每个JavaScript函数。如果你的scope上有一个函数，就像你经常做的，你可以在表达式中获取构造函数，通过
JavaScript代码传递一个字符串，并且执行相应的函数。在这一点上，所有的信任没有了。例如，你可以很轻松的访问到全局`window`对象：
```js
aFunction.constructor('return window;')()
```
除了函数的构造方法，还有一些其他的常用的对象成员可能导致安全问题，因为调用它们可能产生不可预知的影响：
* `__proto__`是一个non-standard, deprecated accessor for an object’s prototype。它不仅仅可以获取或者设置全部属性，造成潜在危险。
* __de neGetter__, __lookupGetter__, __de neSetter__, and __lookupSetter__ are non-standard functions for defining properties on object in terms of getter and setter functions.
因为它们是不规范的，不是所有的浏览器都支持，它们可能允许重新定义全局属性，Angular不允许它们。

让我们添加测试验证上面6个成员没有可用的表达式：
```js
it('does not allow calling the function constructor', function() {
  expect(function() {
    var fn = parse('aFunction.constructor("return window;")()');
    fn({aFunction: function() { }});
  }).toThrow();
});
it('does not allow accessing __proto__', function() {
  expect(function() {
    var fn = parse('obj.__proto__');
    fn({obj: { }});
  }).toThrow();
});
it('does not allow calling __de neGetter__', function() {
  expect(function() {
    var fn = parse('obj.__de neGetter__("evil", fn)');
    fn({obj: { }, fn: function() { }});
  }).toThrow();
});
it('does not allow calling __de neSetter__', function() {
  expect(function() {
    var fn = parse('obj.__de neSetter__("evil", fn)');
    fn({obj: { }, fn: function() { }});
  }).toThrow();
});
it('does not allow calling __lookupGetter__', function() {
  expect(function() {
    var fn = parse('obj.__lookupGetter__("evil")');
    fn({obj: { }});
  }).toThrow();
});
it('does not allow calling __lookupSetter__', function() {
  expect(function() {
    var fn = parse('obj.__lookupSetter__("evil")');
    fn({obj: { }});
  }).toThrow();
});
```
安全措施让我们对这些类型的攻击是不允许访问的，在任何对象的任何成员。为了达到这个目的，我们引入一个帮助函数去检测成员的名字，如果是不允许访问的则抛出异常：
```js
function ensureSafeMemberName(name) {
  if (name === 'constructor' || name === '__proto__' ||
      name === '__de neGetter__' || name === '__de neSetter__' ||
      name === '__lookupGetter__' || name === '__lookupSetter__') {
    throw 'Attempting to access a disallowed field in Angular expressions!';
  }
}
```
现在我们在AST compiler需要在调用这个函数的地方。在identifiers我们将调用identifier的名字：
```js
case AST.Identi er:
    ensureSafeMemberName(ast.name);
    // ...
```
在non-computed成员访问我们将检测属性名称：
```js
case AST.MemberExpression:
  intoId = this.nextId();
  var left = this.recurse(ast.object, unde ned, create);
  if (context) {
    context.context = left;
  }
  if (ast.computed) {
    var right = this.recurse(ast.property);
    if (create) {
      this.if_(this.not(this.computedMember(left, right)),
        this.assign(this.computedMember(left, right), '{}'));
    }
    this.if_(left,
      this.assign(intoId, this.computedMember(left, right)));
    if (context) {
      context.name = right;
      context.computed = true;
    }
    } else {
    ensureSafeMemberName(ast.property.name);
    if (create) {
        this.if_(this.not(this.nonComputedMember(left, ast.property.name)),
          this.assign(this.nonComputedMember(left, ast.property.name), '{}'));
      }
    this.if_(left,
        this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
    if (context) {
        context.name = ast.property.name;
        context.computed = false;
    }
  }
  return intoId;
```
在computed属性成员访问我们需要做更多的工作，因为在解析的时候我们不知道属性的名称。相反的，我们需要在运行时调用`ensureSafeMemberName`，当表达式计算的时候。

首先，我们需要在运行时让`ensureSafeMemberName`有效。我们先重构一下生成函数的代码，它本身不是一个表达式函数，但是它返回一个表达式函数：
```js
ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);
  var fnString = 'var fn=function(s,l){' +
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' :
      ''
      ) +
      this.state.body.join('') +
      '}; return fn;';
  /* jshint -W054 */
  return new Function(fnString)();
  /* jshint +W054 */
};
```
现在我们有了这个高阶函数，我们用它传递参数，这些参数在生成闭包代码中可用。在这一点上我们在`ensureSafeMemberName`上传递，在运行时候使用：
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
return new Function('ensureSafeMemberName', fnString)(ensureSafeMemberName);
```
接下来，我们为此函数生成右侧computed成员访问：
```js
case AST.MemberExpression:
  intoId = this.nextId();
  var left = this.recurse(ast.object, unde ned, create);
  if (context) {
    context.context = left;
  }
  if (ast.computed) {
    var right = this.recurse(ast.property);
    this.addEnsureSafeMemberName(right);
    if (create) {
      this.if_(this.not(this.computedMember(left, right)),
        this.assign(this.computedMember(left, right), '{}'));
    }
    this.if_(left,
      this.assign(intoId, this.computedMember(left, right)));
    if (context) {
      context.name = right;
      context.computed = true;
    }
  } else {
      ensureSafeMemberName(ast.property.name);
      if (create) {
        this.if_(this.not(this.nonComputedMember(left, ast.property.name)),
          this.assign(this.nonComputedMember(left, ast.property.name), '{}'));
      }
      this.if_(left,
        this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
      if (context) {
        context.name = ast.property.name;
        context.computed = false;
      }
  }
  return intoId;
```
`addEnsureSafeMemberName`是一个新函数。它生成`ensureSafeMemberName`的调用：
```js
ASTCompiler.prototype.addEnsureSafeMemberName = function(expr) {
  this.state.body.push('ensureSafeMemberName(' + expr + ');');
};
```