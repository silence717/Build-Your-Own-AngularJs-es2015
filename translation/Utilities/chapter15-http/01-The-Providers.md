## The Providers
就像我们在`$q`中做的，一开始我们设置一个Provider让`$http`有效。在这种情况下，我们实际上会设置两个providers,由于有关于HTTP通信的工作在AngularJs中有两个服务：`$http`本身，还有
叫作`$httpBackend`。

这两个服务之间的分工是这样的，`$httpBackend`处理低级的XMLHttpRequest集合，`$http`处理高级别的，面向用户的功能。从一个应用开发者的角度看，这种分宫不会发生，大多数的时间
`$http`是直接使用的唯一服务，`$httpBackend`仅仅在`$http`内部被使用。

当你想使用非正常的HTTP传输的时候，这个分工就会变得有用。例如，ngMock模块覆盖`$httpBackend`取代真实的HTTP调用去达到测试的目的。

在任何情况下，我们可以期望这两种服务通过`ng`模块在我们的injector有效:
```js
it('sets up $http and $httpBackend', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$http')).toBe(true);
  expect(injector.has('$httpBackend')).toBe(true);
});
```
这两个服务会放进两个分离的文件。`$httpBackend`将在`httpBackend.js`,通过一个provider创建：
```js
'use strict';
function $HttpBackendProvider() {
  this.$get = function() {
  }; 
}
module.exports = $HttpBackendProvider;
```
`$http`服务在`http.js`中，它也使用一个provider创建。这个provider的`$get`方法依赖`$httpBackend`，即使我们现在还没有用到它：
```js
function $HttpProvider() {
  this.$get = ['$httpBackend', function($httpBackend) {
  }]; 
}
module.exports = $HttpProvider;
```
现在我们可以在`ng`模块里面注册这个两个providers:
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = angular.module('ng', []);
  ngModule.provider('$ lter', require('./ lter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http'));
}
```