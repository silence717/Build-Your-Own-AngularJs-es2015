## 确保对象安全
Angular表达式提供给我们的第二个安全措施是应用开发者需要保护他们自己，不允许他们在scope上添加危险的东西，然后通过表达式访问他们。

其中一个危险的对象就是`window`。你可以通过调用`window`的一些函数造成很大的危害，所以这就是Angular为什么阻止你通过表达式使用他们。
当然，你不能直接调用`window`成员，因为表达式仅作用于作用域，但是你也不能将`window`作为一个scope的属性别名。如果你这么尝试，将会抛出异常：
```js
it('does not allow accessing window as computed property', function() {
  var fn = parse('anObject["wnd"]');
  expect(function() { fn({anObject: {wnd: window}}); }).toThrow();
});
it('does not allow accessing window as non-computed property', function() {
  var fn = parse('anObject.wnd');
  expect(function() { fn({anObject: {wnd: window}}); }).toThrow();
});
```
当处理对象时安全措施是,我们需要检测是否是危险对象。为了实现这一点，我们引入一个帮助函数：
```js
function ensureSafeObject(obj) {
  if (obj) {
    if (obj.window === obj) {
      throw 'Referencing window in Angular expressions is disallowed!';
    }
  }
  return obj;
}
```
我们检测对象的"windowness",如果它有一个属性叫做`window`那么就指向它自己 - JavaScript`window`对象或者其他对象可能会有。

为了使测试用例通过，我们首先要让新帮助方法在运行时有用：
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
      fnString)(
        ensureSafeMemberName,
        ensureSafeObject);
      /* jshint +W054 */
};
```
现在我们可以把成员访问结果与调用`ensureSafeObject`包起来：
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
      this.assign(intoId,
    'ensureSafeObject(' + this.computedMember(left, right) + ')'));
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
        this.assign(intoId,
    'ensureSafeObject(' +
      this.nonComputedMember(left, ast.property.name) + ')'));
    if (context) {
        context.name = ast.property.name;
        context.computed = false;
      }
    }
    return intoId;
```
在函数的参数里面传递不安全的对象也是不被允许的：
```js
it('does not allow passing window as function argument', function() {
  var fn = parse('aFunction(wnd)');
  expect(function() {
    fn({aFunction: function() { }, wnd: window});
  }).toThrow();
});
```
我们需要使用`ensureSafeObject`包裹每个参数表达式：
```js
case AST.CallExpression:
  var callContext = {};
  var callee = this.recurse(ast.callee, callContext);
  var args = _.map(ast.arguments, _.bind(function(arg) {
    return 'ensureSafeObject(' + this.recurse(arg) + ')';
  }, this));
  // ...
```
如果在scope上，不允许在`window`上调用函数：
```js
it('does not allow calling methods on window', function() {
  var fn = parse('wnd.scrollTo(0)');
  expect(function() {
    fn({wnd: window});
  }).toThrow();
});
```
在这种情况下，我们需要检测调用方法的上下文：
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
  return callee + '&&' + callee + '(' + args.join(',') + ')';
