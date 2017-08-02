## The $controller provider
这一切都开始于将controller对象引入的能力。这里为它有一个特定的service，它叫做`$controller`。这个服务的provider是我们需要添加进来的第一个东西。

`$controller`服务作为`ng`module的一个部分，我们可以为它的存在创建一个测试：
```js
it('sets up $controller', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$controller')).toBe(true);
});
```
这个provider有他字节文件-`src/controller.js`，并且它的初始化像我们已经创建的其他provider一样。这里有一个provider构造器，一个`$get`方法将返回具体的`$controller`服务：
```js
'use strict';
function $ControllerProvider() {
  this.$get = function() {
  	
  }; 
}
module.exports = $ControllerProvider;
```
现在我们引用这个provider注册`$controller`作为`ng`module的一部分：
```js
function publishExternalAPI() {
  setupModuleLoader(window);
  var ngModule = window.angular.module('ng', []);
  ngModule.provider('$ lter', require('./ lter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http').$HttpProvider);
  ngModule.provider('$httpParamSerializer',
    require('./http').$HttpParamSerializerProvider);
  ngModule.provider('$httpParamSerializerJQLike',
    require('./http').$HttpParamSerializerJQLikeProvider);
  ngModule.provider('$compile', require('./compile'));
ngModule.provider('$controller', require('./controller'));
}
```