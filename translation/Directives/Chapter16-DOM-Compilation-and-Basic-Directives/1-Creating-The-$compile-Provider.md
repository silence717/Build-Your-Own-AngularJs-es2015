## Creating The $compile Provider
指令编译使用一个叫作`$compile`的函数执行。就像`$rootScope`，`$parse`，`$q`，和`$http`，它是由injector提供的内部组件。当你使用`ng`模块常见一个injector,
我们在这里期望是`$compile`：
```js
it('sets up $compile', function() {
  publishExternalAPI();
  var injector = createInjector(['ng']);
  expect(injector.has('$compile')).toBe(true);
});
```
`$compile`在一个新文件`compile.js`中作为一个provider区定义：
```js
'use strict';
function $CompileProvider() {
  this.$get = function() {
  }; 
}
module.exports = $CompileProvider;
```
我们在`angular_public.js`中将`$compile`引入`ng`模块，就像我们之前引入的其他服务一样:
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
  ngModule.provider('$http', require('./http').$HttpProvider);
  ngModule.provider('$httpParamSerializer',require('./http').$HttpParamSerializerProvider);
  ngModule.provider('$httpParamSerializerJQLike',require('./http').$HttpParamSerializerJQLikeProvider);
  ngModule.provider('$compile', require('./compile'));
}
```