```
`addEnsureSafeObject`是一个新方法，我们需要添加它：
```js
ASTCompiler.prototype.addEnsureSafeObject = function(expr) {
  this.state.body.push('ensureSafeObject(' + expr + ');');
};
```
在`window`上不能调用函数，而且调用函数也不能返回`window`:
```js
it('does not allow functions to return window', function() {
  var fn = parse('getWnd()');
  expect(function() { fn({getWnd: _.constant(window)}); }).toThrow();
});
```
这个时候我们需要将函数的返回值用`ensureSafeObject`包裹：
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
  return callee + '&&ensureSafeObject(' + callee + '(' + args.join(',') + '))';
```
scope上也不允许赋值一个不安全的对象：
```js
it('does not allow assigning window', function() {
  var fn = parse('wnd = anObject');
  expect(function() {
    fn({anObject: window});
  }).toThrow();
});
```
这意味着我们需要将右边赋值的操作也包起来：
```js
case AST.AssignmentExpression:
  var leftContext = {};
  this.recurse(ast.left, leftContext, true);
  var leftExpr;
  if (leftContext.computed) {
    leftExpr = this.computedMember(leftContext.context, leftContext.name);
  } else {
    leftExpr = this.nonComputedMember(leftContext.context, leftContext.name);
  }
  return this.assign(leftExpr,
    'ensureSafeObject(' + this.recurse(ast.right) + ')');
```
最后，如果在scope上使用identifier引用一个不安全的对象给一个别名是不允许的：
```js
it('does not allow referencing window', function() {
  var fn = parse('wnd');
   expect(function() {
      fn({wnd: window});
   }).toThrow();
});
```
我们也需要对identifier做一个安全检查：
```js
case AST.Identi er:
  ensureSafeMemberName(ast.name);
  intoId = this.nextId();
  this.if_(this.getHasOwnProperty('l', ast.name),
    this.assign(intoId, this.nonComputedMember('l', ast.name)));
  if (create) {
    this.if_(this.not(this.getHasOwnProperty('l', ast.name)) +
             ' && s && ' +
             this.not(this.getHasOwnProperty('s', ast.name)),
      this.assign(this.nonComputedMember('s', ast.name), '{}'));
  }
  this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',
    this.assign(intoId, this.nonComputedMember('s', ast.name)));
  if (context) {
    context.context = this.getHasOwnProperty('l', ast.name) + '?l:s';
    context.name = ast.name;
    context.computed = false;
  }
  this.addEnsureSafeObject(intoId);
  return intoId;
```
这里应该考虑了一切问题。但问题是，`window`不是我们查找的唯一危险对象。另一个是DOM元素。访问DOM元素可以使攻击者遍历或者操作网页的内容，所以他们应该被禁止：
```js
it('does not allow calling functions on DOM elements', function() {
  var fn = parse('el.setAttribute("evil", "true")');
  expect(function() { fn({el: document.documentElement}); }).toThrow();
});
```
AngularJS为"dom 元素"实现了如下的检查：
```js
function ensureSafeObject(obj) {
  if (obj) {
    if (obj.window === obj) {
      throw 'Referencing window in Angular expressions is disallowed!';
    } else if (obj.children &&
           (obj.nodeName || (obj.prop && obj.attr && obj. nd))) {
        throw 'Referencing DOM nodes in Angular expressions is disallowed!';
    }
  }
  return obj;
}
```
第三个危险的对象是我们的老朋友，函数的构造函数。虽然我们确定没有人使用函数的`constructor`属性获取构造函数，这个我们需要阻止有人在scope上使用别的名称混淆构造函数：
```js
it('does not allow calling the aliased function constructor', function() {
  var fn = parse('fnConstructor("return window;")');
  expect(function() {
    fn({fnConstructor: (function() { }).constructor});
  }).toThrow();
});
```
这个检测和`window`还有DOM元素比起来简单很多：函数的`constructor`仍然是一个函数，所以它也具有一个`constructor`属性 - 指向它自己：
```js
function ensureSafeObject(obj) {
  if (obj) {
    if (obj.window === obj) {
      throw 'Referencing window in Angular expressions is disallowed!';
    } else if (obj.children &&
               (obj.nodeName || (obj.prop && obj.attr && obj. nd))) {
      throw 'Referencing DOM nodes in Angular expressions is disallowed!';
    } else if (obj.constructor === obj) {
      throw 'Referencing Function in Angular expressions is disallowed!';
    }
  }
  return obj;
}
```
第四个也是最后一个危险对象我们应该考虑`Object`对象。除了作为原始包装对象，它包含一系列帮助方法，例如`Object.de neProperty()`,`Object.freeze()`,`Object.getOwnPropertyDescriptor()`,
和`Object.setPrototypeOf()`。需要我们关注的正是后者的作用。如果攻击者获得其中的一些函数是存在潜在危险的。因此，我们完全禁止引用Object:
```js
it('does not allow calling functions on Object', function() {
  var fn = parse('obj.create({})');
  expect(function() {
    fn({obj: Object});
  }).toThrow();
});
```
我们仅仅检测对象是不是`Object`:
```js
function ensureSafeObject(obj) {
  if (obj) {
    if (obj.window === obj) {
      throw 'Referencing window in Angular expressions is disallowed!';
    } else if (obj.children &&
                (obj.nodeName || (obj.prop && obj.attr && obj. nd))) {
      throw 'Referencing DOM nodes in Angular expressions is disallowed!';
    } else if (obj.constructor === obj) {
      throw 'Referencing Function in Angular expressions is disallowed!';
    } else if (obj === Object) {
      throw 'Referencing Object in Angular expressions is disallowed!';
    }
  }
  return obj;
}
```