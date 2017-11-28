## 将表达式集成到作用域（Integrating Expressions to Scopes）
`Scope`外部的API不仅要接受原生函数，还应该接受表达式字符串在下面的方法中：
* `$watch`
* `$watchCollection`
* `$eval`（和有关的，`$apply`和`$evalAsync`）

本质上，`Scope`将使用`parse`函数（再后来，`$parse`服务）将这些表达式解析为函数。

由于`Scope`将继续支持原生函数的使用，我们需要去检测给定的是否为字符串，或者它们已经是函数。我们可以在`parse`里这么做，因此如果你试着解析一个函数，它只会将函数返回给你：
```js
it('returns the function itself when given one', function() {
  var fn = function() { };
  expect(parse(fn)).toBe(fn);
});
```

在`parse`中，我们将根据参数类型来决定做什么。如果它是字符串，我们将像之前一样解析它。如果是一盒函数，我们将返回它。其他情况，我们将返回`_.noop`，这就是LoDash返回的空函数：
```js
function parse(expr) {
    switch (typeof expr) {
    case 'string':
      var lexer = new Lexer();
      var parser = new Parser(lexer);
      return parser.parse(expr);
    case 'function':
      return expr;
    default:
      return _.noop;
    }
}
```
现在，在`scope.js`中，我们从`parse.js`中引入`parse`函数：
```js
'use strict';
var _ = require('lodash');
var parse = require('./parse');
```
我们接受表达式的第一个实例是监听函数`$watch`。我们为这个引入一个测试(在`describe('digest')`)测试块：
```js
it('accepts expressions for watch functions', function() {
  var theValue;
  scope.aValue = 42;
  scope.$watch('aValue', function(newValue, oldValue, scope) {
    theValue = newValue;
  });
  scope.$digest();
  expect(theValue).toBe(42);
});
```
我们需要做的是对给定的监听函数调用`parse`，并且将它返回的值存储在监听对象中而不是原来的参数：
```js
Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var self = this;
  var watcher = {
    watchFn: parse(watchFn),
    listenerFn: listenerFn || function() { },
      last: initWatchVal,
      valueEq: !!valueEq
  };
  this.$$watchers.unshift(watcher);
  this.$$root.$$lastDirtyWatch = null;
  return function() {
      var index = self.$$watchers.indexOf(watcher);
      if (index >= 0) {
        self.$$watchers.splice(index, 1);
        self.$$root.$$lastDirtyWatch = null;
      }
  };
};
```
由于`$watch`现在接受表达式，`$watchCollection`也应该接受他们。在`describe('$watchCollection')`测试块添加一个新测试：
```js
it('accepts expressions for watch functions', function() {
  var theValue;
  scope.aColl = [1, 2, 3];
  scope.$watchCollection('aColl', function(newValue, oldValue, scope) {
    theValue = newValue;
  });
  scope.$digest();
  expect(theValue).toEqual([1, 2, 3]);
});
```
为了完成这一工作，我们也需要在`$watchCollection`中为监听函数调用`parse`:
```js
Scope.prototype.$watchCollection = function(watchFn, listenerFn) {
  var self = this;
  var newValue;
  var oldValue;
  var oldLength;
  var veryOldValue;
  var trackVeryOldValue = (listenerFn.length > 1);
  var changeCount = 0;
  var  rstRun = true;
  watchFn = parse(watchFn);
  // The rest of the function unchanged
};
```
下一步，我们应该支持`$eval`。在`describe('$eval')`下面添加测试：
```js
it('accepts expressions in $eval', function() {
  expect(scope.$eval('42')).toBe(42);
});
```
此外，由于`$apply`和`$evalAsync`都在`$eval`基础上构建，他们也支持表达式。分别添加测试到`describe('$apply')`和`describe('$evalAsync')`测试块：
```js
it('accepts expressions in $apply', function() {
  scope.aFunction = _.constant(42);
  expect(scope.$apply('aFunction()')).toBe(42);
});
it('accepts expressions in $evalAsync', function(done) {
  var called;
  scope.aFunction = function() {
    called = true;
  };
  scope.$evalAsync('aFunction()');
  scope.$$postDigest(function() {
    expect(called).toBe(true);
    done();
  });
});
```
在`$eval`我们仅仅需要解析输入表达式并且调用它：
```js
Scope.prototype.$eval = function(expr, locals) {
    return parse(expr)(this, locals);
};
```
由于`$apply`和`$evalAsync`在`$eval`实现，此更改立即为它们添加表达式支持。

注意到我们将`locals`参数传递到表达式函数。当我们实现了表达式查找嘚瑟嘿嘿，它可以用来覆盖作用域访问。
