## Factories
我们现在准备加入高级主见注册功能，应用开发者实际上使用最多的：factories，values，和services。我们看到，实际上没有太多工作，因为我们在过去几章建立了基础。

首先，我们看factories。一个factory是创造一个依赖的函数，这里我们注册一个factory函数返回`42`。当我们访问相应的注入，我们将得到`42`:
```js
it('allows registering a factory', function() {
  var module = window.angular.module('myModule', []);
  module.factory('a', function() { return 42; });
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(42);
});
```
一个factory函数可以使用依赖被注入，这是它给常量带来的主要附加值。具体来说，它使用实例化依赖注入，而不是provider依赖。这里，factory的`b`依赖于`a`:
```js
it('injects a factory function with instances', function() {
  var module = window.angular.module('myModule', []);
  module.factory('a', function() { return 1; });
  module.factory('b', function(a) { return a + 2; });
  var injector = createInjector(['myModule']);
  expect(injector.get('b')).toBe(3);
});
```
就像依赖由providers创建，factories创建的依赖全部是单例。我们期望factory函数最多被调用一次，所以每次我们需要依赖获得相同的值：
```js
it('only calls a factory function once', function() {
  var module = window.angular.module('myModule', []);
  module.factory('a', function() { return {}; });
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(injector.get('a'));
});
```
为了实现factories，首先我们需要在模块加载器中注册队列，通过添加一个新的队列函数：
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
  factory: invokeLater('$provide', 'factory'),
  config: invokeLater('$injector', 'invoke', 'push', configBlocks),
  run: function(fn) {
    moduleInstance._runBlocks.push(fn);
    return moduleInstance;
  },
  _invokeQueue: invokeQueue,
  _configBlocks: configBlocks
  _runBlocks: []
};
```
然后我们在injector中的`$provide`对象需要相应的方法。它实际上应该做什么？考虑一个factory的功能和provider的`$get`方法完全一样。它返回依赖，注入实例，
并且最多被调用一次。

实际上，provider的`$get`方法实际上正是一个factory的实现：
```js
providerCache.$provide = {
  constant: function(key, value) {
    if (key === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid constant name!';
    }
    providerCache[key] = value;
    instanceCache[key] = value;
  },
  provider: function(key, provider) {
    if (_.isFunction(provider)) {
      provider = providerInjector.instantiate(provider);
    }
    providerCache[key + 'Provider'] = provider;
  },
  factory: function(key, factoryFn) {
    this.provider(key, {$get: factoryFn});
  }
};
```
一个factory实际上就是一个provider。当你注册一个factory,一个provider对象是在运行中创建的，并且provider的`$get`方法是你注册的最原始的factory函数。
我们做的所有工作都是为了实现providers，而我们也不需要更多的去实现factories。

factories不会给provider完全的可配置性。如果你注册factory`a`，然后你可以通过provider注入的`aProvider`去访问。但是provider是在运行中创建的，但是没有任何配置
方法附加到它上面。所以当`aProvider`存在，不会有太多的机会直接访问。

factories有一个额外的错误检查我们应该做，必须确保它们实际上返回了东西。这是组织应用程序代码的bugs，否则将很难确定。
```js
it('forces a factory to return a value', function() {
  var module = window.angular.module('myModule', []);
  module.factory('a', function() {  });
  module.factory('b', function() { return null; });
  var injector = createInjector(['myModule']);
  expect(function() {
      injector.get('a');
  }).toThrow();
  expect(injector.get('b')).toBeNull();
});
```
在这里，我们看到返回值是`undefined`是不被接受的，`null`是可以的。

我们所能做的就是，将指定的factory函数封装在另一个函数中，并且在那里检查：
```js
function enforceReturnValue(factoryFn) {
  return function() {
    var value = instanceInjector.invoke(factoryFn);
    if (_.isUnde ned(value)) {
      throw 'factory must return a value';
    }
    return value;
  };
}
providerCache.$provide = {
  constant: function(key, value) {
    if (key === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid constant name!';
    }
    providerCache[key] = value;
    instanceCache[key] = value;
  },
  provider: function(key, provider) {
    if (_.isFunction(provider)) {
      provider = providerInjector.instantiate(provider);
    }
    providerCache[key + 'Provider'] = provider;
  },
  factory: function(key, factoryFn) {
    this.provider(key, {$get: enforceReturnValue(factoryFn)});
  }
};
```
我们现在有的`$get`的方法的主体是一个零参数的函数。这个函数使用实例化依赖注入调用原始factory，并且返回它的值。如果返回的只是`undefined`，我们通过抛出异常让用户知道。