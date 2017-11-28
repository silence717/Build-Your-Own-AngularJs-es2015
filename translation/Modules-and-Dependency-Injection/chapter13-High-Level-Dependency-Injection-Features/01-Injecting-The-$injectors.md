## Injecting The $injectors
你创建一个injector对象后，你可以使用它的公共API来反思其内容注入依赖的函数和构造函数。对于应用程序开发者，也许是最感兴趣方法是injector的`get`，
由于你可以得到一个动态的依赖，直到运行时才知道它的名字。当你需要它这可能是非常有用的。

这对于应用开发者访问inject本身是非常有意义的。实际上Angular就是这么做的。injector作为一个依赖是可用的叫做`$injector`:
```js
it('allows injecting the instance injector to $get', function() {
  var module = window.angular.module('myModule', []);
  module.constant('a', 42);
  module.provider('b', function BProvider() {
    this.$get = function($injector) {
      return $injector.get('a');
    };
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('b')).toBe(42);
});
```
当你注入`$injector`获取对象是很简单的，我们已经在`createInjector`里面实例化了injector对象。我们可以通过将它添加到实例化cache使其可用：
```js
var instanceInjector = instanceCache.$injector =
  createInternalInjector(instanceCache, function(name) {
  var provider = providerInjector.get(name + 'Provider');
  return instanceInjector.invoke(provider.$get, provider);
});
```
同样的，你可以注入`$injector`到一个provider构造函数。你可以回忆一下上一章，对于provider构造函数注入只有其他providers和constants有效。这个规则也同样强制
`$injector`注入：在这种情况下得到的是provider injector。
```js
it('allows injecting the provider injector to provider', function() {
  var module = window.angular.module('myModule', []);
  module.provider('a', function AProvider() {
    this.value = 42;
    this.$get = function() { return this.value; };
  });
  module.provider('b', function BProvider($injector) {
    var aProvider = $injector.get('aProvider');
    this.$get = function() {
      return aProvider.value;
    };
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('b')).toBe(42);
});
```
provider注入和实例化注入完全采用相同的方式 - 将它放入缓存：
```js
var providerInjector = providerCache.$injector =
    createInternalInjector(providerCache, function() {
    throw 'Unknown provider: '+path.join(' <- ');
});
```
因此，当你访问`$injector`，你也许得到的是实例化injector或者provider注入，依赖于你在什么地方注入。