## 单次绑定表达式（One-Time Expressions）
作为Angular应用的开发者，我们经常遇到一些情况，我们知道一些watch第一次得到一个值，这个值将不会再改变。一个典型的例子就像一个对象的清单：
```js
<li ng-repeat="user in users">
  {{user.firstName}} {{user.lastName}}
</li>
```
这段代码使用一个wacher的集合通过`ng-repeat`，但是它对每个用户也使用了两个watcher - 一个用于firstName，另一个用于lastName。

在这样一个列表，这是很常见的，一个给定用户的firstName和lastName是不会改变的，因为他们制度 - 没有应用逻辑改变他们。然而，Angular现在在每次digest的时候都会进行
脏检查，因为它不知道你没有意图改变他们。这种不必要的脏检查可以是一个显著的性能问题，在大型应用程序和低端设备。

Angular有一个叫做单次绑定的功能去避免这个。当watcher一创建你就知道它的值不会再发生改变的时候，你可以使用两个冒号字符让Angular知道：
```js
<li ng-repeat="user in users">
  {{::user. rstName}} {{::user.lastName}}
</li>
```
在表达式引擎重视实现单次绑定监控语法，你可以在任何表达式中使用它：
```js
it('accepts one-time watches', function() {
  var theValue;
  scope.aValue = 42;
  scope.$watch('::aValue', function(newValue, oldValue, scope) {
    theValue = newValue;
  });
  scope.$digest();
  expect(theValue).toBe(42);
});
```
单次watcher和常规的watcher关键区别是，当单次watcher被resolved，它会立刻移除，而不会对digest循环产生更多的压力：
```js
it('removes one-time watches after first invocation', function() {
  scope.aValue = 42;
  scope.$watch('::aValue', function() { });
  scope.$digest();
  expect(scope.$$watchers.length).toBe(0);
});
```
单次watch在`parse.js`中完全处理，利用在上一部分我们引入的代理watch系统。如果表达式之前有两个冒号，"单词watch代理"将会被添加上：
```js
function parse(expr) {
  switch (typeof expr) {
  case 'string':
    var lexer = new Lexer();
    var parser = new Parser(lexer);
    var oneTime = false;
    if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
      oneTime = true;
      expr = expr.substring(2);
    }
    var parseFn = parser.parse(expr);
    if (parseFn.constant) {
      parseFn.$$watchDelegate = constantWatchDelegate;
    } else if (oneTime) {
      parseFn.$$watchDelegate = oneTimeWatchDelegate;
    }
    return parseFn;
  case 'function':
    return expr;
  default:
    return _.noop;
  }
}
```
表面看来，单次watch代理的规则实际上看起来和常量watch代理一样：运行一次然后移除。事实上，如果我们单次watch代理与常量watch代理一样，我们的测试就可以通过：
```js
function oneTimeWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  var unwatch = scope.$watch(
    function() {
          return watchFn(scope);
        }, function(newValue, oldValue, scope) {
          if (_.isFunction(listenerFn)) {
            listenerFn.apply(this, arguments);
          }
          unwatch();
        }, valueEq
    );
  return unwatch;
}
```
这么做存在一个问题，它不像常量，一个单次绑定表达式在第一次计算的时候，它不一定是有值得。例如，我们也许仍然需要等待数据从后端返回。如果他们可以支持各种异步使用场景，
单次绑定表达式是非常有用的。这就是为什么当它们的值成为其他而不是`undefined`的时候它们应该被移除了：
```js
it('does not remove one-time-watches until value is defined', function() {
  scope.$watch('::aValue', function() { });
  scope.$digest();
  expect(scope.$$watchers.length).toBe(1);
  scope.aValue = 42;
  scope.$digest();
  expect(scope.$$watchers.length).toBe(0);
});
```
我们通过使用一个`if`语句保证`unwatch()`调用，使得这个测试通过：
```js
function oneTimeWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  var unwatch = scope.$watch(
    function() {
      return watchFn(scope);
    }, function(newValue, oldValue, scope) {
      if (_.isFunction(listenerFn)) {
        listenerFn.apply(this, arguments);
      }
    if (!_.isUndefined(newValue)) {
        unwatch();
    }
  }, valueEq );
  return unwatch;
}
```
这么做仍然是不够好的。就想我们看到的，在digest中发生了很多事情，其中一件就是表达式的值再一次变成了`undefined`。Angular单次表达式只要在值稳定的时候将其移除，
这意味着在digest结束的时候，它必须是除`undefined`外的值：
```js
it('does not remove one-time-watches until value stays defined', function() {
  scope.aValue = 42;
  scope.$watch('::aValue', function() { });
  var unwatchDeleter = scope.$watch('aValue', function() {
    delete scope.aValue;
  });
  scope.$digest();
  expect(scope.$$watchers.length).toBe(2);
  scope.aValue = 42;
  unwatchDeleter();
  scope.$digest();
  expect(scope.$$watchers.length).toBe(0);
});
```
在这个测试中我们有第二个watcher导致在digest中单次watcher的值变为`undefined`。当第二个watcher生效的时候，单次watcher不会稳定，并且不会被移除。

