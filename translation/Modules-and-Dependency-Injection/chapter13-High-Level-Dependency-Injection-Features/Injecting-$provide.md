## Injecting $provide
injector对象让你反思和访问已配置的依赖，但它不允许你改变任何东西。它是一个只读API。如果你想添加一些依赖，由于一个或其他原因，不能将他们添加到一个模块，你可以使用一个叫做`$provide`的对象。

通过注入`$provide`你可以获得通过模块调用队列直接访问的方法。例如，一个provider构造函数可以使用`$provide`给injector加入一个常量。
```js
it('allows injecting the $provide service to providers', function() {
  var module = window.angular.module('myModule', []);
  module.provider('a', function AProvider($provide) {
    $provide.constant('b', 2);
    this.$get = function(b) { return 1 + b; };
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(3);
});
```
关键的是，`$provide`只有通过provider注入才有效。在运行时，当你有实例注入，你不能再注入`$provide`，因此也不能添加依赖:
```js
it('does not allow injecting the $provide service to $get', function() {
  var module = window.angular.module('myModule', []);
  module.provider('a', function AProvider() {
    this.$get = function($provide) { };
  });
  var injector = createInjector(['myModule']);
  expect(function() {
    injector.get('a');
  }).toThrow();
});
```
你注入的`$provide`对象实际上是我们已经拥有的`$provide`对象 - 具有`constant`和`provider`方法。这就是我们为什么给他特殊的名字`$provide`。现在我们只需要将它放到
provider缓存，就像我们之前为provider注入做的一样：
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
  }
};
```
由于我们只移除了本地变量`$provide`，我们需要更新调用队列的过程中访问`$provide`的方式：
```js
_.forEach(modulesToLoad, function loadModule(moduleName) {
  if (!loadedModules.hasOwnProperty(moduleName)) {
    loadedModules[moduleName] = true;
    var module = window.angular.module(moduleName);
    _.forEach(module.requires, loadModule);
    _.forEach(module._invokeQueue, function(invokeArgs) {
      var method = invokeArgs[0];
      var args = invokeArgs[1];
      providerCache.$provide[method].apply(providerCache.$provide, args);
    });
  }
});
```
通过`$injector`和`$provide`，injector可以直接访问大多数的内部机制。许多应用将永远不需要它们，因为他们需要的是模块和依赖注入。但是他们可以派上用场，
你需要添加一些额外的配置或introspection。