## Values
Values和constants大致相似。你给一个模块注册一个value，仅仅只是提供值，不会调用其他的生成函数：
```js
it('allows registering a value', function() {
  var module = window.angular.module('myModule', []);
  module.value('a', 42);
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBe(42);
});
```
value和constant的区别在于，value在provider或者配置块是无效的。他们只是严格的实例：
```js
it('does not make values available to con g blocks', function() {
  var module = window.angular.module('myModule', []);
  module.value('a', 42);
  module.con g(function(a) {
  });
  expect(function() {
    createInjector(['myModule']);
  }).toThrow();
});
```
再一次，我们首先需要在模块加载里面注册一个队列函数给values:
```js
var moduleInstance = {
  name: name,
  requires: requires,
  constant: invokeLater('$provide', 'constant', 'unshift'),
  provider: invokeLater('$provide', 'provider'),
  factory: invokeLater('$provide', 'factory'),
  value: invokeLater('$provide', 'value'),
  con g: invokeLater('$injector', 'invoke', 'push', con gBlocks),
  run: function(fn) {
    moduleInstance._runBlocks.push(fn);
    return moduleInstance;
  },
  _invokeQueue: invokeQueue,
  _con gBlocks: con gBlocks,
  _runBlocks: []
};
```
实际上实现非常简单：我们创建一个factory函数，没有依赖注入并且总是返回给定的值：
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
    this.provider(key, {$get: enforceReturnValue(factoryFn)});
  },
  value: function(key, value) {
    this.factory(key, _.constant(value));
  }
};
```
Values也许是`undefined`，但是我们现在的实现不允许这么做：
```js
it('allows an unde ned value', function() {
  var module = window.angular.module('myModule', []);
  module.value('a', unde ned);
  var injector = createInjector(['myModule']);
  expect(injector.get('a')).toBeUnde ned();
});
```
所以强制factories的返回不能一直被应用。我们添加第三个可选参数给`factory`去控制是否这么做：
```js
factory: function(key, factoryFn, enforce) {
  this.provider(key, {
    $get: enforce === false ? factoryFn : enforceReturnValue(factoryFn)
  });
},
value: function(key, value) {
  this.factory(key, _.constant(value), false);
}
```
如果`factory`的第三个参数被显式的设置为`false`，则不会强制factory返回一个值。我们在`value`中使用这个值。

因此基本上，一个value是使用factory实现，而这个factory使用provider实现。通过它的外观，我们可以简单地将它存储在实例化缓存中，像我们对constant做的一样。
但是这种方式允许decoration - 我们一会学习的一个新功能。