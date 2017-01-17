## 方法调用
在JavaScript中，函数调用往往不仅仅是一个函数调用。当一个函数当作属性添加到一个对象，并且第一个引用它的对象使用一个点或者方括号，函数被当作一个方法调用。
这意味着函数将把`this`关键字绑定到对象。因此，在下面的测试用例中，`aFunction`中的`this`可以指向`aMember`，因为没在表达式中调用了它。computed属性访问：
```js
it('calls methods accessed as computed properties', function() {
  var scope = {
    anObject: {
      aMember: 42,
      aFunction: function() {
        return this.aMember;
      }
    }
  };
  var fn = parse('anObject["aFunction"]()');
  expect(fn(scope)).toBe(42);
});
```
non-computed属性访问：
```js
it('calls methods accessed as non-computed properties', function() {
  var scope = {
    anObject: {
      aMember: 42,
      aFunction: function() {
        return this.aMember;
      }
      }
    };
  var fn = parse('anObject.aFunction()');
  expect(fn(scope)).toBe(42);
});
```
所有的这些步骤都需要在AST compiler里面进行。我们需要做的是在`recurse`的`CallExpression`分支里面生成右半部分的JavaScript代码，那么`this`会被绑定到
对象，在原生的Angular表达式里引用。

这样做的关键是引入一个"call context"对象，用于存储调用方法。我们将为调用表达式引入这样一个对象。当执行调用的时候我们将其作为第二个参数传入`recurse`方法。
这个想法是`recurse`将会添加我们需要的更多信息到这个对象。
```js
case AST.CallExpression:
    var callContext = {};
    var callee = this.recurse(ast.callee, callContext);
    var args = _.map(ast.arguments, _.bind(function(arg) {
      return this.recurse(arg);
    }, this));
    return callee + '&&' + callee + '(' + args.join(',') + ')';
```
在`recurse`方法里面声明我们现在需要接收第二个参数，这里我们叫做`context`：
```js
ASTCompiler.prototype.recurse = function(ast, context) {
// ...
};
```
当我们给`recurse`传入context的时候，我们期望的是如果我们处理一个方法调用的时候，在它上面有3个属性：
* `context` - 该方法拥有的对象。最终成为`this`。
* `name` - 该对象中的方法属性名称。
* `computed` - 该方法是否作为computed属性访问。

`CallExpression`分支利用这三个属性形成callee，在生成call表达式的时候引入正确的this:
```js
case AST.CallExpression:
  var callContext = {};
  var callee = this.recurse(ast.callee, callContext);
  var args = _.map(ast.arguments, _.bind(function(arg) {
    return this.recurse(arg);
  }, this));
  if (callContext.name) {
      if (callContext.computed) {
        callee = this.computedMember(callContext.context, callContext.name);
      } else {
        callee = this.nonComputedMember(callContext.context, callContext.name);
      }
  }
  return callee + '&&' + callee + '(' + args.join(',') + ')';
```
这个发生的是，我们重构了computed和non-computed在JavaScript代码中的属性访问。这么做是为了绑定`this`。

现在，我们已经看到了如何调用context使用，我们应该在`MemberExpression`分支，这就是callee方法调用表达式形成。上下文中的`context`属性应该是成员表达式拥有的对象：
```js
case AST.MemberExpression:
    intoId = this.nextId();
    var left = this.recurse(ast.object);
    if (context) {
      context.context = left;
    }
    if (ast.computed) {
      var right = this.recurse(ast.property);
      this.if_(left,
        this.assign(intoId, this.computedMember(left, right)));
    } else {
      this.if_(left,
        this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
    }
    return intoId;
```
context中的`name`和`computed`属性不同的，取决于是否为computed查找：
```js
case AST.MemberExpression:
  intoId = this.nextId();
  var left = this.recurse(ast.object);
  if (context) {
    context.context = left;
  }
  if (ast.computed) {
    var right = this.recurse(ast.property);
    this.if_(left,
      this.assign(intoId, this.computedMember(left, right)));
      if (context) {
        context.name = right;
        context.computed = true;
      }
  } else {
    this.if_(left,
      this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
    if (context) {
        context.name = ast.property.name;
        context.computed = false;
    }
  }
  return intoId;
```
现在我们正确的生成了方法调用，测试用例是快乐的。

与方法调用密切相关的是non-method函数的`this`发生了什么。当你在Angular表达式中调用一个独立的函数时，`this`已经被绑定Scope:
```js
it('binds bare functions to the scope', function() {
  var scope = {
    aFunction: function() {
      return this;
    }
  };
  var fn = parse('aFunction()');
  expect(fn(scope)).toBe(scope);
});
```
有一个异常就是，当函数被添加到表达式locals代替scope。在这个用例中，`this`应当指向locals:
```js
it('binds bare functions on locals to the locals', function() {
  var scope = {};
  var locals = {
    aFunction: function() {
      return this;
    }
  };
  var fn = parse('aFunction()');
  expect(fn(scope, locals)).toBe(locals);
});
```
我们也可以在`Identifier`表达式中实现上下文。context不管是`l`或者`s`,名称为标识符名称，并且`computed`属性一直是`false`:
```js
case AST.Identi er:
  intoId = this.nextId();
  this.if_(this.getHasOwnProperty('l', ast.name),
    this.assign(intoId, this.nonComputedMember('l', ast.name)));
  this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',
    this.assign(intoId, this.nonComputedMember('s', ast.name)));
  if (context) {
      context.context = this.getHasOwnProperty('l', ast.name) + '?l:s';
      context.name = ast.name;
      context.computed = false;
  }
  return intoId;
```