我们必须保存单次watch最后一次的值，在digest结束后检测是否被定义。只有当我们移除了watcher。我们可以使用`$$postDigest`方法去推迟移除：
```js
function oneTimeWatchDelegate(scope, listenerFn, valueEq, watchFn) {
    var lastValue;
    var unwatch = scope.$watch(
      function() {
        return watchFn(scope);
      }, function(newValue, oldValue, scope) {
        lastValue = newValue;
        if (_.isFunction(listenerFn)) {
          listenerFn.apply(this, arguments);
        }
        if (!_.isUnde ned(newValue)) {
            scope.$$postDigest(function() {
              if (!_.isUnde ned(lastValue)) {
                  unwatch();
              }
            });
      }, valueEq );
    return unwatch;
    }
}
```
这个已经非常好了，但是这里有不止一个的单次watches的特殊情况需要我们处理：当使用一个literal集合，例如一个数组或者一个对象，单次watcher检测是否在移除前
内部literal的值都被定义。例如，当单次watch是一个数组literal，watch仅仅会在数组中不存在`undefined`项的时候移除：
```js
it('does not remove one-time watches before all array items de ned', function() {
  scope.$watch('::[1, 2, aValue]', function() { }, true);
  scope.$digest();
  expect(scope.$$watchers.length).toBe(1);
  scope.aValue = 3;
  scope.$digest();
  expect(scope.$$watchers.length).toBe(0);
});
```
对于对象是一样的。对象的单次watch仅仅会在对象没有`undefined`值的时候才去移除：
```js
it('does not remove one-time watches before all object vals de ned', function() {
  scope.$watch('::{a: 1, b: aValue}', function() { }, true);
  scope.$digest();
  expect(scope.$$watchers.length).toBe(1);
  scope.aValue = 3;
  scope.$digest();
  expect(scope.$$watchers.length).toBe(0);
});
```
如果表达式是一个literal,我们应该使用一个特殊的"单次literal watch"代理给它，代替普通的单次watch代理：
```js
function parse(expr) {
  switch (typeof expr) {
    case 'string':
        var lexer = new Lexer();
        var parser = new Parser(lexer);
        var oneTime = false;
        if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
          oneTime = true;
          expr = expr.substring(2);
        }
        var parseFn = parser.parse(expr);
        if (parseFn.constant) {
          parseFn.$$watchDelegate = constantWatchDelegate;
        } else if (oneTime) {
        parseFn.$$watchDelegate = parseFn.literal ? oneTimeLiteralWatchDelegate :
                                                    oneTimeWatchDelegate;
        }
      return parseFn;
    case 'function':
      return expr;
    default:
      return _.noop;
  }
}
```
新代理和单次watch代理很相似，但是代替检测表达式的值是否被定义，它假设是一个集合并且检查包含的所有项是否被定义：
```js
function oneTimeLiteralWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  function isAllDe ned(val) {
    return !_.any(val, _.isUnde ned);
  }
  var unwatch = scope.$watch(
    function() {
      return watchFn(scope);
    }, function(newValue, oldValue, scope) {
      if (_.isFunction(listenerFn)) {
        listenerFn.apply(this, arguments);
      }
      if (isAllDe ned(newValue)) {
        scope.$$postDigest(function() {
          if (isAllDe ned(newValue)) {
            unwatch();
          }
        });
      }
    }, valueEq );
  return unwatch;
}
```