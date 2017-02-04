## 优化常量表达式监听（Optimizing Constant Expression Watching）
使用字符串表达式在watchers中使我们能够添加一个新的优化，在某些情况下我们将使digest循环加快。在上一部分我们看到常量表达式Eugene将`constant`标识设置为`true`。
一个常量表达式总是返回相同的值，这意味着当一个猖狂表达式第一次被触发后，它将不会再是脏的。那意味着我们可以安全的移除监听器，为了在后面的循环中不再产生脏检查的成本。
在`scope_ spec.js`的`describe(‘$digest’)`测试块中添加一个测试：
```js
it('removes constant watches after first invocation', function() {
  scope.$watch('[1, 2, 3]', function() {});
  scope.$digest();
  expect(scope.$$watchers.length).toBe(0);
});
```
这个测试用例在执行时候抛出"10 iterations reached"异常，因为表达式每次计算都会生成一个新数组，watch引用会认为它是一个新值。由于`[1,2,3]`是一个常量，
它不应该被计算多次。

这种优化可以实现一个新的表达式功能叫做watch代理。一个watch代理是一个函数，它可以附加到表达式。在`Scope.$watch`中遇到一个有watch代理的表达式时，代理用于绕过
常规的watch规则。而不是创建一个watcher,我们代理表达式本身的工作：
```js
Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var self = this;
  watchFn = parse(watchFn);
  if (watchFn.$$watchDelegate) {
    return watchFn.$$watchDelegate(self, listenerFn, valueEq, watchFn);
  }
  var watcher = {
    watchFn: watchFn,
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
代理给了所有可能知道正确构造watch的内容：作用域实例，listener函数，值/引用相等标识，表达式本身watch。

表达式解析器可以将watch代理到表达式，无论什么时候，当这些表达式应用到watchers的时候希望发生一些特殊的事情。其中一个实例就是常量表达式，现在我们可以引入常量watch代理：
```js
function parse(expr) {
  switch (typeof expr) {
  case 'string':
    var lexer = new Lexer();
    var parser = new Parser(lexer);
    var parseFn = parser.parse(expr);
    if (parseFn.constant) {
      parseFn.$$watchDelegate = constantWatchDelegate;
    }
    return parseFn;
      case 'function':
        return expr;
    default:
        return _.noop;
    }
}
```
常量watch代理是一个watcher，它的行为像其他的watcher，除了它将自己在第一次调用后立即移除：
```js
function constantWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  var unwatch = scope.$watch(
    function() {
      return watchFn(scope);
    },
    function(newValue, oldValue, scope) {
      if (_.isFunction(listenerFn)) {
        listenerFn.apply(this, arguments);
      }
      unwatch();
    },
    valueEq
  );
  return unwatch;
}
```
请注意，我们不直接使用原来的`watchFn`作为`$watch`的第一个参数，如果我们这么做，`$watch`将会再次找到`$$watchDelegate`，导致无限递归。相反我们将它包装到一个函数没有` $$watchDelegate`。

另外，我们返回`unwatch`函数。及时一个常量watch在第一次调用后移除了它自己，它也可以通过`Scope.$watch`的返回值来移除，就想其他的watch。
