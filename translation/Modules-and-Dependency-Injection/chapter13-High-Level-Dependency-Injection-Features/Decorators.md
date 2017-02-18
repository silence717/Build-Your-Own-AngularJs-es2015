## Decorators
最后依赖注入功能缺失的功能是装饰器。装饰器和我们看到的其他功能有所不同，你不用使用一个装饰器去定义一个依赖。你使用一个装饰器改变已经存在的依赖。

装饰器模式是面向对象的实现，这也是是它名字的由来。

装饰器可以理解为，如何使用它们去改变不是你自己创建的依赖。你可以通过提供的一些类库注册一个装饰器，或者通过Angular自己。

我们看一下装饰器如何工作。在这个示例中，我们创建一个factory,然后使用一个同名的decorator去装饰这个factory。decorator是一个函数，它可以像一个factory被依赖注入，
但是也有一个特殊的`$delegate`参数对它有效。`$delegate`是被装饰的原始依赖。在这种情况下，它是`aValue`factory返回的对象：
```js
it('allows changing an instance using a decorator', function() {
  var module = window.angular.module('myModule', []);
  module.factory('aValue', function() {
    return {aKey: 42};
  });
  module.decorator('aValue', function($delegate) {
    $delegate.decoratedKey = 43;
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('aValue').aKey).toBe(42);
  expect(injector.get('aValue').decoratedKey).toBe(43);
});
```
在单个依赖上，你可以有多个装饰器。当你这么做，所有的这些都会按顺序在依赖上应用：
```js
it('allows multiple decorators per service', function() {
  var module = window.angular.module('myModule', []);
  module.factory('aValue', function() {
    return {};
  });
  module.decorator('aValue', function($delegate) {
    $delegate.decoratedKey = 42;
  });
  module.decorator('aValue', function($delegate) {
    $delegate.otherDecoratedKey = 43;
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('aValue').decoratedKey).toBe(42);
  expect(injector.get('aValue').otherDecoratedKey).toBe(43);
});
```
就像我们讨论的，装饰器函数可以被依赖注入使用其他东西而不是`$delegate`:
```js
it('uses dependency injection with decorators', function() {
  var module = window.angular.module('myModule', []);
  module.factory('aValue', function() {
    return {};
  });
  module.constant('a', 42);
  module.decorator('aValue', function(a, $delegate) {
    $delegate.decoratedKey = a;
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('aValue').decoratedKey).toBe(42);
});
```
所以，我们在module API需要一个`decorator`方法。它会像其他模块API方法一样，在`$provide`调用一个相应的方法。这个方法需要两个参数：被装饰的依赖名称和装饰器函数。

我们需要做的是挂到创建的依赖正在装饰。为此，我们需要首先获得它的provider:
```js
providerCache.$provide = {
    //... 
    decorator: function(serviceName, decoratorFn) {
      var provider = providerInjector.get(serviceName + 'Provider');
    }
};
```
当依赖被创建，我们需要抓住provider的返回值并且有时候改变它。我们使这么做有效的方式是，覆盖provider的`$get`方法，使用自己的，装饰器版本：
```js
decorator: function(serviceName, decoratorFn) {
    var provider = providerInjector.get(serviceName + 'Provider');
    var original$get = provider.$get;
    provider.$get = function() {
    var instance = instanceInjector.invoke(original$get, provider);
      // Modifications will be done here
      return instance;
    };
}
```
在第一个版本里面，我们仅仅调用原始的`$get`方法并且返回它的返回值。我们重写了`$get`方法，但是在重写版本里面并没有做任何特殊的事情。

最后一步就是这真正的应用decorator函数。记住它是一个函数调用依赖注入，并且它有附加的`$delegate`参数有效。这意味着我们可以调用实例化注入，使用locals参数传递
代理，我们在第九章节实现的：
```js
decorator: function(serviceName, decoratorFn) {
    var provider = providerInjector.get(serviceName + 'Provider');
    var original$get = provider.$get;
    provider.$get = function() {
      var instance = instanceInjector.invoke(original$get, provider);
      instanceInjector.invoke(decoratorFn, null, {$delegate: instance});
      return instance;
    };
}
```
现在我们只需要通过module API暴露`decorator`方法，这使得我们的测试通过：
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
  factory: invokeLater('$provide', 'factory'),
  value: invokeLater('$provide', 'value'),
  service: invokeLater('$provide', 'service'),
  decorator: invokeLater('$provide', 'decorator'),
  config: invokeLater('$injector', 'invoke', 'push', configBlocks),
  run: function(fn) {
    moduleInstance._runBlocks.push(fn);
    return moduleInstance;
  },
  _invokeQueue: invokeQueue,
  _configBlocks: configBlocks,
  _runBlocks: []
};
```
这就是所有的装饰器，在Angular中所有的依赖注入！
