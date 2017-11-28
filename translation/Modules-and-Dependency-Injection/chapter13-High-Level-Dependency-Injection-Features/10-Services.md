## Services
一个factory是一个普通的旧函数，一个service是一个构造函数。当你注册一个服务，你提供的函数被看做构造函数，并且创建一个它的实例：
```js
it('allows registering a service', function() {
  var module = window.angular.module('myModule', []);
  module.service('aService', function MyService() {
    this.getValue = function() { return 42; };
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('aService').getValue()).toBe(42);
});
```
构造函数也可以被依赖注入：
```js
it('injects service constructors with instances', function() {
  var module = window.angular.module('myModule', []);
  module.value('theValue', 42);
    module.service('aService', function MyService(theValue) {
    this.getValue = function() { return theValue; };
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('aService').getValue()).toBe(42);
});
```
并且，像其他一样，一个service也是一个单例，意味着构造函数最多被使用一次，并且为后续使用者缓存结果对象：
```js
it('only instantiates services once', function() {
  var module = window.angular.module('myModule', []);
  module.service('aService', function MyService() {
  });
  var injector = createInjector(['myModule']);
  expect(injector.get('aService')).toBe(injector.get('aService'));
});
```
为了实现服务，同样的模式再次出现：我们首先在模块加载中注册队列方法：
```js
service: invokeLater('$provide', 'service'),
```
然后在`$provide`中实现方法。它需要依赖键和构造函数两个参数。接下来要做的是在运行中创建factory函数：
```js
service: function(key, Constructor) {
  this.factory(key, function() {
  
  }); 
}
```
我们要做的是使用`Constructor`参数创建一个实例。它也可能调用其他的一类注入关系。碰巧的是，在第9章，我们实现了注入方法，也就是：`instantiate`。
```js
service: function(key, Constructor) {
  this.factory(key, function() {
       return instanceInjector.instantiate(Constructor);
  });
}
```
现在我们看到它是如何建立在同一基础上。所有的factories,values,和services真正在底层都是providers。他们给开发者一种高级API，用于提供特定类型的provider。
正因为如此，开发者很少使用原始的providers。但是他们一直在那里，如果你需要底层的访问是有效的。